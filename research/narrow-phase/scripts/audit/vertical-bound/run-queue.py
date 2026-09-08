from pathlib import Path
import json, subprocess, sys, time

root = Path(__file__).resolve().parent
for spec in sys.argv[1:]:
 project, variant, *rest = spec.split(':')
 repeat = rest[0] if rest else '1'
 name = f'{variant}-{repeat}'
 directory = root/project
 if (directory/(name+'.result.json')).exists():
  print(json.dumps({'alreadyCompleted':spec}), flush=True)
  continue
 if (directory/(name+'.shadow')).exists(): raise RuntimeError('Incomplete shadow artifact already exists; use a fresh repeat number')
 with (directory/(name+'.log')).open('w') as log:
  start = time.monotonic()
  p = subprocess.Popen(['node','--preserve-symlinks',str(root/'run-full.mjs'),project,variant,repeat], stdout=log, stderr=subprocess.STDOUT)
  print(json.dumps({'start':spec,'pid':p.pid}), flush=True)
  last_print = 0
  while p.poll() is None:
   elapsed = time.monotonic()-start
   if elapsed-last_print >= 30:
    last_print = elapsed
    progress_file = directory/(name+'.progress.json')
    progress = json.loads(progress_file.read_text()) if progress_file.exists() else {}
    print(json.dumps({'running':spec,'elapsedSeconds':round(elapsed),'stage':progress.get('stage'),'processed':progress.get('processed'),'progress':progress.get('progress')}), flush=True)
   if elapsed > 2700: p.terminate()
   time.sleep(1)
 record = {'spec':spec,'exitCode':p.returncode,'processWallSeconds':time.monotonic()-start,'rssMeasured':False}
 (directory/(name+'.resources.json')).write_text(json.dumps(record,indent=2))
 print(json.dumps(record),flush=True)
 if p.returncode:
  print((directory/(name+'.log')).read_text()[-4000:],flush=True)
  raise SystemExit(p.returncode)
