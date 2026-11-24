import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CAMPUS_ZONES } from '../data/campus.ts';
import type { Person } from '../types';
import { initialsOf } from './Avatar';

/**
 * Illustrative 3D campus. Building placement follows the illustrated USFQ map published by Noticias USFQ (2012,
 * "Ubícate en la USFQ"); it is a stylised model, not georeferenced and not an official plan. Only the 13 zones the
 * app already uses are selectable; the rest are context buildings.
 */
type Roof = 'gable' | 'flat' | 'pyramid' | 'dome';
type Block = { x: number; z: number; w: number; d: number; h: number; wall: string; roof: string; roofType: Roof; rot?: number };
type ZoneModel = { blocks: Block[]; open?: { x: number; z: number; r: number; color: string } };

const PINK = '#E8B9A6', CREAM = '#F1E4CF', BRICK = '#B4603F', TEAL = '#5E8C86', BROWN = '#7A4A32', BLUE = '#5D7FA3';

const ZONES: Record<string, ZoneModel> = {
  epicuro: { blocks: [{ x: -15, z: -5, w: 3, d: 3, h: 5.5, wall: CREAM, roof: '#9AA3AD', roofType: 'flat' }] },
  'hall-espejo': { blocks: [{ x: -10.5, z: -2.6, w: 5, d: 3.6, h: 2.4, wall: PINK, roof: BROWN, roofType: 'gable' }] },
  biblioteca: { blocks: [{ x: -7.2, z: -5.6, w: 6, d: 3.8, h: 3, wall: PINK, roof: BROWN, roofType: 'gable' }] },
  einstein: { blocks: [{ x: -4.2, z: -7.4, w: 3, d: 3, h: 3, wall: CREAM, roof: TEAL, roofType: 'pyramid' }] },
  galileo: { blocks: [{ x: -1.6, z: -4.6, w: 5, d: 4, h: 4.2, wall: PINK, roof: BROWN, roofType: 'gable' }] },
  newton: { blocks: [{ x: 1.4, z: -8.2, w: 4, d: 3.2, h: 3.6, wall: PINK, roof: BROWN, roofType: 'gable' }] },
  darwin: { blocks: [{ x: -3.4, z: -10.6, w: 4, d: 3, h: 3, wall: CREAM, roof: TEAL, roofType: 'gable' }] },
  'da-vinci': { blocks: [{ x: -8.6, z: -11.4, w: 5, d: 3.8, h: 3.6, wall: '#D98E6A', roof: BRICK, roofType: 'flat' }] },
  maxwell: { blocks: [
    { x: 0.6, z: -12.6, w: 7, d: 3, h: 3, wall: CREAM, roof: TEAL, roofType: 'gable' },
    { x: -0.4, z: -13.6, w: 2.4, d: 2.4, h: 4.2, wall: CREAM, roof: '#D4A53C', roofType: 'dome' },
  ] },
  hayek: { blocks: [{ x: 7.4, z: -11, w: 5, d: 3.6, h: 4, wall: '#C9CED6', roof: '#7D8590', roofType: 'flat' }] },
  'plaza-academica': { blocks: [], open: { x: -13.4, z: -11.4, r: 2.4, color: '#D9CBB3' } },
  'plaza-maxwell': { blocks: [], open: { x: 4.2, z: -10.2, r: 1.8, color: '#D9CBB3' } },
  cuadrangulos: { blocks: [], open: { x: -6, z: 1.6, r: 4.2, color: '#CFE3C2' } },
};

/** Context-only buildings and spaces from the same map (not selectable). */
const CONTEXT: Block[] = [
  { x: -2.4, z: 6.4, w: 2.8, d: 2.8, h: 4.2, wall: BLUE, roof: '#3E5875', roofType: 'flat' },            // Miguel de Santiago
  { x: 3.6, z: 7.6, w: 4.4, d: 2.6, h: 1.8, wall: CREAM, roof: BRICK, roofType: 'gable', rot: -0.3 },  // Sócrates
  { x: 0.4, z: 10.2, w: 3.4, d: 2.2, h: 1.6, wall: CREAM, roof: BRICK, roofType: 'gable', rot: -0.2 }, // Aristóteles
  { x: 4.6, z: 3.4, w: 2.2, d: 1.8, h: 1.4, wall: CREAM, roof: BRICK, roofType: 'gable' },             // Mozart
  { x: 7.4, z: 4.8, w: 1.8, d: 1.6, h: 1.3, wall: CREAM, roof: BRICK, roofType: 'gable' },             // Lao Tse
  { x: 7.6, z: -2.6, w: 5, d: 4, h: 2.2, wall: CREAM, roof: TEAL, roofType: 'pyramid' },               // Coliseo
  { x: 4, z: -3.4, w: 1.8, d: 1.8, h: 1.8, wall: '#B83A2E', roof: '#8C2A21', roofType: 'pyramid' },     // Pagoda
  { x: -12.8, z: 1.2, w: 3, d: 2.4, h: 1.6, wall: CREAM, roof: BROWN, roofType: 'gable' },              // Clínica
];

