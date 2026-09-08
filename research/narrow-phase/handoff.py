#!/usr/bin/env python3
"""Restore and verify the complete narrow-phase research in a separate directory."""
from pathlib import Path, PurePosixPath
import argparse
import csv
import hashlib
import io
import json
import os
import shutil
import subprocess
import sys
import tarfile

BUNDLE = Path(__file__).resolve().parent
AUDIT = Path('audits/csg-narrow-20260907')
REVIEW = Path('review-artifacts/csg-pr2')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def manifest():
    return json.loads((BUNDLE/'manifest.json').read_text())


def checked_path(root, relative):
    path = PurePosixPath(relative)
    if path.is_absolute() or '..' in path.parts or not path.parts:
        raise ValueError(f'Invalid archive path: {relative}')
    return root.joinpath(*path.parts)


def verify():
    m = manifest()
    expected = {item['path']: item for item in m['files']}
    found = set()
    for item in m['files']:
        if 'storedSha256' not in item:
            continue
        data = (BUNDLE/item['storage']).read_bytes()
        assert digest(data) == item['storedSha256'], item['storage']
        original = data.replace(m['rootToken'].encode(), m['originalRoot'].encode())
        assert len(original) == item['sizeBytes'] and digest(original) == item['sha256'], item['path']
        found.add(item['path'])
    for item in m['archives']:
        file = BUNDLE/item['path']
        with file.open('rb') as stream:
            actual = hashlib.file_digest(stream,'sha256').hexdigest()
        assert actual == item['sha256'] and file.stat().st_size == item['sizeBytes'], file
        count = 0
        with tarfile.open(file,'r:gz') as archive:
            for member in archive:
                checked_path(BUNDLE, member.name)
                assert member.isfile() and member.name not in found, member.name
                record = expected[member.name]
                assert record['storage'] == item['path'], member.name
                data = archive.extractfile(member).read()
                assert len(data) == record['sizeBytes'] and digest(data) == record['sha256'], member.name
                found.add(member.name)
                count += 1
        assert count == item['files'], item['path']
    assert found == set(expected), sorted(set(expected)-found)
    evidence = json.loads((BUNDLE/'commit-validation.json').read_text())['evidenceArchive']
    file = checked_path(BUNDLE,evidence['path'])
    assert file.stat().st_size == evidence['sizeBytes'] and digest(file.read_bytes()) == evidence['sha256'], file
    expected_evidence = {item['path']:item for item in evidence['files']}
    found_evidence = set()
    with tarfile.open(file,'r:gz') as archive:
        for member in archive:
            checked_path(BUNDLE,member.name)
            assert member.isfile() and member.name not in found_evidence, member.name
            record = expected_evidence[member.name]
            data = archive.extractfile(member).read()
            assert len(data) == record['sizeBytes'] and digest(data) == record['sha256'], member.name
            found_evidence.add(member.name)
    assert found_evidence == set(expected_evidence)
    print(json.dumps({'verifiedFiles':len(found),'archives':len(m['archives']),
                      'parquetFiles':len(m['parquetInputs']),
                      'commitEvidenceFiles':len(found_evidence)}),flush=True)
    return m


