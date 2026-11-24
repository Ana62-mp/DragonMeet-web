import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Compass, Minus, Plus, RotateCcw, ScanEye } from 'lucide-react';
import { CAMPUS_ZONES } from '../data/campus.ts';
import { BOUNDARY, CONTEXT_3D, LANDMARKS, STREETS, ZONES_3D, toScene, type Block } from '../data/campus3d.ts';
import type { Person } from '../types';
import { initialsOf } from './Avatar';

/** Illustrative 3D campus; see src/data/campus3d.ts for where the layout comes from. */
const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

function buildBlock(b: Block, parent: THREE.Object3D) {
  const [x, z] = toScene(b.px, b.py);
  const holder = new THREE.Group();
  holder.position.set(x, 0, z);
  holder.rotation.y = b.rot ?? 0;
  const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat(b.wall));
  body.position.y = b.h / 2;
  body.castShadow = body.receiveShadow = true;
  // Window bands so façades read as buildings, not boxes.
  const floors = Math.max(1, Math.round(b.h / 1.3));
  for (let f = 0; f < floors; f++) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.02, 0.22, b.d + 0.02), mat('#3D4A5C', { roughness: 0.4 }));
    band.position.y = 0.75 + f * 1.15;
    if (band.position.y < b.h - 0.3) holder.add(band);
  }
  let roof: THREE.Mesh;
  if (b.roofType === 'gable') {
    const shape = new THREE.Shape([new THREE.Vector2(-b.d / 2 - 0.2, 0), new THREE.Vector2(b.d / 2 + 0.2, 0), new THREE.Vector2(0, Math.min(1.4, b.d * 0.32))]);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: b.w + 0.3, bevelEnabled: false });
    geo.translate(0, 0, -(b.w + 0.3) / 2);
    roof = new THREE.Mesh(geo, mat(b.roof));
    roof.rotation.y = Math.PI / 2;
  } else if (b.roofType === 'pyramid') {
    roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.75, 1.5, 4), mat(b.roof));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.75;
  } else if (b.roofType === 'dome') {
    roof = new THREE.Mesh(new THREE.SphereGeometry(b.w * 0.48, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(b.roof, { metalness: 0.55, roughness: 0.3 }));
    // The dragon that sits on the dome (simple silhouette).
    const dragon = new THREE.Mesh(new THREE.TorusKnotGeometry(0.28, 0.08, 40, 6, 2, 3), mat('#7A2E3B'));
    dragon.position.set(0, b.w * 0.48 + 0.1, 0);
    dragon.scale.set(1.3, 0.7, 0.7);
    roof.add(dragon);
  } else if (b.roofType === 'pagoda') {
    roof = new THREE.Mesh(new THREE.ConeGeometry(b.w * 0.95, 0.7, 4), mat(b.roof));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.35;
    const top = new THREE.Mesh(new THREE.ConeGeometry(b.w * 0.6, 0.6, 4), mat(b.roof));
    top.position.y = 0.75;
    roof.add(top);
  } else {
    roof = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.25, 0.2, b.d + 0.25), mat(b.roof));
    roof.position.y = 0.1;
  }
  roof.position.y += b.h;
  roof.castShadow = true;
  holder.add(body, roof);
  parent.add(holder);
  return { meshes: [body, roof], top: b.h + 1.2, x, z };
}

const tree = (x: number, z: number, s = 1, palm = false) => {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.09 * s, (palm ? 1.4 : 0.6) * s), mat('#7A5638'));
  trunk.position.y = (palm ? 0.7 : 0.3) * s;
  g.add(trunk);
  if (palm) {
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12 * s, 0.9 * s, 4), mat('#4E8F4A'));
      leaf.position.y = 1.4 * s;
      leaf.rotation.set(1.1, (i / 6) * Math.PI * 2, 0);
      leaf.translateY(0.35 * s);
      g.add(leaf);
    }
  } else {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 * s, 0), mat(['#5E9C5A', '#4F8A4C', '#6DAA62'][Math.abs(Math.round(x * 7 + z * 3)) % 3]));
    crown.position.y = 0.95 * s;
    crown.castShadow = true;
    g.add(crown);
  }
  g.position.set(x, 0, z);
  return g;
};