const mat = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });

function buildBlock(b: Block, group: THREE.Group) {
  const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat(b.wall));
  body.position.set(b.x, b.h / 2, b.z);
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  let roof: THREE.Mesh;
  if (b.roofType === 'gable') {
    const shape = new THREE.Shape([new THREE.Vector2(-b.d / 2 - 0.15, 0), new THREE.Vector2(b.d / 2 + 0.15, 0), new THREE.Vector2(0, Math.min(1.2, b.d * 0.35))]);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: b.w + 0.3, bevelEnabled: false });
    geo.translate(0, 0, -(b.w + 0.3) / 2);
    roof = new THREE.Mesh(geo, mat(b.roof));
    roof.rotation.y = Math.PI / 2;
  } else if (b.roofType === 'pyramid') {
    roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.78, 1.4, 4), mat(b.roof));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.7;
  } else if (b.roofType === 'dome') {
    roof = new THREE.Mesh(new THREE.SphereGeometry(b.w * 0.45, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: b.roof, metalness: 0.5, roughness: 0.35 }));
  } else {
    roof = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.2, 0.18, b.d + 0.2), mat(b.roof));
    roof.position.y = 0.09;
  }
  roof.position.x += b.x;
  roof.position.z += b.z;
  roof.position.y += b.h;
  roof.castShadow = true;
  const holder = new THREE.Group();
  holder.add(body, roof);
  if (b.rot) {
    holder.position.set(b.x, 0, b.z);
    body.position.x -= b.x; body.position.z -= b.z;
    roof.position.x -= b.x; roof.position.z -= b.z;
    holder.rotation.y = b.rot;
  }
  group.add(holder);
  return [body, roof];
}

function tree(x: number, z: number, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.1 * s, 0.6 * s), mat('#7A5638'));
  trunk.position.y = 0.3 * s;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 * s, 0), mat(['#5E9C5A', '#4F8A4C', '#6DAA62'][Math.abs(Math.round(x * 7 + z * 3)) % 3]));
  crown.position.y = 0.95 * s;
  crown.castShadow = true;
  g.add(trunk, crown);
  g.position.set(x, 0, z);
  return g;
}

/** CSS2DRenderer positions the outer element with a transform, so the bobbing animation lives on an inner one. */
function friendChip(people: Person[], self: boolean) {
  const outer = document.createElement('div');
  const el = document.createElement('div');
  outer.appendChild(el);
  el.className = 'map3d-chip' + (self ? ' self' : '');
  if (self) el.textContent = 'Tú';
  for (const p of people.slice(0, 3)) {
    const a = document.createElement('span');
    a.textContent = initialsOf(p);
    a.style.background = p.color;
    el.appendChild(a);
  }
  if (people.length > 3) {
    const more = document.createElement('span');
    more.textContent = `+${people.length - 3}`;
    more.className = 'more';
    el.appendChild(more);
  }
  return outer;
}

type Props = { active: string; selfZone: string | null; friendsByZone: Record<string, Person[]>; onSelect: (zone: string) => void };