def prepare(directory):
    directory = directory.resolve()
    if directory.exists() and any(directory.iterdir()):
        raise ValueError('Choose an empty directory; existing work is never overwritten.')
    m = verify()
    directory.mkdir(parents=True,exist_ok=True)
    relocated = []

    def write(name, data):
        # Historical evidence remains byte-identical in archives. Only this disposable
        # runtime copy receives the current machine's paths.
        updated = data
        if Path(name).suffix not in {'.parquet','.png'}:
            updated = updated.replace(m['originalRoot'].encode(),str(directory).encode())
            updated = updated.replace(m['rootToken'].encode(),str(directory).encode())
        if updated != data:
            relocated.append(name)
        target = checked_path(directory,name)
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(updated)

    for item in m['files']:
        if 'storedSha256' in item:
            write(item['path'],(BUNDLE/item['storage']).read_bytes())
    for item in m['archives']:
        with tarfile.open(BUNDLE/item['path'],'r:gz') as archive:
            for member in archive:
                write(member.name,archive.extractfile(member).read())

    # The historical benchmark hashes the descriptor's absolute file paths.
    # Preserve that namespace for identity only; data loading uses relocated paths.
    normalized_identity = []
    for phase in ['full-project-bench','general-optimizations','vertical-bound']:
        runner = directory/AUDIT/phase/'run-full.mjs'
        source = runner.read_text()
        old = '.update(JSON.stringify({project,matrix}))'
        assert source.count(old) == 1, runner
        new = '.update(JSON.stringify({project,matrix}).replaceAll(' + json.dumps(str(directory)) + ',' + json.dumps(m['originalRoot']) + '))'
        runner.write_text(source.replace(old,new))
        normalized_identity.append(str(runner.relative_to(directory)))

    # Coverage bytes include artifact URIs. Recalculate this byte digest after
    # relocation so the original comparison scripts can inspect the runtime copy.
    updated_coverage = []
    for file in (directory/AUDIT).rglob('*.result.json'):
        result = json.loads(file.read_text())
        uri = result.get('evaluatedCoverageUri')
        if uri:
            data = Path(uri).read_bytes()
            result['evaluatedCoverageDigest'] = digest(data)
            result['evaluatedCoverageSizeBytes'] = len(data)
            file.write_text(json.dumps(result,indent=2))
            updated_coverage.append(str(file.relative_to(directory)))
    (directory/'handoff-runtime.json').write_text(json.dumps({
        'schemaVersion':1,'bundleManifestSha256':digest((BUNDLE/'manifest.json').read_bytes()),
        'relocatedFiles':relocated,'updatedCoverageMetadata':updated_coverage,
        'normalizedBenchmarkIdentityRunners':normalized_identity,
        'note':'Working copy only. Original bytes and original SHA256 remain in the branch archives and manifest.'
    },indent=2)+'\n')
    print(json.dumps({'prepared':str(directory),'relocatedFiles':len(relocated)}),flush=True)


def run(command, cwd, log):
    print(json.dumps({'command':command,'cwd':str(cwd),'log':str(log)}),flush=True)
    log.parent.mkdir(parents=True,exist_ok=True)
    with log.open('w') as stream:
        completed = subprocess.run(command,cwd=cwd,stdout=stream,stderr=subprocess.STDOUT)
    if completed.returncode:
        print(log.read_text()[-6000:],file=sys.stderr)
        raise subprocess.CalledProcessError(completed.returncode,command)


def runtime(directory):
    directory = directory.resolve()
    metadata = json.loads((directory/'handoff-runtime.json').read_text())
    if metadata['bundleManifestSha256'] != digest((BUNDLE/'manifest.json').read_bytes()):
        raise ValueError('Runtime belongs to a different handoff manifest.')
    return directory


def link(target, source):
    target.parent.mkdir(parents=True,exist_ok=True)
    if target.is_symlink():
        target.unlink()
    elif target.exists():
        raise ValueError(f'Refusing to replace an existing dependency directory: {target}')
    target.symlink_to(os.path.relpath(source,target.parent),target_is_directory=True)


