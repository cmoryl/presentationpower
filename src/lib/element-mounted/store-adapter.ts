export interface StoreRequest {
  op: 'get' | 'list' | 'set' | 'update' | 'delete';
  path: string;
  body?: Record<string, unknown>;
  sortField?: string;
  sortDesc?: boolean;
  limit?: number;
}

/** Runs in the opaque-origin iframe, without access to the React application's storage. */
export const V221_HOST_BRIDGE = `
(function(){
 var pending={},seq=0,watchers=[],host=null,readyResolve;
 var ready=new Promise(function(r){readyResolve=r});
 var prefix='element-v221:'+location.pathname+':';
 var memory={};
 var storage={getItem:function(k){return Object.prototype.hasOwnProperty.call(memory,k)?memory[k]:null},setItem:function(k,v){memory[k]=String(v);parent.postMessage({v221:true,type:'storage',key:k,value:String(v)},'*')},removeItem:function(k){delete memory[k];parent.postMessage({v221:true,type:'storage',key:k,value:null},'*')},key:function(n){return Object.keys(memory)[n]||null},clear:function(){Object.keys(memory).forEach(function(k){storage.removeItem(k)})}};
 Object.defineProperty(storage,'length',{get:function(){return Object.keys(memory).length}});
 Object.defineProperty(window,'localStorage',{value:storage});
 Object.defineProperty(window,'sessionStorage',{value:storage});
 function call(action,args){return ready.then(function(){return new Promise(function(resolve,reject){var id=++seq;pending[id]={resolve:resolve,reject:reject};parent.postMessage({v221:true,type:'request',id:id,action:action,args:args},'*')})})}
 function copy(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v))}
 function docSnap(path,r){return {id:path.split('/').pop(),exists:!!r.exists,data:function(){return copy(r.data)},metadata:{fromCache:false,hasPendingWrites:false}}}
 function colSnap(rows){var docs=rows.map(function(r){return docSnap(r.id,{exists:true,data:r.data})});return {docs:docs,size:docs.length,empty:!docs.length,metadata:{fromCache:false,hasPendingWrites:false}}}
 function valid(p,even){if(typeof p!=='string'||!p||/^\\/|\\/$|\\/\\//.test(p)||p.split('/').length%2!==(even?0:1))throw new Error('invalid_argument: path');return p}
 function doc(p){valid(p,true);return {id:p.split('/').pop(),path:p,get:function(){return call('store',{op:'get',path:p}).then(function(r){return docSnap(p,r)})},set:function(b){return call('store',{op:'set',path:p,body:b})},update:function(b){return call('store',{op:'update',path:p,body:b})},delete:function(){return call('store',{op:'delete',path:p})},collection:function(k){return collection(p+'/'+k)}}}
 function collection(p,field,desc,n){valid(p,false);function get(){return call('store',{op:'list',path:p,sortField:field,sortDesc:desc,limit:n||1000}).then(colSnap)};return {path:p,orderBy:function(f,d){return collection(p,f,d==='desc',n)},limit:function(x){return collection(p,field,desc,x)},get:get,onSnapshot:function(next,error){var w={alive:true,dirty:false,running:false,run:function(){if(!w.alive)return;if(w.running){w.dirty=true;return}w.running=true;get().then(function(s){if(w.alive)next(s)},function(e){if(w.alive&&error)error(e)}).finally(function(){w.running=false;if(w.dirty){w.dirty=false;w.run()}})}};watchers.push(w);w.run();return function(){w.alive=false;watchers=watchers.filter(function(x){return x!==w})}}}}
 var db={doc:doc,collection:collection};
 window.addEventListener('message',function(e){if(e.source!==parent||!e.data||!e.data.v221)return;var m=e.data;if(m.type==='init'&&!host){host=m.host;memory=m.storage||{};readyResolve(host)}else if(m.type==='response'){var p=pending[m.id];if(p){delete pending[m.id];if(m.error)p.reject(m.error);else p.resolve(m.result)}}else if(m.type==='changed'){watchers.forEach(function(w){w.run()})}});
 var user={id:function(){return ready.then(function(h){return h.id})},me:function(){return ready.then(function(h){return {id:h.id,name:h.name}})},can:function(){return ready.then(function(h){return h.canWrite})},canEdit:function(){return ready.then(function(h){return h.canWrite})},isOwner:function(){return ready.then(function(h){return h.isAdmin})},profiles:function(ids){return call('people',{ids:ids})},search:function(q){return call('people',{query:q})}};
 var assets={list:function(){return ready.then(function(h){return {assets:h.assets}})}};
 var downloads={save:function(file){return call('download',file)}};
 window.claude={use:function(n){return Promise.resolve(n==='db'?db:n==='user'?user:n==='assets'?assets:n==='downloads'?downloads:null)}};
 parent.postMessage({v221:true,type:'ready'},'*');
})();`;