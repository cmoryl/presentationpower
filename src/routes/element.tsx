import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { mountedIdentity, mountedPeople, mountedStore } from '@/lib/element-mounted/store.functions';
import { V221_HOST_BRIDGE, type StoreRequest } from '@/lib/element-mounted/store-adapter';
import images from '@/lib/element-update/image-hashes.json';
import issued from '@/assets/element-mounted/module-builder.html.asset.json';

export const Route = createFileRoute('/element')({
  head: () => ({ meta: [
    { title: 'ELEMENT v221 workspace · TransPerfect Element' },
    { name: 'description', content: 'The first-party ELEMENT v221 project and material workspace connected to Lovable Cloud.' },
    { property: 'og:title', content: 'ELEMENT v221 workspace · TransPerfect Element' },
    { property: 'og:description', content: 'Projects, materials, versions and reviewer sign-offs in the isolated ELEMENT v221 workspace.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: ElementMount,
});

function ElementMount() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState<string>();
  const [error, setError] = useState<string>();
  const identity = useServerFn(mountedIdentity);
  const store = useServerFn(mountedStore);
  const people = useServerFn(mountedPeople);
  useEffect(() => {
    let alive = true;
    let cleanup = () => {};
    const start = async () => {
      const host = await identity();
      const prefix = `element-v221:${host.id}:`;
      const storage: Record<string,string> = {};
      for (let i=0; i<localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) storage[key.slice(prefix.length)] = localStorage.getItem(key) ?? '';
      }
      const post = (data: unknown) => frame.current?.contentWindow?.postMessage(data, '*');
      const listener = async (event: MessageEvent) => {
        if (event.source !== frame.current?.contentWindow || !event.data?.v221) return;
        const message = event.data;
        if (message.type === 'ready') {
          post({ v221:true, type:'init', host:{ ...host, assets:Object.entries(images).map(([id,url]) => ({id,url:new URL(url,window.location.origin).href})) }, storage });
        } else if (message.type === 'storage') {
          if (typeof message.key !== 'string' || message.key.length>200) return;
          try { if (message.value === null) localStorage.removeItem(prefix+message.key); else if (typeof message.value === 'string' && message.value.length<2_000_000) localStorage.setItem(prefix+message.key,message.value); } catch { /* Source drafts remain in memory; Cloud writes remain authoritative. */ }
        } else if (message.type === 'request') {
          try {
            const result = message.action === 'store' ? await store({ data:message.args as StoreRequest })
              : message.action === 'people' ? await people({ data:message.args }) : Promise.reject(new Error('Unsupported capability'));
            post({v221:true,type:'response',id:message.id,result});
            if (message.action === 'store' && ['set','update','delete'].includes(message.args.op)) post({v221:true,type:'changed'});
          } catch (e) {
            post({v221:true,type:'response',id:message.id,error:{code:'permission_or_store_error',message:e instanceof Error?e.message:'Cloud request failed'}});
          }
        }
      };
      window.addEventListener('message', listener);
      const channel = supabase.channel(`element-v221-${crypto.randomUUID()}`)
        .on('postgres_changes', { event:'*',schema:'public',table:'element_v221_documents' }, () => post({v221:true,type:'changed'})).subscribe();
      cleanup = () => { window.removeEventListener('message',listener); void supabase.removeChannel(channel); };
      const response = await fetch(issued.url);
      if (!response.ok) throw new Error('The issued v221 application could not load.');
      const source = await response.text();
      // The issued document itself is unchanged; only its host capability script is supplied before it.
      const wrapped = source.replace('<script>', `<script>${V221_HOST_BRIDGE}</script><script>`);
      if (alive) setHtml(wrapped);
    };
    void start().catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Workspace connection failed'); });
    return () => { alive=false; cleanup(); };
  }, [identity, store, people]);
  if (error) return <main className="min-h-dvh bg-background p-8 text-foreground"><h1 className="text-xl font-semibold">ELEMENT v221</h1><p role="alert" className="mt-4">{error}</p></main>;
  return html ? <iframe ref={frame} title="ELEMENT v221 workspace" sandbox="allow-scripts" srcDoc={html} className="block h-dvh w-full border-0" />
    : <main aria-busy="true" className="min-h-dvh bg-background p-8 text-foreground">Connecting to ELEMENT v221…</main>;
}