def install(directory):
    directory = runtime(directory)
    version = subprocess.check_output(['node','--version'],text=True).strip()
    if version.split('.')[0] != 'v24':
        raise ValueError('Use Node 24 (original measurements: 24.16.0).')
    logs = directory/'handoff-logs'
    head = directory/REVIEW/'head'
    consumer = directory/'clash-detection'
    predicates = directory/AUDIT/'root/predicate-lab'
    run(['npm','ci','--no-audit','--no-fund'],head,logs/'install-csg.log')
    run(['npx','--yes','pnpm@11.7.0','install','--frozen-lockfile'],consumer,logs/'install-consumer.log')
    run(['npm','ci','--no-audit','--no-fund'],predicates,logs/'install-predicates.log')
    csg_directories = [directory/REVIEW/'base', directory/REVIEW/'control',
                       directory/REVIEW/'febaf15-check/source',directory/'three-bvh-csg',
                       directory/AUDIT/'csg-agent/mirror-fix']
    variants = directory/AUDIT/'root/variants'
    csg_directories += [folder/'csg' for folder in sorted(variants.iterdir()) if folder.is_dir()]
    for folder in csg_directories:
        link(folder/'node_modules',head/'node_modules')

    backend_directories = [(directory/AUDIT/'root/engine/backend',head)]
    backend_directories += [(folder/'backend',folder/'csg') for folder in sorted(variants.iterdir()) if folder.is_dir()]
    backend_modules = consumer/'backend/node_modules'
    for folder, csg in backend_directories:
        destination = folder/'node_modules'
        destination.mkdir(exist_ok=True)
        for dependency in backend_modules.iterdir():
            if dependency.name.startswith('.') or dependency.name in {'three','three-bvh-csg','three-mesh-bvh'}:
                continue
            link(destination/dependency.name,dependency)
        link(destination/'three',head/'node_modules/three')
        link(destination/'three-mesh-bvh',head/'node_modules/three-mesh-bvh')
        link(destination/'three-bvh-csg',csg)
    versions = {}
    for name in ['three','three-mesh-bvh','vitest']:
        versions[name] = json.loads((head/'node_modules'/name/'package.json').read_text())['version']
    versions['robust-predicates'] = json.loads((predicates/'node_modules/robust-predicates/package.json').read_text())['version']
    assert versions['three'] == '0.179.1' and versions['three-mesh-bvh'] == '0.9.11'
    assert versions['robust-predicates'] == '3.0.3'
    (directory/'handoff-dependencies.json').write_text(json.dumps({'node':version,**versions},indent=2)+'\n')
    print(json.dumps({'installed':True,'node':version,**versions}),flush=True)


def check(directory):
    directory = runtime(directory)
    logs = directory/'handoff-logs'
    head = directory/REVIEW/'head'
    checks = [
        ('latest-library',['node',str(head/'node_modules/vitest/vitest.mjs'),'run'],directory/REVIEW/'febaf15-check/source'),
        ('input-z',['node',str(directory/AUDIT/'vertical-bound/numerics/test-world-z-bounds.mjs')],directory),
        ('policy',['node',str(directory/AUDIT/'vertical-bound/test-policy.mjs')],directory),
        ('distance-boundaries',['node',str(directory/AUDIT/'general-optimizations/bounds-boundaries.mjs')],directory),
        ('predicate-signs',['node',str(directory/AUDIT/'root/predicate-parity.mjs')],directory),
        ('latest-box-sweep',['node',str(directory/REVIEW/'febaf15-check/box-sweep.mjs')],directory),
        ('stored-wave-one',['python3',str(directory/AUDIT/'full-project-bench/compare.py')],directory),
        ('stored-wave-two',['python3',str(directory/AUDIT/'general-optimizations/compare.py')],directory),
        ('stored-vertical',['python3',str(directory/AUDIT/'vertical-bound/compare.py')],directory),
    ]
    for name,command,cwd in checks:
        run(command,cwd,logs/(name+'.log'))
    sweep=json.loads((logs/'latest-box-sweep.log').read_text())
    assert sweep['headFailures'] == 4 and sweep['baseFailures'] == 4 and sweep['regressionCount'] == 0
    predicate = json.loads((directory/AUDIT/'root/predicate-parity-results.json').read_text())
    assert predicate['count'] == 100000 and predicate['mismatch'] == 0
    policy = json.loads((directory/AUDIT/'vertical-bound/test-policy.json').read_text())
    assert policy['duplicateFalseExclusions'] == 0 and all(case['passed'] for case in policy['cases'])
    for phase, project_count in [('full-project-bench',4),('general-optimizations',6)]:
        comparison = json.loads((directory/AUDIT/phase/'comparison.json').read_text())
        assert len(comparison) == project_count
        for project in comparison:
            for result in project['checks']:
                assert result['differingRows'] == 0 and all(value for value in result.values() if isinstance(value,bool)), result
    vertical = json.loads((directory/AUDIT/'vertical-bound/comparison.json').read_text())
    assert vertical['uniqueCandidatePairs'] == 165587 and vertical['removedUniquePositiveRows'] == 44
    assert vertical['preservedUniqueDuplicateRows'] == 178
    print(json.dumps({'checksPassed':[name for name,_,_ in checks],
                      'knownAnalyticalFailures':4,'newAnalyticalFailures':0}),flush=True)