function pointInPolygon(x: number, z: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function friendChip(people: Person[], self: boolean) {
  const outer = document.createElement('div'); // CSS2DRenderer owns this element's transform
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

function label(text: string, className: string) {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  return new CSS2DObject(el);
}

type Props = { active: string; selfZone: string | null; friendsByZone: Record<string, Person[]>; onSelect: (zone: string) => void };
type Api = {
  highlight: (zone: string) => void;
  markers: (f: Record<string, Person[]>, self: string | null) => void;
  zoom: (factor: number) => void;
  reset: () => void;
  topDown: () => void;
};

const HOME = { pos: new THREE.Vector3(3, 42, 38), target: new THREE.Vector3(-1, 0, 0) };

export default function CampusMap3D({ active, selfZone, friendsByZone, onSelect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const needle = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const select = useRef(onSelect);
  const [hint, setHint] = useState(true);
  useEffect(() => { select.current = onSelect; });
  useEffect(() => { const t = setTimeout(() => setHint(false), 6000); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const el = host.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#EAF1F7');
    scene.fog = new THREE.Fog('#EAF1F7', 60, 110);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
    camera.position.copy(HOME.pos);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.prepend(renderer.domElement);
    const labels = new CSS2DRenderer();
    labels.domElement.className = 'map3d-labels';
    el.appendChild(labels.domElement);

    scene.add(new THREE.HemisphereLight('#ffffff', '#b7c3a8', 1.5));
    const sun = new THREE.DirectionalLight('#fff4e0', 2.3);
    sun.position.set(-18, 34, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32 });
    scene.add(sun);

    // Neighbourhood ground, then the campus inside its boundary.
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), mat('#DCE3D2'));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const poly = BOUNDARY.map(([px, py]) => toScene(px, py));
    const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
    const campus = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat('#CFE3BF'));
    campus.rotation.x = -Math.PI / 2;
    campus.position.y = 0.02;
    campus.receiveShadow = true;
    scene.add(campus);
    // Low perimeter wall marks where the campus ends.
    const wallPts = [...poly, poly[0]].map(([x, z]) => new THREE.Vector3(x, 0, z));
    for (let i = 0; i < wallPts.length - 1; i++) {
      const a = wallPts[i], b = wallPts[i + 1];
      const wall = new THREE.Mesh(new THREE.BoxGeometry(a.distanceTo(b), 0.5, 0.18), mat('#C9B79C'));
      wall.position.copy(a).lerp(b, 0.5).setY(0.25);
      wall.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      wall.castShadow = true;
      scene.add(wall);
    }

    // Streets around the campus, with their names.
    for (const s of STREETS) {
      const pts = s.path.map(([px, py]) => toScene(px, py));
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        const road = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(bx - ax, bz - az) + s.width, s.width), mat('#9AA1AA'));
        road.rotation.x = -Math.PI / 2;
        road.rotation.z = -Math.atan2(bz - az, bx - ax);
        road.position.set((ax + bx) / 2, 0.03, (az + bz) / 2);
        road.receiveShadow = true;
        scene.add(road);
      }
      const mid = pts[Math.floor(pts.length / 2)];
      const tag = label(s.name, 'map3d-street');
      tag.position.set(mid[0], 0.4, mid[1]);
      scene.add(tag);
    }

    // Paved walkways inside the campus.
    const walk = (px1: number, py1: number, px2: number, py2: number, w = 1.2) => {
      const [ax, az] = toScene(px1, py1), [bx, bz] = toScene(px2, py2);
      const path = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(bx - ax, bz - az), w), mat('#E6DFD0'));
      path.rotation.x = -Math.PI / 2;
      path.rotation.z = -Math.atan2(bz - az, bx - ax);
      path.position.set((ax + bx) / 2, 0.04, (az + bz) / 2);
      path.receiveShadow = true;
      scene.add(path);
    };
    walk(560, 480, 830, 560); walk(620, 560, 700, 760); walk(700, 440, 760, 600); walk(520, 620, 660, 690);

    // Context buildings with small names.
    for (const b of CONTEXT_3D) {
      const built = buildBlock(b, scene);
      if (b.name) {
        const tag = label(b.name, 'map3d-landmark');
        tag.position.set(built.x, built.top, built.z);
        scene.add(tag);
      }
    }

    // Landmarks from the campus photos.
    {
      const [ox, oz] = toScene(LANDMARKS.obelisk.px, LANDMARKS.obelisk.py);
      const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 6.5, 4), mat('#F7F7F4'));
      obelisk.position.set(ox, 3.25, oz);
      obelisk.rotation.y = Math.PI / 4;
      obelisk.castShadow = true;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 4), mat('#F7F7F4'));
      tip.position.y = 3.55;
      obelisk.add(tip);
      scene.add(obelisk);
      const t = label(LANDMARKS.obelisk.name, 'map3d-landmark');
      t.position.set(ox, 7.4, oz);
      scene.add(t);

      const [lx, lz] = toScene(LANDMARKS.pond.px, LANDMARKS.pond.py);
      const water = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat('#5FA3C7', { roughness: 0.15, metalness: 0.1 }));
      water.scale.set(LANDMARKS.pond.rx, LANDMARKS.pond.rz, 1);
      water.rotation.x = -Math.PI / 2;
      water.position.set(lx, 0.06, lz);
      scene.add(water);
      for (let i = 0; i < 7; i++) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + (i % 3) * 0.12, 0), mat('#8D8A84'));
        rock.position.set(lx + 2.4 + (i % 3) * 0.3, 0.2 + (i % 4) * 0.25, lz - 1 + i * 0.25);
        scene.add(rock);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.6), mat('#C9652D'));
      bridge.position.set(lx - 0.8, 0.35, lz + 0.4);
      bridge.rotation.y = 0.5;
      scene.add(bridge);
      const p = label(LANDMARKS.pond.name, 'map3d-landmark');
      p.position.set(lx, 1, lz);
      scene.add(p);

      const [tx, tz] = toScene(LANDMARKS.tennis.px, LANDMARKS.tennis.py);
      for (let i = 0; i < 2; i++) {
        const court = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.2), mat('#B2563D'));
        court.rotation.set(-Math.PI / 2, 0, -0.3);
        court.position.set(tx + i * 2.6, 0.05, tz);
        scene.add(court);
      }
      const c = label(LANDMARKS.tennis.name, 'map3d-landmark');
      c.position.set(tx + 1.3, 0.8, tz);
      scene.add(c);
      const [fx, fz] = toScene(LANDMARKS.field.px, LANDMARKS.field.py);
      const field = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.6), mat('#6FAE5F'));
      field.rotation.set(-Math.PI / 2, 0, -0.3);
      field.position.set(fx, 0.05, fz);
      scene.add(field);
    }

    // Trees and palms inside the campus; small houses outside it for context.
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const [minX, maxX] = [Math.min(...poly.map(p => p[0])), Math.max(...poly.map(p => p[0]))];
    const [minZ, maxZ] = [Math.min(...poly.map(p => p[1])), Math.max(...poly.map(p => p[1]))];
    const occupied = [...Object.values(ZONES_3D).flatMap(z => z.blocks), ...CONTEXT_3D].map(b => toScene(b.px, b.py));
    for (let i = 0; i < 70; i++) {
      const x = minX + rnd() * (maxX - minX), z = minZ + rnd() * (maxZ - minZ);
      if (!pointInPolygon(x, z, poly) || occupied.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < 3.4)) continue;
      scene.add(tree(x, z, 0.7 + rnd() * 0.5, rnd() < 0.3));
    }
    const town = new THREE.Group();
    for (let i = 0; i < 160; i++) {
      const a = rnd() * Math.PI * 2, r = 24 + rnd() * 30;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (pointInPolygon(x, z, poly)) continue;
      const h = 0.8 + rnd() * 1.2;
      const house = new THREE.Mesh(new THREE.BoxGeometry(1.4 + rnd(), h, 1.4 + rnd()), mat(['#EFE6D8', '#E8D7C3', '#F3EEE6'][i % 3]));
      house.position.set(x, h / 2, z);
      house.rotation.y = -0.3;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.6, 4), mat(i % 4 ? '#B86A48' : '#8C949C'));
      roof.position.y = h / 2 + 0.3;
      roof.rotation.y = Math.PI / 4;
      house.add(roof);
      town.add(house);
    }
    scene.add(town);

    // Selectable zones.
    const pickables: THREE.Object3D[] = [];
    const zoneMeshes: Record<string, THREE.Mesh[]> = {};
    const anchors: Record<string, THREE.Vector3> = {};
    for (const z of CAMPUS_ZONES) {
      const model = ZONES_3D[z.id];
      if (!model) continue;
      const meshes: THREE.Mesh[] = [];
      let anchor: THREE.Vector3;
      if (model.open) {
        const o = model.open;
        const [ox, oz] = toScene(o.px, o.py);
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(o.r, o.r, 0.14, 40), mat(o.color));
        disc.position.set(ox, 0.07, oz);
        disc.receiveShadow = true;
        scene.add(disc);
        meshes.push(disc);
        if (o.kind === 'garden') {
          // Geometric hedges of the courtyard (photo of the ivy patio).
          for (const r of [0.6, 1.4]) {
            const hedge = new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 6, 24), mat('#4F8A4C'));
            hedge.rotation.x = Math.PI / 2;
            hedge.position.set(ox, 0.2, oz);
            scene.add(hedge);
          }
        }
        anchor = new THREE.Vector3(ox, 0.9, oz);
      } else {
        let top = 0;
        const built = model.blocks.map(b => buildBlock(b, scene));
        built.forEach(f => { meshes.push(...f.meshes); top = Math.max(top, f.top); });
        anchor = new THREE.Vector3(built[0].x, top, built[0].z);
      }
      meshes.forEach(m => { m.userData.zone = z.id; pickables.push(m); });
      zoneMeshes[z.id] = meshes;
      anchors[z.id] = anchor;
      const tag = document.createElement('button');
      tag.className = 'map3d-tag' + (z.kind === 'OPEN' ? ' open' : '');
      tag.dataset.zone = z.id;
      tag.textContent = model.approx ? `${z.label} ·~` : z.label;
      tag.title = model.approx ? 'Ubicación aproximada' : z.label;
      tag.onclick = () => select.current(z.id);
      const obj = new CSS2DObject(tag);
      obj.position.copy(anchor);
      scene.add(obj);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(HOME.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.3;
    controls.minDistance = 10;
    controls.maxDistance = 75;
    controls.screenSpacePanning = false;
    controls.addEventListener('start', () => setHint(false));

    // Click / tap a building to select its zone.
    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down = { x: 0, y: 0 };
    renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    renderer.domElement.addEventListener('pointerup', e => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      if (hit) select.current(hit.object.userData.zone as string);
    });

    // Smooth camera moves for the buttons and for focusing a selected zone.
    let fly: { pos: THREE.Vector3; target: THREE.Vector3; t: number } | null = null;
    const flyTo = (pos: THREE.Vector3, target: THREE.Vector3) => { fly = { pos, target, t: 0 }; };
    const markers: CSS2DObject[] = [];
    let selected = '';
    let pulse = 0;
    api.current = {
      highlight: zone => {
        const changed = selected !== '' && selected !== zone;
        selected = zone;
        for (const [id, ms] of Object.entries(zoneMeshes)) {
          ms.forEach(m => (m.material as THREE.MeshStandardMaterial).emissive.set(id === zone ? '#E11B22' : '#000000'));
        }
        el.querySelectorAll<HTMLElement>('.map3d-tag').forEach(t => t.classList.toggle('on', t.dataset.zone === zone));
        if (changed && anchors[zone]) {
          const a = anchors[zone];
          const offset = camera.position.clone().sub(controls.target).setLength(Math.min(camera.position.distanceTo(controls.target), 30));
          flyTo(new THREE.Vector3(a.x, 0, a.z).add(offset), new THREE.Vector3(a.x, 0, a.z));
        }
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
      zoom: factor => {
        const off = camera.position.clone().sub(controls.target).multiplyScalar(factor);
        const len = THREE.MathUtils.clamp(off.length(), controls.minDistance, controls.maxDistance);
        flyTo(controls.target.clone().add(off.setLength(len)), controls.target.clone());
      },
      reset: () => flyTo(HOME.pos.clone(), HOME.target.clone()),
      topDown: () => flyTo(new THREE.Vector3(controls.target.x, 52, controls.target.z + 4), controls.target.clone()),
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h);
      labels.setSize(w, h);
      camera.aspect = w / h;
      camera.fov = w / h < 1 ? 50 : 38; // portrait phones need a wider lens to fit the campus
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      pulse += 0.05;
      if (fly) {
        fly.t = Math.min(1, fly.t + 0.045);
        camera.position.lerp(fly.pos, 0.18);
        controls.target.lerp(fly.target, 0.18);
        if (fly.t >= 1) fly = null;
      }
      for (const m of zoneMeshes[selected] ?? []) (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.22 + Math.sin(pulse) * 0.12;
      controls.update();
      if (needle.current) needle.current.style.transform = `rotate(${THREE.MathUtils.radToDeg(controls.getAzimuthalAngle())}deg)`;
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
      renderer.domElement.remove();
      labels.domElement.remove();
      api.current = null;
    };
  }, []);

  useEffect(() => { api.current?.highlight(active); }, [active]);
  useEffect(() => { api.current?.markers(friendsByZone, selfZone); }, [friendsByZone, selfZone]);

  return (
    <div className="map3d" ref={host} role="img" aria-label="Mapa 3D ilustrativo del campus Cumbayá. Arrastra para girar; toca un edificio para elegir su zona.">
      <div className="map3d-compass" title="El norte (Av. Pampite) está hacia donde apunta la N" aria-hidden="true">
        <div ref={needle}><span>N</span><Compass size={18} /></div>
      </div>
      <div className="map3d-controls">
        <button onClick={() => api.current?.zoom(0.75)} aria-label="Acercar"><Plus size={16} /></button>
        <button onClick={() => api.current?.zoom(1.3)} aria-label="Alejar"><Minus size={16} /></button>
        <button onClick={() => api.current?.topDown()} aria-label="Vista desde arriba"><ScanEye size={16} /></button>
        <button onClick={() => { api.current?.reset(); setHint(false); }} aria-label="Volver a la vista inicial"><RotateCcw size={16} /></button>
      </div>
      {hint && <div className="map3d-hint">Arrastra para girar · pellizca o usa + / − · toca un edificio</div>}
    </div>
  );
}
