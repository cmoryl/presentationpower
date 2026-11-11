import json,sys,os
f='done.json'; d=json.load(open(f)) if os.path.exists(f) else {}
for a in sys.argv[1:]:
  p,L,s,i=a.split(':'); d.setdefault(L,{}).setdefault(p,{})[s]=i
json.dump(d,open(f,'w'),indent=0)
print(sum(len(v) for L in d.values() for v in L.values()))