def full(directory, phase, project, variant, repeat):
    directory = runtime(directory)
    allowed = {
        'full-project-bench': {'baseline','adaptive-only'},
        'general-optimizations': {'adaptive-only','edge-bounds','ray-side','generic-combined'},
        'vertical-bound': {'vertical-control','vertical-shadow','vertical-skip'},
    }
    if variant not in allowed[phase]:
        raise ValueError(f'{variant} is not a variant for {phase}.')
    folder = directory/AUDIT/phase/project
    if not (folder/'project.json').is_file():
        raise ValueError(f'No frozen project for {phase}/{project}.')
    if not repeat or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_' for c in repeat):
        raise ValueError('Run name must use letters, digits, hyphen or underscore.')
    result = folder/f'{variant}-{repeat}.result.json'
    if result.exists():
        raise ValueError('Choose a new run name; existing evidence is not overwritten.')
    run(['node','--preserve-symlinks',str(folder.parent/'run-full.mjs'),project,variant,repeat],
        directory,directory/'handoff-logs'/f'{phase}-{project}-{variant}-{repeat}.log')
    data = json.loads(result.read_text())
    assert data['narrowPhase']['failed'] == 0 and data['evaluatedCoverageError'] is None
    assert data['narrowPhase']['processed'] == data['broadPhase']['candidateCount']
    csv_bytes = Path(data['outputPath']).read_bytes()
    assert digest(csv_bytes) == data['benchmark']['csvSha256']
    print(json.dumps({'project':project,'variant':variant,'seconds':data['timing']['durationSeconds'],
                      'candidates':data['broadPhase']['candidateCount'],'rows':data['resultRowCount'],
                      'failed':data['narrowPhase']['failed'],'result':str(result)}),flush=True)
    return data


def replay(directory, repeat):
    """Replay both leading prototypes against their own frozen outputs."""
    directory = runtime(directory)
    report = directory/f'handoff-replay-{repeat}.json'
    # Validate before opening any path derived from the supplied run name.
    if not repeat or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_' for c in repeat):
        raise ValueError('Run name must use letters, digits, hyphen or underscore.')
    if report.exists():
        raise ValueError('Choose a new run name; existing evidence is not overwritten.')

    def without_uris(value):
        if isinstance(value,dict):
            return {key:without_uris(item) for key,item in value.items() if key != 'uri'}
        if isinstance(value,list):
            return [without_uris(item) for item in value]
        return value

    checks = []
    for project in ['sgd-duplex','digital-hub','wbdg-office','byh-donauworth','dmsw-v28','bvg-v1']:
        for phase,variant in [('general-optimizations','edge-bounds'),('vertical-bound','vertical-skip')]:
            actual = full(directory,phase,project,variant,repeat)
            expected = json.loads((directory/AUDIT/phase/project/f'{variant}-1.result.json').read_text())
            actual_coverage = json.loads(Path(actual['evaluatedCoverageUri']).read_text())
            expected_coverage = json.loads(Path(expected['evaluatedCoverageUri']).read_text())
            assert Path(actual['outputPath']).read_bytes() == Path(expected['outputPath']).read_bytes(), (project,variant,'CSV')
            assert without_uris(actual_coverage) == without_uris(expected_coverage), (project,variant,'coverage')
            assert actual['broadPhase']['candidateCount'] == expected['broadPhase']['candidateCount']
            record = {'project':project,'phase':phase,'variant':variant,
                      'candidates':actual['broadPhase']['candidateCount'],'rows':actual['resultRowCount'],
                      'csvSha256':actual['benchmark']['csvSha256'],
                      'csvBytesEqualToFrozenRun':True,'coverageEqualExceptUris':True,'errors':0,
                      'seconds':actual['timing']['durationSeconds']}
            checks.append(record)
            report.write_text(json.dumps(checks,indent=2)+'\n')
            print(json.dumps(record),flush=True)
    print(json.dumps({'fullRuns':len(checks),'candidateEvaluations':sum(item['candidates'] for item in checks),
                      'allPassed':True,'report':str(report)}),flush=True)


