import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, useTexture } from "@react-three/drei";
import { DoubleSide, SRGBColorSpace, BufferGeometry, Float32BufferAttribute, Spherical, Vector3, InstancedMesh, Object3D } from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import { BRAND } from "@/lib/brand-colors";
import { SJB_COLORS } from "@/lib/san-juan-bowl";
import { SJB_STADIUM_CONCEPT as C, SJB_STADIUM_CAMERAS, type SjbStadiumCamera } from "@/lib/sjb-stadium-concept";
import mapAsset from "@/assets/san-juan-bowl/stadium-pregame-reference-paint.jpg.asset.json";
import fieldAsset from "@/assets/san-juan-bowl/bowl-field-paint-reference.png.asset.json";

const sky = SJB_COLORS.find(c => c.id === "sky")?.hex ?? BRAND.blue;
const gold = SJB_COLORS.find(c => c.id === "gold")?.hex ?? BRAND.yellow;

function arcGeometry(innerX: number, innerZ: number, outerX: number, outerZ: number, y: number, folded = false, bottom = y - .5) {
  const points: number[] = [];
  for (let i = 0; i < 96; i++) {
    const a = C.stand.start + (C.stand.end - C.stand.start) * i / 96;
    const b = C.stand.start + (C.stand.end - C.stand.start) * (i + 1) / 96;
    const heightA = y + (folded && i % 2 ? 2 : 0);
    const heightB = y + (folded && (i + 1) % 2 ? 2 : 0);
    const p = [Math.cos(a) * innerX, heightA, Math.sin(a) * innerZ];
    const q = [Math.cos(a) * outerX, heightA, Math.sin(a) * outerZ];
    const r = [Math.cos(b) * innerX, heightB, Math.sin(b) * innerZ];
    const s = [Math.cos(b) * outerX, heightB, Math.sin(b) * outerZ];
    points.push(...p, ...q, ...r, ...q, ...s, ...r);
    const pb = [p[0], bottom, p[2]], qb = [q[0], bottom, q[2]], rb = [r[0], bottom, r[2]], sb = [s[0], bottom, s[2]];
    // Closed inner/outer walls and underside, plus end caps: no floating strips.
    points.push(...p, ...r, ...pb, ...r, ...rb, ...pb);
    points.push(...q, ...qb, ...s, ...s, ...qb, ...sb);
    points.push(...pb, ...rb, ...qb, ...qb, ...rb, ...sb);
    if (i === 0) points.push(...p, ...pb, ...q, ...q, ...pb, ...qb);
    if (i === 95) points.push(...r, ...s, ...rb, ...s, ...sb, ...rb);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function Seating({ upper }: { upper: boolean }) {
  const seats = useRef<InstancedMesh>(null);
  const backs = useRef<InstancedMesh>(null);
  const rows = upper ? 11 : 9;
  const count = rows * 112;
  useEffect(() => {
    if (!seats.current || !backs.current) return;
    const dummy = new Object3D();
    for (let row = 0; row < rows; row++) {
      const tier = row + (upper ? 9 : 0);
      for (let column = 0; column < 112; column++) {
        // Aisles between seating sections remain clear.
        const a = C.stand.start + (C.stand.end - C.stand.start) * (column + .5) / 112;
        const hidden = column % 14 === 0 || column % 14 === 13;
        const x = Math.cos(a) * (36.5 + tier * .95), z = Math.sin(a) * (42.4 + tier * .7);
        dummy.position.set(x, 1.58 + tier * .48, z); dummy.rotation.set(0, -a + Math.PI / 2, 0); dummy.scale.setScalar(hidden ? 0 : 1); dummy.updateMatrix();
        seats.current.setMatrixAt(row * 112 + column, dummy.matrix);
        dummy.position.set(x + Math.cos(a) * .23, 1.87 + tier * .48, z + Math.sin(a) * .23); dummy.updateMatrix();
        backs.current.setMatrixAt(row * 112 + column, dummy.matrix);
      }
    }
    seats.current.instanceMatrix.needsUpdate = true; backs.current.instanceMatrix.needsUpdate = true;
  }, [upper, rows]);
  return <group>
    <instancedMesh ref={seats} args={[undefined, undefined, count]}><boxGeometry args={[.9, .13, .55]} /><meshStandardMaterial color={upper ? sky : BRAND.darkGray} roughness={.7} /></instancedMesh>
    <instancedMesh ref={backs} args={[undefined, undefined, count]}><boxGeometry args={[.9, .5, .13]} /><meshStandardMaterial color={upper ? sky : BRAND.darkGray} roughness={.7} /></instancedMesh>
  </group>;
}

function Horseshoe({ roof }: { roof: boolean }) {
  const tiers = useMemo(() => Array.from({ length: 20 }, (_, i) => arcGeometry(36 + i * .95, 42 + i * .7, 37.1 + i * .95, 42.85 + i * .7, 1.4 + i * .48, false, .15)), []);
  const canopy = useMemo(() => arcGeometry(45, 49, 59, 60, 16, true, 15.5), []);
  const concourse = useMemo(() => arcGeometry(55, 56, 61, 63, 10.8, false, .15), []);
  const innerWall = useMemo(() => arcGeometry(35.5, 41.5, 36, 42, 2.1, false, .15), []);
  useEffect(() => () => { tiers.forEach(g => g.dispose()); canopy.dispose(); concourse.dispose(); innerWall.dispose(); }, [tiers, canopy, concourse, innerWall]);
  return <group position={[C.field.center[0], 0, C.field.center[1]]}>
    <mesh geometry={concourse} receiveShadow><meshStandardMaterial color={BRAND.blueWhite} roughness={.9} side={DoubleSide} /></mesh>
    <mesh geometry={innerWall}><meshStandardMaterial color={BRAND.lightGray} roughness={.9} side={DoubleSide} /></mesh>
    {tiers.map((geometry, i) => <mesh key={i} geometry={geometry} receiveShadow><meshStandardMaterial color={BRAND.lightGray} roughness={.85} side={DoubleSide} /></mesh>)}
    <Seating upper={false} /><Seating upper />
    {roof && <mesh geometry={canopy} castShadow receiveShadow><meshStandardMaterial color={BRAND.white} roughness={.8} side={DoubleSide} /></mesh>}
    {Array.from({ length: 35 }, (_, i) => {
      const a = C.stand.start + (C.stand.end - C.stand.start) * i / 34;
      return <group key={i} position={[Math.cos(a) * 59, 0, Math.sin(a) * 61]} rotation={[0, -a, 0]}>
        <mesh position={[0, 7.8, 0]} castShadow><boxGeometry args={[1.1, 15.6, 1.1]} /><meshStandardMaterial color={BRAND.blueWhite} /></mesh>
        <mesh position={[0, 5.5, 0]} rotation={[Math.PI / 4, 0, 0]}><boxGeometry args={[.6, 5, .7]} /><meshStandardMaterial color={BRAND.lightGray} /></mesh>
        <mesh position={[0, 5.5, 0]} rotation={[-Math.PI / 4, 0, 0]}><boxGeometry args={[.6, 5, .7]} /><meshStandardMaterial color={BRAND.lightGray} /></mesh>
      </group>;
    })}
    {Array.from({ length: 8 }, (_, i) => {
      const a = i < 4 ? C.stand.start + .25 + i * 1.2 : -.8 + (i - 4) * .55;
      return <group key={i} position={[Math.cos(a) * 62, 0, Math.sin(a) * 64]} rotation={[0, -a, 0]}>
        <group rotation={[0, 0, -.17]}>
          <mesh position={[0, 20, 0]} castShadow><cylinderGeometry args={[.45, .9, 40, 6]} /><meshStandardMaterial color={BRAND.white} metalness={.3} roughness={.5} /></mesh>
          <mesh position={[0, 39, 0]}><boxGeometry args={[8, 4, .7]} /><meshStandardMaterial color={BRAND.darkGray} /></mesh>
          {Array.from({ length: 12 }, (_, k) => <mesh key={k} position={[-3 + (k % 4) * 2, 37.8 + Math.floor(k / 4) * 1.2, .5]}><sphereGeometry args={[.42, 6, 4]} /><meshStandardMaterial color={BRAND.white} /></mesh>)}
        </group>
      </group>;
    })}
  </group>;
}

function SourceSurfaces({ onReady }: { onReady: () => void }) {
  const [map, field] = useTexture([mapAsset.url, fieldAsset.url]);
  // A tiny unmarked turf corner from the supplied image masks the skewed field
  // painted into the concept map; no second set of yard lines or sponsor marks.
  const turf = useMemo(() => { const texture = field.clone(); texture.repeat.set(.008, .008); texture.offset.set(0, .99); texture.colorSpace = SRGBColorSpace; texture.needsUpdate = true; return texture; }, [field]);
  useEffect(() => () => turf.dispose(), [turf]);
  const { gl } = useThree();
  useEffect(() => {
    for (const texture of [map, field]) { texture.colorSpace = SRGBColorSpace; texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy()); texture.needsUpdate = true; }
  }, [map, field, gl]);
  const drawn = useRef(false);
  useFrame(() => { if (!drawn.current) { drawn.current = true; onReady(); } });
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[C.mapWidth, C.mapDepth]} /><meshBasicMaterial map={map} toneMapped={false} /></mesh>
    <group position={[C.field.center[0], .5, C.field.center[1]]} rotation={[0, C.field.rotation, 0]}>
      <mesh position={[0, -.1, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[81, 46]} /><meshBasicMaterial map={turf} toneMapped={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[C.field.length, C.field.width]} /><meshBasicMaterial map={field} toneMapped={false} /></mesh>
      {[-1, 1].map(end => <group key={end} position={[end * 38, 0, 0]}>
        <mesh position={[0, 3.4, 0]}><cylinderGeometry args={[.16, .16, 6.8, 8]} /><meshStandardMaterial color={gold} /></mesh>
        <mesh position={[0, 6.8, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.15, .15, 5.5, 8]} /><meshStandardMaterial color={gold} /></mesh>
        {[-2.75, 2.75].map(z => <mesh key={z} position={[0, 10, z]}><cylinderGeometry args={[.15, .15, 6.4, 8]} /><meshStandardMaterial color={gold} /></mesh>)}
      </group>)}
    </group>
  </>;
}

function CameraRig({ view, reset }: { view: SjbStadiumCamera; reset: number }) {
  const controls = useRef<OrbitControlsType>(null);
  const { camera, gl, invalidate, size } = useThree();
  useEffect(() => {
    const preset = SJB_STADIUM_CAMERAS[view];
    const target = new Vector3(...preset.target);
    const position = new Vector3(...preset.position);
    if (size.width < 600 && view !== "overhead") position.sub(target).multiplyScalar(1.35).add(target);
    camera.position.copy(position); controls.current?.target.copy(target); camera.lookAt(target); controls.current?.update(); invalidate();
  }, [view, reset, camera, invalidate, size.width]);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.tabIndex = 0; canvas.setAttribute("aria-label", "Interactive Hiram Bithorn stadium and football-field concept");
    const key = (e: KeyboardEvent) => {
      const control = controls.current; if (!control || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "-"].includes(e.key)) return;
      e.preventDefault();
      const offset = camera.position.clone().sub(control.target);
      const spherical = new Spherical().setFromVector3(offset);
      if (e.key === "ArrowLeft") spherical.theta -= .12;
      if (e.key === "ArrowRight") spherical.theta += .12;
      if (e.key === "ArrowUp") spherical.phi = Math.max(.05, spherical.phi - .1);
      if (e.key === "ArrowDown") spherical.phi = Math.min(Math.PI / 2 - .05, spherical.phi + .1);
      if (e.key === "+") spherical.radius = Math.max(35, spherical.radius * .9);
      if (e.key === "-") spherical.radius = Math.min(600, spherical.radius * 1.1);
      camera.position.copy(new Vector3().setFromSpherical(spherical).add(control.target)); control.update(); invalidate();
    };
    canvas.addEventListener("keydown", key); return () => canvas.removeEventListener("keydown", key);
  }, [camera, gl, invalidate]);
  return <OrbitControls ref={controls} makeDefault enableDamping={false} minDistance={35} maxDistance={600} maxPolarAngle={Math.PI / 2 - .025} />;
}

