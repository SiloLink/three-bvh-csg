from pathlib import Path
import subprocess,sys,json,time
root=Path(__file__).resolve().parent
for variant in sys.argv[1:]:
 start=time.time()
 with (root/('probe-hot-'+variant+'.log')).open('w') as log:
  code=subprocess.call(['node','--preserve-symlinks',str(root/'probe.mjs'),variant,'hot','1'],stdout=log,stderr=subprocess.STDOUT)
 print(json.dumps({'variant':variant,'seconds':time.time()-start,'exitCode':code}),flush=True)
 if code:sys.exit(code)