def revision_sources(directory, ref):
    repo = BUNDLE.parent.parent
    revision = subprocess.check_output(['git','rev-parse','--verify',ref+'^{commit}'],cwd=repo,text=True).strip()
    destination = directory/'commit-sources'/revision
    existing = destination.exists()
    if existing:
        assert json.loads((destination/'source.json').read_text())['revision'] == revision
    source = subprocess.check_output(['git','archive',revision,'src','package.json'],cwd=repo)
    expected = set()
    with tarfile.open(fileobj=io.BytesIO(source)) as archive:
        for member in archive:
            if member.isdir():
                continue
            assert member.isfile(), member.name
            target = checked_path(destination/'csg',member.name)
            expected.add(target)
            data = archive.extractfile(member).read()
            if existing:
                assert target.read_bytes() == data, f'Edited cached source: {target}'
            else:
                target.parent.mkdir(parents=True,exist_ok=True)
                target.write_bytes(data)
    engine = directory/AUDIT/'root/engine/backend'
    if existing:
        actual = {path for path in (destination/'csg/src').rglob('*') if path.is_file()}
        actual.add(destination/'csg/package.json')
        assert actual == expected, 'Cached library file set differs from the commit.'
        for path in engine.rglob('*'):
            relative = path.relative_to(engine)
            if 'node_modules' not in relative.parts and path.is_file():
                assert path.read_bytes() == (destination/'backend'/relative).read_bytes(), relative
        return revision,destination
    shutil.copytree(engine,destination/'backend',ignore=shutil.ignore_patterns('node_modules'))
    for dependency in (engine/'node_modules').iterdir():
        if dependency.name != 'three-bvh-csg':
            link(destination/'backend/node_modules'/dependency.name,dependency)
    link(destination/'backend/node_modules/three-bvh-csg',destination/'csg')
    link(destination/'csg/node_modules',directory/REVIEW/'head/node_modules')
    (destination/'source.json').write_text(json.dumps({'revision':revision})+'\n')
    return revision,destination


def checked_result(file):
    result = json.loads(file.read_text())
    assert result['narrowPhase']['failed'] == 0 and result['evaluatedCoverageError'] is None
    assert result['narrowPhase']['processed'] == result['broadPhase']['candidateCount']
    data = Path(result['outputPath']).read_bytes()
    assert digest(data) == result['benchmark']['csvSha256']
    rows = list(csv.DictReader(io.StringIO(data.decode())))
    assert len(rows) == result['resultRowCount'] == len({row['Clash GUID'] for row in rows})
    assert all(row['Collision'] == 'TRUE' for row in rows)
    detected = set()
    for row in rows:
        endpoints = []
        for index in (1,2):
            values = [row[f'Object {index} Model ID'].strip(),row[f'Object {index} GlobalID'].strip()]
            endpoints.append(''.join(str(len(value.encode()))+':'+value for value in values))
        key = 'sha256-canonical-pair/v2|' + ''.join(sorted(endpoints,key=str.encode))
        detected.add(digest(key.encode()))
    data = Path(result['evaluatedCoverageUri']).read_bytes()
    assert digest(data) == result['evaluatedCoverageDigest']
    assert len(data) == result['evaluatedCoverageSizeBytes']
    coverage = json.loads(data)
    evidence = {'encoding':'sha256-canonical-pair/v2','count':len(detected),
                'digest':digest(''.join(value+'\n' for value in sorted(detected)).encode())}
    assert evidence == coverage['detectedPairs'] == result['detectedPairs']
    for field in ('intentionalExclusions','evaluationFailures'):
        entry = coverage[field]
        all_bytes = bytearray()
        count = 0
        for chunk in entry['chunks']:
            data = Path(chunk['uri']).read_bytes()
            hashes = data.decode().splitlines()
            assert digest(data) == chunk['digest'] and len(data) == chunk['sizeBytes']
            assert len(hashes) == chunk['pairCount'] and hashes == sorted(set(hashes))
            assert hashes[0] == chunk['firstHash'] and hashes[-1] == chunk['lastHash']
            all_bytes.extend(data)
            count += len(hashes)
        assert digest(all_bytes) == entry['digest'] and count == entry['totalCount']
    return result


