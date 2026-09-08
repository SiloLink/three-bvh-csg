from pathlib import Path
import csv
import hashlib
import json
import statistics

root = Path(__file__).resolve().parent
sha = lambda data: hashlib.sha256(data).hexdigest()


def canonical(value):
    if isinstance(value, list):
        return [canonical(item) for item in value]
    if isinstance(value, dict):
        return {key: canonical(item) for key, item in value.items()
                if key not in ['uri', 'timing', 'detectedPairs']}
    return value


def detected_evidence(rows):
    hashes = set()
    def prefix(value):
        value = value.strip()
        return str(len(value.encode())) + ':' + value
    for row in rows.values():
        endpoints = [prefix(row[f'Object {index} Model ID']) +
                     prefix(row[f'Object {index} GlobalID']) for index in (1, 2)]
        key = 'sha256-canonical-pair/v2|' + ''.join(sorted(endpoints, key=str.encode))
        hashes.add(sha(key.encode()))
    return {'encoding': 'sha256-canonical-pair/v2', 'count': len(hashes),
            'digest': sha(''.join(item + '\n' for item in sorted(hashes)).encode())}


def load_run(file):
    result = json.loads(file.read_text())
    stem = file.name.removesuffix('.result.json')
    csv_bytes = file.with_name(stem + '.csv').read_bytes()
    csv_rows = list(csv.DictReader(csv_bytes.decode().splitlines()))
    rows = {row['Clash GUID']: row for row in csv_rows}
    assert len(rows) == len(csv_rows) == result['resultRowCount']
    assert all(row['Collision'] == 'TRUE' for row in rows.values())
    assert sha(csv_bytes) == result['benchmark']['csvSha256']
    coverage_bytes = file.with_name(stem + '.coverage.json').read_bytes()
    assert sha(coverage_bytes) == result['evaluatedCoverageDigest']
    coverage = json.loads(coverage_bytes)
    evidence = detected_evidence(rows)
    assert evidence == coverage['detectedPairs'] == result['detectedPairs']
    for field in ('intentionalExclusions', 'evaluationFailures'):
        manifest = coverage[field]
        concatenated = b''
        count = 0
        for chunk in manifest['chunks']:
            data = Path(chunk['uri']).read_bytes()
            hashes = data.decode().splitlines()
            assert sha(data) == chunk['digest'] and len(data) == chunk['sizeBytes']
            assert len(hashes) == chunk['pairCount']
            assert hashes == sorted(set(hashes))
            assert hashes[0] == chunk['firstHash'] and hashes[-1] == chunk['lastHash']
            concatenated += data
            count += len(hashes)
        assert sha(concatenated) == manifest['digest'] and count == manifest['totalCount']
    assert result['narrowPhase']['failed'] == 0 and result['evaluatedCoverageError'] is None
    assert result['narrowPhase']['processed'] == result['broadPhase']['candidateCount']
    timing = result['narrowPhase']['timing']
    totals = timing['workerTiming']['totals']
    summary = {
        'run': stem, 'seconds': result['timing']['durationSeconds'],
        'phasesMs': result['timing']['phases'],
        'csgWorkerSeconds': totals['csgEvaluateMs'] / 1000,
        'workerDurationSeconds': totals['durationMs'] / 1000,
        'csgOperations': totals['csgOperationCount'],
        'candidates': result['broadPhase']['candidateCount'], 'rows': len(rows),
        'errors': result['narrowPhase']['failed'],
        'coverageError': result['evaluatedCoverageError'],
        'csvSha256': sha(csv_bytes),
    }
    # These fields are retained per batch, but are absent from the fixed parent totals schema.
    for key in ('verticalEarlyRejectedCount', 'verticalBoundsMs'):
        summary[key] = sum(batch['workerTiming'].get(key, 0) for batch in timing['batchTimings'])
    return summary, rows, coverage


