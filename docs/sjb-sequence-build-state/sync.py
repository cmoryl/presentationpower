import json
d=json.load(open('/tmp/frames/done.json'))
p='/dev-server/src/lib/sjb-calendar-canva-sequences.json'
r=json.load(open(p))
for L,v in d.items(): r[L]=dict(sorted(v.items()))
json.dump(r,open(p,'w'),indent=2)
print({k:len(v) for k,v in r.items()})
