from pathlib import Path
import subprocess,json,time,sys,signal
root=Path(__file__).resolve().parent
for spec in sys.argv[1:]:
 project,variant,*rest=spec.split(':');repeat=rest[0] if rest else '1';name=f'{variant}-{repeat}';directory=root/project
 with (directory/f'{name}.log').open('w') as log:
  start=time.time();p=subprocess.Popen(['node','--preserve-symlinks',str(root/'run-full.mjs'),project,variant,repeat],stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
  print(json.dumps({'start':spec,'pid':p.pid}),flush=True)
  peak=0;samples=[];lastprint=0
  while p.poll() is None:
   processes=[]
   for line in subprocess.check_output(['ps','-axo','pid=,ppid=,rss=,%cpu='],text=True).splitlines():
    a=line.split()
    if len(a)==4:processes.append((int(a[0]),int(a[1]),int(a[2]),float(a[3])))
   ids={p.pid}
   for _ in range(4):ids|={pid for pid,ppid,rss,cpu in processes if ppid in ids}
   selected=[{'pid':pid,'rssKiB':rss,'cpuPercent':cpu} for pid,ppid,rss,cpu in processes if pid in ids];rss=sum(x['rssKiB'] for x in selected);peak=max(peak,rss)
   samples.append({'elapsedSeconds':round(time.time()-start,2),'totalRssKiB':rss,'processes':selected})
   if time.time()-lastprint>30:
    lastprint=time.time();entry={'running':spec,'elapsedSeconds':round(time.time()-start),'rssMiB':round(rss/1024),'peakRssMiB':round(peak/1024)}
    prog=directory/f'{name}.progress.json'
    if prog.exists():
     try:entry['progress']=json.loads(prog.read_text())
     except json.JSONDecodeError:pass
    print(json.dumps(entry),flush=True)
   # Bound a pathological baseline to 45 minutes and this job's processes only.
   if time.time()-start>2700:
    subprocess.run(['kill','-TERM',str(p.pid)],check=False)
   time.sleep(2)
  record={'spec':spec,'exitCode':p.returncode,'wallSeconds':time.time()-start,'peakTotalRssKiB':peak,'sampleIntervalSeconds':2,'samples':samples}
  (directory/f'{name}.resources.json').write_text(json.dumps(record,indent=2));print(json.dumps({k:v for k,v in record.items() if k!='samples'}),flush=True)
  if p.returncode!=0:
   print((directory/f'{name}.log').read_text()[-3500:],flush=True)
   sys.exit(p.returncode)