export interface SjbStadiumSceneProps { view: SjbStadiumCamera; reset: number; roof: boolean; onReady: () => void }
export default function SjbStadiumScene({ view, reset, roof, onReady }: SjbStadiumSceneProps) {
  return <Canvas frameloop="demand" gl={{ preserveDrawingBuffer: true }} dpr={[1, 1.5]} camera={{ position: [-125, 125, 165], fov: 42, near: .2, far: 1800 }}>
    <color attach="background" args={[BRAND.surface]} />
    <hemisphereLight args={[BRAND.white, BRAND.blueWhite, 1.4]} />
    <directionalLight position={[-80, 180, 80]} intensity={2} />
    <Environment resolution={64}><Lightformer intensity={2} position={[0, 100, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={150} /></Environment>
    <mesh position={[0, -1, 0]}><boxGeometry args={[C.mapWidth, 1.8, C.mapDepth]} /><meshStandardMaterial color={BRAND.blueWhite} /></mesh>
    <Horseshoe roof={roof} />
    <group position={[C.arena.center[0], 0, C.arena.center[1]]}>
      <mesh position={[0, 5.5, 0]}><cylinderGeometry args={[29, 30, 11, 64]} /><meshStandardMaterial color={BRAND.blueWhite} roughness={.8} /></mesh>
      <mesh position={[0, 12, 0]}><coneGeometry args={[29.5, 4, 64]} /><meshStandardMaterial color={BRAND.white} roughness={.75} /></mesh>
      {Array.from({ length: 20 }, (_, i) => { const a = i * Math.PI / 10; return <mesh key={i} position={[Math.cos(a) * 29.5, 6, Math.sin(a) * 29.5]}><boxGeometry args={[.8, 12, .8]} /><meshStandardMaterial color={sky} /></mesh>; })}
    </group>
    <Suspense fallback={null}><SourceSurfaces onReady={onReady} /></Suspense>
    <CameraRig view={view} reset={reset} />
  </Canvas>;
}