def compare_revisions(directory, base, candidate, repeat):
    directory = runtime(directory)
    if not repeat or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_' for c in repeat):
        raise ValueError('Run name must use letters, digits, hyphen or underscore.')
    report = directory/f'commit-comparison-{repeat}.json'
    if report.exists():
        raise ValueError('Choose a new run name; existing evidence is not overwritten.')
    revisions = {label:revision_sources(directory,ref) for label,ref in [('base',base),('candidate',candidate)]}

    def without_uris(value):
        if isinstance(value,dict):
            return {key:without_uris(item) for key,item in value.items() if key != 'uri'}
        if isinstance(value,list):
            return [without_uris(item) for item in value]
        return value

    checks = []
    projects = ['sgd-duplex','digital-hub','wbdg-office','byh-donauworth','dmsw-v28','bvg-v1']
    for index,project in enumerate(projects):
        results = {}
        order = ['base','candidate'] if index % 2 == 0 else ['candidate','base']
        for label in order:
            revision,source = revisions[label]
            name = repeat+'-'+label
            result_file = directory/'commit-bench'/project/(name+'.result.json')
            if result_file.exists():
                raise ValueError(f'Existing result: {result_file}')
            run(['node','--preserve-symlinks',str(BUNDLE/'benchmark.js'),str(directory),project,name,
                 str(source),revision,manifest()['originalRoot']],directory,
                directory/'handoff-logs'/f'commit-{project}-{name}.log')
            results[label] = checked_result(result_file)
        a,b = results['base'],results['candidate']
        assert a['broadPhase']['candidateCount'] == b['broadPhase']['candidateCount'], (project,'candidates')
        assert Path(a['outputPath']).read_bytes() == Path(b['outputPath']).read_bytes(), (project,'CSV')
        assert without_uris(json.loads(Path(a['evaluatedCoverageUri']).read_text())) == without_uris(json.loads(Path(b['evaluatedCoverageUri']).read_text())), (project,'coverage')
        record = {'project':project,'base':revisions['base'][0],'candidate':revisions['candidate'][0],
                  'candidates':a['broadPhase']['candidateCount'],'rows':a['resultRowCount'],
                  'csvBytesEqual':True,'coverageEqualExceptUris':True,'errors':0,
                  'baseSeconds':a['timing']['durationSeconds'],'candidateSeconds':b['timing']['durationSeconds'],
                  'csvSha256':a['benchmark']['csvSha256']}
        checks.append(record)
        report.write_text(json.dumps(checks,indent=2)+'\n')
        print(json.dumps(record),flush=True)
    print(json.dumps({'fullRuns':2*len(checks),'candidateEvaluations':2*sum(c['candidates'] for c in checks),
                      'allPassed':True,'report':str(report)}),flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command',required=True)
    commands.add_parser('verify',help='Verify every original source, result and input byte against the manifest.')
    for command in ['prepare','install','check']:
        child = commands.add_parser(command)
        child.add_argument('directory',type=Path)
    child = commands.add_parser('full',help='Execute a complete frozen local project in the reconstructed workspace.')
    child.add_argument('directory',type=Path)
    child.add_argument('phase',choices=['full-project-bench','general-optimizations','vertical-bound'])
    child.add_argument('project')
    child.add_argument('variant')
    child.add_argument('--run-name',default='reproduced')
    child = commands.add_parser('replay',help='Run six full projects with both prototypes and compare each with its frozen output.')
    child.add_argument('directory',type=Path)
    child.add_argument('--run-name',default='reproduced')
    child = commands.add_parser('compare',help='Compare two library commits through the frozen consumer and all six projects.')
    child.add_argument('directory',type=Path)
    child.add_argument('--base',required=True)
    child.add_argument('--candidate',default='HEAD')
    child.add_argument('--run-name',default='commits')
    args = parser.parse_args()
    if args.command == 'verify': verify()
    elif args.command == 'prepare': prepare(args.directory)
    elif args.command == 'install': install(args.directory)
    elif args.command == 'check': check(args.directory)
    elif args.command == 'full': full(args.directory,args.phase,args.project,args.variant,args.run_name)
    elif args.command == 'replay': replay(args.directory,args.run_name)
    elif args.command == 'compare': compare_revisions(args.directory,args.base,args.candidate,args.run_name)


if __name__ == '__main__':
    main()
