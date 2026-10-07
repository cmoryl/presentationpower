"""Side-by-side test of candidate models for the Presentation Agent's planning job.
Usage: python3 scripts/model-bakeoff.py > /tmp/bake/out.json
Scores each answer on: valid JSON, only permitted modules, invented figures
(any digit in slide copy not present in the brief), slide count, and speed."""
import json, os, re, time, requests
KEY=os.environ["LOVABLE_API_KEY"]; G="https://ai.gateway.lovable.dev/v1"
MODULES=["MV-TITLE-COVER","MV-STAT-PROOF-BOARD","MV-KPI-DASHBOARD","MV-CASE-STUDY","MV-ROADMAP-QUARTERS","MV-PILLARS-3","MV-CLOSE-CTA"]
SYS=("You plan TransPerfect sales decks. Use ONLY these module ids: "+", ".join(MODULES)+
 ". Never invent statistics, client names or citations: where a figure is needed and not in the brief, write [Add a verified figure]. "
 "Return only JSON: {\"slides\":[{\"module\":...,\"title\":...,\"body\":...}]}")
BRIEFS=[
 "Create a 6-slide GlobalLink Q3 business review with stats and a case study.",
 "8 slides for a life-sciences prospect: why TransPerfect for clinical trial translation. We support 170+ languages and have 140+ offices.",
 "Short 5-slide intro deck on AI translation with human review for a retail CMO.",
]
def chat(model,u):
  r=requests.post(G+"/chat/completions",headers={"Authorization":"Bearer "+KEY},json={"model":model,"messages":[{"role":"system","content":SYS},{"role":"user","content":u}]},timeout=300); r.raise_for_status()
  return r.json()["choices"][0]["message"]["content"]
def resp(model,u):
  r=requests.post(G+"/responses",headers={"Authorization":"Bearer "+KEY,"X-Lovable-AIG-SDK":"fetch"},json={"model":model,"instructions":SYS,"input":u,"reasoning":{"effort":"low"},"store":False},timeout=300); r.raise_for_status()
  return "".join(c.get("text","") for o in r.json().get("output",[]) if o.get("type")=="message" for c in o.get("content",[]))
def msgs(model,u):
  out=""
  with requests.post(G+"/messages",headers={"Authorization":"Bearer "+KEY,"X-Lovable-AIG-SDK":"fetch","anthropic-version":"2023-06-01"},json={"model":model,"max_tokens":8000,"system":SYS,"messages":[{"role":"user","content":u}],"stream":True},stream=True,timeout=300) as r:
    r.raise_for_status()
    for line in r.iter_lines(decode_unicode=True):
      if line and line.startswith("data:"):
        try: d=json.loads(line[5:])
        except: continue
        if d.get("type")=="content_block_delta" and d["delta"].get("type")=="text_delta": out+=d["delta"]["text"]
  return out
CANDS=[("google/gemini-3.6-flash",chat),("google/gemini-3.8-flash",chat),("openai/gpt-6-astra",resp),("anthropic/claude-opus-5",msgs)]
def score(brief,txt):
  m=re.search(r"\{.*\}",txt,re.S)
  try: slides=json.loads(m.group(0))["slides"]
  except Exception: return {"valid_json":False}
  allowed=set(re.findall(r"\d[\d,.]*",brief))
  inv=[]; bad=0
  for s in slides:
    if s.get("module") not in MODULES: bad+=1
    for n in re.findall(r"\d[\d,.]*\+?%?",(s.get("title","")+" "+s.get("body",""))):
      core=n.rstrip("+%.,")
      if core and core not in allowed and not re.fullmatch(r"Q?[1-4]|20\d\d|\d",core): inv.append(n)
  return {"valid_json":True,"slides":len(slides),"bad_modules":bad,"invented_figures":inv}
res=[]
for model,fn in CANDS:
  for b in BRIEFS:
    t=time.time()
    try: txt=fn(model,b); sc=score(b,txt)
    except Exception as e: txt=str(e)[:300]; sc={"error":txt}
    res.append({"model":model,"brief":b[:40],"secs":round(time.time()-t,1),**sc,"sample":txt[:600]})
print(json.dumps(res,indent=1))
