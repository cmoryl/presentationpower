import { describe, expect, it } from 'vitest';
import { V221_HOST_BRIDGE } from '../element-mounted/store-adapter';

function harness() {
  let receive: (e: {source:unknown;data:unknown}) => void = () => {};
  const sent: Record<string,unknown>[] = [];
  const parent = { postMessage: (message: Record<string,unknown>) => { sent.push(message); } };
  const window: Record<string,unknown> = { addEventListener: (_:string, cb:typeof receive) => { receive=cb; } };
  new Function('window','parent','location',V221_HOST_BRIDGE)(window,parent,{pathname:'/element'});
  receive({source:parent,data:{v221:true,type:'init',host:{id:'staff',canWrite:false,assets:[]},storage:{'gl-ws-view':'isolated'}}});
  const use = (window.claude as {use:(name:string)=>Promise<any>}).use;
  return {window,sent,parent,receive,use};
}

describe('isolated v221 Firestore-shaped host', () => {
  it('supplies real identity and denies viewer editing in the capability', async () => {
    const h=harness(); const user=await h.use('user');
    expect(await user.id()).toBe('staff'); expect(await user.canEdit()).toBe(false);
  });
  it('supports collection get, descending json field ordering, limits and snapshots', async () => {
    const h=harness();const db=await h.use('db');
    const result=db.collection('projects').orderBy('updatedAt','desc').limit(300).get();
    await new Promise(r=>setTimeout(r,0));
    const request=h.sent.find(x=>x.type==='request');
    expect(request?.args).toEqual({op:'list',path:'projects',sortField:'updatedAt',sortDesc:true,limit:300});
    h.receive({source:h.parent,data:{v221:true,type:'response',id:request?.id,result:[{id:'p',data:{name:'Saved'}}]}});
    expect((await result).docs[0].data()).toEqual({name:'Saved'});
  });
  it('passes nested updates atomically without replacing them with read/set', async () => {
    const h=harness();const db=await h.use('db');
    void db.doc('projects/p/materials/m').update({review:{note2:{text:'second'}}});
    await new Promise(r=>setTimeout(r,0));
    expect(h.sent.find(x=>x.type==='request')?.args).toEqual({op:'update',path:'projects/p/materials/m',body:{review:{note2:{text:'second'}}}});
  });
  it('rejects malformed document and collection paths', async () => {
    const db=await harness().use('db');
    expect(()=>db.doc('projects')).toThrow('invalid_argument');expect(()=>db.collection('projects/p')).toThrow('invalid_argument');
  });
  it('does not connect exports, the agent or skill download capabilities', async () => {
    const h=harness(); for(const name of ['downloads','sample','room']) expect(await h.use(name)).toBeNull();
  });
});