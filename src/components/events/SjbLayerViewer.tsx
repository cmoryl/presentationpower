import { useEffect, useRef, useState } from "react";
import { Maximize2, RotateCcw } from "lucide-react";
import { Button } from "@/design-system/element";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SJB_COMPONENTS, SJB_SCENE_ELEMENTS } from "@/lib/san-juan-logo-construction";
import { SJB_LOGOS } from "@/lib/san-juan-bowl";
import type * as THREE from "three";

const layers = SJB_COMPONENTS.filter(p => p.id !== "white-underlay").flatMap(p => p.id !== "badge-scene-banner" ? [{ id: p.id, name: p.name, url: p.url }] : SJB_SCENE_ELEMENTS.map(e => ({ id: e.id, name: e.name, url: e.url })));
export interface SjbLayerViewerProps { className?: string }

function LayerScene({ spread, focus, reset }: { spread: number; focus: string; reset: number }) {
  const host = useRef<HTMLDivElement>(null);
  const sceneState = useRef<{ meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[]; master: THREE.Mesh; fit: () => void } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = host.current; if (!el) return;
    let disposed = false;
    let cleanup = () => {};
    Promise.all([import("three"), import("three/examples/jsm/controls/OrbitControls.js")]).then(async ([T, { OrbitControls }]) => {
      if (disposed) return;
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      el.appendChild(renderer.domElement);
      renderer.domElement.setAttribute("aria-label", "Centered orbiting logo layers");
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(38, 1, .01, 100);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 1.7; controls.maxDistance = 9;
      const geometry = new T.PlaneGeometry(2, 2);
      const textures: THREE.Texture[] = [];
      const meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
      const loader = new T.TextureLoader();
      const observer = new ResizeObserver(() => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); fit(); });
      const fit = () => { controls.target.set(0, 0, 0); const d = Math.max(4.6, 4.6 / camera.aspect); camera.position.set(d * .45, -d * .55, d); controls.update(); };
      observer.observe(el);
      cleanup = () => { observer.disconnect(); renderer.setAnimationLoop(null); controls.dispose(); geometry.dispose(); textures.forEach(t => t.dispose()); meshes.forEach(m => m.material.dispose()); scene.traverse(o => { if (o instanceof T.Mesh && !meshes.includes(o)) o.material.dispose(); }); renderer.dispose(); renderer.domElement.remove(); sceneState.current = null; };
      try {
        const loaded = await Promise.all([...layers.map(p => p.url), SJB_LOGOS[0].svg].map(async url => {
          const response = await fetch(url); if (!response.ok) throw new Error("Missing layer");
          const svg = new DOMParser().parseFromString(await response.text(), "image/svg+xml").documentElement;
          svg.setAttribute("width", "2048"); svg.setAttribute("height", "2048");
          const objectUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
          try { return await loader.loadAsync(objectUrl); } finally { URL.revokeObjectURL(objectUrl); }
        }));
        textures.push(...loaded);
        if (disposed) { cleanup(); return; }
        loaded.forEach((texture, i) => { texture.colorSpace = T.SRGBColorSpace; const material = new T.MeshBasicMaterial({ map: texture, transparent: true, side: T.DoubleSide, depthWrite: false }); const mesh = new T.Mesh(geometry, material); mesh.renderOrder = i; scene.add(mesh); if (i < layers.length) meshes.push(mesh); });
        const master = scene.children[scene.children.length - 1] as THREE.Mesh;
        sceneState.current = { meshes, master, fit };
        fit();
        renderer.domElement.tabIndex = 0;
        renderer.domElement.onkeydown = e => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
          e.preventDefault(); const spherical = new T.Spherical().setFromVector3(camera.position);
          const step = e.shiftKey ? .2 : .06;
          if (e.key === "ArrowLeft") spherical.theta -= step;
          if (e.key === "ArrowRight") spherical.theta += step;
          if (e.key === "ArrowUp") spherical.phi -= step;
          if (e.key === "ArrowDown") spherical.phi += step;
          spherical.makeSafe(); camera.position.setFromSpherical(spherical); controls.update();
        };
        renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
        // Apply current controls after textures become ready.
        el.dispatchEvent(new Event("layers-ready"));
      } catch { setError("The logo layers could not be loaded. Please try again."); cleanup(); }
    }).catch(() => setError("The 3D view is unavailable in this browser."));
    return () => { disposed = true; cleanup(); };
  }, []);
  useEffect(() => {
    const update = () => { const state = sceneState.current; if (!state) return;
      state.master.visible = spread === 0 && !focus;
      state.meshes.forEach((mesh, i) => { mesh.visible = !state.master.visible; mesh.position.z = (i - (layers.length - 1) / 2) * spread / 1400; mesh.material.opacity = focus && focus !== layers[i]?.id ? .08 : 1; });
    }; update(); const el = host.current; el?.addEventListener("layers-ready", update); return () => el?.removeEventListener("layers-ready", update);
  }, [spread, focus]);
  useEffect(() => { sceneState.current?.fit(); }, [reset]);
  return <div ref={host} className="relative h-full min-h-80 w-full overflow-hidden bg-muted [&_canvas]:block [&_canvas]:touch-none">{error ? <p role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-destructive">{error}</p> : null}</div>;
}

export function SjbLayerViewer({ className }: SjbLayerViewerProps) {
  const [spread, setSpread] = useState(90);
  const [focus, setFocus] = useState("");
  const [full, setFull] = useState(false);
  const [reset, setReset] = useState(0);
  const controls = <div className="flex flex-wrap items-end gap-4">
    <label className="min-w-40 flex-1 space-y-1 text-sm"><span className="block font-medium">Layer spread</span><input type="range" aria-label="Layer spread" min={0} max={160} value={spread} onChange={e => setSpread(Number(e.target.value))} className="w-full" /></label>
    <label className="min-w-0 flex-1 space-y-1 text-sm"><span className="block font-medium">Isolate layer</span><select aria-label="Isolate layer" className="h-9 w-full rounded-md border border-input bg-background px-2" value={focus} onChange={e => setFocus(e.target.value)}><option value="">All layers</option>{layers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <Button size="sm" variant="outline" onClick={() => { setSpread(0); setFocus(""); }}>Assemble</Button>
    <Button variant="outline" size="icon" title="Center camera" aria-label="Center logo camera" onClick={() => setReset(v => v + 1)}><RotateCcw /></Button>
  </div>;
  return <section className={`space-y-4 border-t border-border pt-5 ${className ?? ""}`} aria-label="Dissected logo viewer">
    <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Dissected logo</h3><Button size="sm" variant="outline" onClick={() => setFull(true)}><Maximize2 />View larger</Button></div>
    {controls}
    <div className="h-[480px] max-h-[65dvh] overflow-hidden rounded-md border border-border"><LayerScene spread={spread} focus={focus} reset={reset} /></div>
    <p className="text-xs text-muted-foreground">Exploded study of source pieces, not standalone marks. White palm highlights are original artwork; their shared navy silhouette remains in the badge base.</p>
    <Dialog open={full} onOpenChange={setFull}><DialogContent aria-describedby={undefined} className="flex h-[94dvh] w-[96vw] max-w-none flex-col gap-4 p-4 sm:max-w-none"><DialogTitle className="pr-8">San Juan Bowl · dissected logo</DialogTitle>{controls}<div className="min-h-0 flex-1"><LayerScene spread={spread} focus={focus} reset={reset} /></div></DialogContent></Dialog>
  </section>;
}