export default function CampusMap3D({ active, selfZone, friendsByZone, onSelect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ highlight: (zone: string) => void; markers: (f: Record<string, Person[]>, self: string | null) => void } | null>(null);
  const select = useRef(onSelect);
  useEffect(() => { select.current = onSelect; });

  useEffect(() => {
    const el = host.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#EEF3F8');
    scene.fog = new THREE.Fog('#EEF3F8', 45, 80);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    camera.position.set(8, 30, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const labels = new CSS2DRenderer();
    labels.domElement.className = 'map3d-labels';
    el.appendChild(labels.domElement);

    scene.add(new THREE.HemisphereLight('#ffffff', '#b7c3a8', 1.6));
    const sun = new THREE.DirectionalLight('#fff4e0', 2.2);
    sun.position.set(-12, 24, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24 });
    scene.add(sun);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 64), mat('#D7E6C8'));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const pave = (x: number, z: number, w: number, d: number, color = '#E4E0D6') => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.01, z); m.receiveShadow = true; scene.add(m);
    };
    pave(-3, -1, 26, 2.2);           // main walkway
    pave(-6.5, 2, 9, 6, '#DCD8CC');  // central plaza / parking
    pave(10.5, 3, 7, 5, '#7FB26F');  // sports fields
    pave(11.5, -6.5, 5, 4, '#7FB26F');

    const city = new THREE.Group();
    CONTEXT.forEach(b => buildBlock(b, city));
    scene.add(city);
    [[-9, 2], [-8, 4], [-5, 4.5], [-3, 3.8], [2, 0.5], [3, -1], [1.5, 2.5], [5.5, 0.5], [9, 1], [-13, -1], [-11, 4], [6, -7], [10, -9],
      [-14, -9], [2.6, -6], [-0.5, 2], [8.5, -5.5], [12.5, 0], [-6, 6.5], [-9.5, 6]].forEach(([x, z], i) => scene.add(tree(x, z, 0.8 + (i % 3) * 0.2)));

    // Selectable zones
    const pickables: THREE.Object3D[] = [];
    const zoneMeshes: Record<string, THREE.Mesh[]> = {};
    const anchors: Record<string, THREE.Vector3> = {};
    for (const z of CAMPUS_ZONES) {
      const model = ZONES[z.id];
      if (!model) continue;
      const g = new THREE.Group();
      const meshes: THREE.Mesh[] = [];
      model.blocks.forEach(b => meshes.push(...buildBlock(b, g) as THREE.Mesh[]));
      let top: number, cx: number, cz: number;
      if (model.open) {
        const o = model.open;
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(o.r, o.r, 0.12, 40), mat(o.color));
        disc.position.set(o.x, 0.06, o.z);
        disc.receiveShadow = true;
        g.add(disc); meshes.push(disc);
        cx = o.x; cz = o.z; top = 0.2;
      } else {
        cx = model.blocks[0].x; cz = model.blocks[0].z; top = Math.max(...model.blocks.map(b => b.h)) + 1;
      }
      meshes.forEach(m => { m.userData.zone = z.id; pickables.push(m); });
      zoneMeshes[z.id] = meshes;
      anchors[z.id] = new THREE.Vector3(cx, top + 0.6, cz);
      const tag = document.createElement('button');
      tag.className = 'map3d-tag' + (z.kind === 'OPEN' ? ' open' : '');
      tag.textContent = z.label;
      tag.onclick = () => select.current(z.id);
      const label = new CSS2DObject(tag);
      label.position.copy(anchors[z.id]);
      g.add(label);
      scene.add(g);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(-3, 0, -6);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.4;
    controls.minDistance = 18;
    controls.maxDistance = 56;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.addEventListener('start', () => { controls.autoRotate = false; });

    // Click / tap a building to select its zone
    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down = { x: 0, y: 0 };
    renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    renderer.domElement.addEventListener('pointerup', e => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return; // it was a drag
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      if (hit) select.current(hit.object.userData.zone as string);
    });

    const markers: CSS2DObject[] = [];
    let selected = '';
    let pulse = 0;
    api.current = {
      highlight: zone => {
        selected = zone;
        for (const [id, ms] of Object.entries(zoneMeshes)) {
          ms.forEach(m => { (m.material as THREE.MeshStandardMaterial).emissive.set(id === zone ? '#E11B22' : '#000000'); });
        }
        el.querySelectorAll('.map3d-tag').forEach(t => t.classList.toggle('on', t.textContent === CAMPUS_ZONES.find(z => z.id === zone)?.label));
      },
      markers: (friends, self) => {
        markers.splice(0).forEach(m => { m.removeFromParent(); m.element.remove(); });
        const ids = new Set([...Object.keys(friends).filter(k => friends[k].length), ...(self ? [self] : [])]);
        for (const id of ids) {
          if (!anchors[id]) continue;
          const chip = new CSS2DObject(friendChip(friends[id] ?? [], id === self));
          chip.position.copy(anchors[id]).add(new THREE.Vector3(0, 1.3, 0));
          scene.add(chip);
          markers.push(chip);
        }
      },
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h);
      labels.setSize(w, h);
      camera.aspect = w / h;
      camera.fov = w / h < 1 ? 47 : 38; // portrait phones need a wider lens to fit the campus
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      pulse += 0.05;
      for (const m of zoneMeshes[selected] ?? []) (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.22 + Math.sin(pulse) * 0.12;
      controls.update();
      renderer.render(scene, camera);
      labels.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse(o => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        (m.material as THREE.Material | undefined)?.dispose?.();
      });
      el.innerHTML = '';
      api.current = null;
    };
  }, []);

  useEffect(() => { api.current?.highlight(active); }, [active]);
  useEffect(() => { api.current?.markers(friendsByZone, selfZone); }, [friendsByZone, selfZone]);

  return <div className="map3d" ref={host} role="img" aria-label="Mapa 3D ilustrativo del campus Cumbayá. Arrastra para girar; toca un edificio para elegir su zona." />;
}