projects = []
for directory in sorted(root.iterdir()):
    if not directory.is_dir():
        continue
    controls = list(directory.glob('vertical-control-*.result.json'))
    skips = list(directory.glob('vertical-skip-*.result.json'))
    if not controls or not skips:
        continue
    shadow, reference_rows, reference_coverage = load_run(directory / 'vertical-shadow-1.result.json')
    disagreements = json.loads((directory / 'vertical-shadow-1.disagreements.json').read_text())
    expected_removed = {row['pairId'] for row in disagreements}
    assert len(expected_removed) == len(disagreements)
    shadow_summary = next(row for row in json.loads((root / 'shadow-summary.json').read_text())
                          if row['project'] == directory.name)
    baseline_duplicates = {key: row for key, row in reference_rows.items() if row['Clash Type'] == 'Duplicate'}
    variants = {'control': [], 'skip': []}
    checks = []
    for kind, files in [('control', controls), ('skip', skips)]:
        for file in sorted(files):
            summary, rows, coverage = load_run(file)
            removed, added = reference_rows.keys() - rows.keys(), rows.keys() - reference_rows.keys()
            changed = [key for key in rows.keys() & reference_rows.keys() if rows[key] != reference_rows[key]]
            check = {
                'run': summary['run'], 'addedRows': len(added), 'removedRows': len(removed),
                'changedRetainedRows': len(changed),
                'exactExpectedRemovalSet': removed == (expected_removed if kind == 'skip' else set()),
                'allDuplicateRowsPreservedExactly': all(rows.get(key) == row for key, row in baseline_duplicates.items()),
                'coverageEqualExceptDetectedPairsAndArtifactUris': canonical(coverage) == canonical(reference_coverage),
                'candidateCountEqual': summary['candidates'] == shadow['candidates'],
                'csvAndEvidenceDigestsVerified': True,
                'csvBytesEqualToShadow': summary['csvSha256'] == shadow['csvSha256'],
            }
            assert not added and not changed and check['exactExpectedRemovalSet']
            assert check['allDuplicateRowsPreservedExactly'] and check['coverageEqualExceptDetectedPairsAndArtifactUris']
            assert check['candidateCountEqual']
            if kind == 'skip':
                assert summary['verticalEarlyRejectedCount'] == shadow_summary['eligiblePairs']
            else:
                assert check['csvBytesEqualToShadow']
            variants[kind].append(summary)
            checks.append(check)
    control_s = statistics.median(run['seconds'] for run in variants['control'])
    skip_s = statistics.median(run['seconds'] for run in variants['skip'])
    control_csg = statistics.median(run['csgWorkerSeconds'] for run in variants['control'])
    skip_csg = statistics.median(run['csgWorkerSeconds'] for run in variants['skip'])
    project = {
        'project': directory.name, **variants, 'checks': checks,
        'controlMedianSeconds': control_s, 'skipMedianSeconds': skip_s,
        'wallReductionPercent': 100 * (1 - skip_s / control_s),
        'csgReductionPercent': 100 * (1 - skip_csg / control_csg),
        'eligiblePairs': shadow_summary['eligiblePairs'],
        'removedPositiveRows': len(expected_removed), 'preservedDuplicateRows': len(baseline_duplicates),
    }
    projects.append(project)

summary = {
    'projects': projects,
    'uniqueCandidatePairs': sum(project['control'][0]['candidates'] for project in projects),
    'timedFullRuns': sum(len(project['control']) + len(project['skip']) for project in projects),
    'timedPairEvaluations': sum(run['candidates'] for project in projects for kind in ['control', 'skip'] for run in project[kind]),
    'earlyRejectedUniquePairs': sum(project['eligiblePairs'] for project in projects),
    'removedUniquePositiveRows': sum(project['removedPositiveRows'] for project in projects),
    'preservedUniqueDuplicateRows': sum(project['preservedDuplicateRows'] for project in projects),
    'sumControlMedianSeconds': sum(project['controlMedianSeconds'] for project in projects),
    'sumSkipMedianSeconds': sum(project['skipMedianSeconds'] for project in projects),
}
summary['aggregateWallReductionPercent'] = 100 * (1 - summary['sumSkipMedianSeconds'] / summary['sumControlMedianSeconds'])
(root / 'comparison.json').write_text(json.dumps(summary, indent=2))
for project in projects:
    print(json.dumps({key: value for key, value in project.items() if key not in ['control', 'skip', 'checks']}))
print(json.dumps({key: value for key, value in summary.items() if key != 'projects'}))
