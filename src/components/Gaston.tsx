import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Volume2, VolumeX, X } from 'lucide-react';
import { playMascotSound, primeAudio } from '../lib/gastonSounds';
import { useMascot, type MascotMood } from '../lib/mascot';

/**
 * Gastón, the app's mini-pig mascot: a stylised low-poly figure built from primitives in this file (no external model),
 * inspired by the reference photo of Gastón (pale pink, dark patches around the eyes and snout rim, red scarf).
 * He idles (breathes, blinks, wags his tail), follows the pointer with his head, and reacts to app events.
 */
const PINK = '#F7D6D2', PINK_DARK = '#F0AEB4', PATCH = '#A7ABB6', RIM = '#D9939C', RED = '#E11B22';

const toon = (color: string) => new THREE.MeshToonMaterial({ color });

function buildPig() {
  const pig = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), toon(PINK));
  body.scale.set(1, 0.82, 1.08);
  body.position.y = 0.6;
  pig.add(body);

  const legs: THREE.Mesh[] = [];
  for (const [x, z] of [[-0.3, 0.32], [0.3, 0.32], [-0.3, -0.3], [0.3, -0.3]]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.16, 6, 12), toon(PINK));
    leg.position.set(x, 0.2, z);
    const hoof = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(PINK_DARK));
    hoof.position.y = -0.13;
    leg.add(hoof);
    legs.push(leg);
    pig.add(leg);
  }

  // Curly tail: three quarters of a small torus.
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 8, 24, Math.PI * 1.6), toon(PINK_DARK));
  tail.position.set(0, 0.78, -0.66);
  pig.add(tail);

  // Scarf with a pompom.
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 12, 32), toon(RED));
  scarf.rotation.x = Math.PI / 2.3;
  scarf.position.set(0, 0.9, 0.28);
  pig.add(scarf);
  const tailEnd = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.22, 4, 8), toon(RED));
  tailEnd.position.set(0.12, 0.7, 0.66);
  tailEnd.rotation.z = 0.3;
  pig.add(tailEnd);
  const pompom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 1), toon('#FFFFFF'));
  pompom.position.set(0.17, 0.53, 0.7);
  pig.add(pompom);

  // Head (big, chibi proportions) on a pivot so it can look around.
  const head = new THREE.Group();
  head.position.set(0, 1.12, 0.42);
  pig.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 24), toon(PINK));
  skull.scale.set(1.05, 0.95, 0.95);
  head.add(skull);

  const patch = (x: number, s: number) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 16, 12), toon(PATCH));
    p.scale.set(1.1, 0.85, 0.35);
    p.position.set(x, 0.1, 0.43);
    p.lookAt(x * 2.2, 0.15, 2);
    head.add(p);
  };
  patch(-0.21, 1.1); // Gastón's bigger patch is over his left eye
  patch(0.21, 0.72);

  const eyes: THREE.Group[] = [];
  for (const x of [-0.2, 0.2]) {
    const eye = new THREE.Group();
    eye.position.set(x, 0.1, 0.47);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshBasicMaterial({ color: '#15171C' }));
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }));
    shine.position.set(0.035, 0.04, 0.08);
    eye.add(ball, shine);
    head.add(eye);
    eyes.push(eye);
  }

  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.15, 32), toon(PINK_DARK));
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.1, 0.5);
  head.add(snout);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.172, 0.02, 8, 32), toon(RIM));
  rim.position.set(0, -0.1, 0.585);
  head.add(rim);
  for (const x of [-0.07, 0.07]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: '#8E4A55' }));
    nostril.scale.set(0.8, 1.2, 0.4);
    nostril.position.set(x * 0.85, -0.1, 0.58);
    head.add(nostril);
  }
  for (const x of [-0.36, 0.36]) {
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: '#FF8FA3', transparent: true, opacity: 0.55 }));
    blush.position.set(x, -0.08, 0.38);
    blush.lookAt(x * 3, -0.1, 2);
    head.add(blush);
  }

  const ears: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(0.3 * side, 0.4, 0.02);
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.32, 3), toon(PINK));
    outer.position.y = 0.14;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 3), toon(PINK_DARK));
    inner.position.set(0, 0.12, 0.04);
    ear.add(outer, inner);
    ear.rotation.z = -0.45 * side;
    head.add(ear);
    ears.push(ear);
  }
  return { pig, head, eyes, ears, tail, legs, body };
}

const LINES: Record<MascotMood, string[]> = {
  idle: ['¡Oink!', '¿Buscamos tiempo libre?', 'Tu horario es privado conmigo 🔒', '¡Hoy es buen día para un café!'],
  wave: ['¡Hola!'],
  happy: ['¡Yupi!'],
  sad: ['Oh…'],
  sleep: ['Zzz…'],
  curious: ['¿Mmm?'],
};

export default function Gaston() {
  const host = useRef<HTMLButtonElement>(null);
  const { mood, line, beat, hidden, muted, react, setHidden, setMuted } = useMascot();
  const [dismissed, setDismissed] = useState(0);
  const moodRef = useRef<{ mood: MascotMood; since: number }>({ mood: 'idle', since: 0 });
  // Speech bubble for each reaction; it hides itself after a few seconds.
  const bubble = beat > 0 && dismissed !== beat ? line ?? LINES[mood][beat % LINES[mood].length] : null;

  useEffect(() => {
    if (!beat) return;
    moodRef.current = { mood, since: performance.now() };
    if (!muted && !hidden) playMascotSound(mood);
    const t = setTimeout(() => setDismissed(beat), 2800);
    return () => clearTimeout(t);
  }, [beat, mood]); // eslint-disable-line react-hooks/exhaustive-deps -- sound plays once per reaction, not when muting

  // Falls asleep after a while without interaction; any input wakes him up.
  useEffect(() => {
    let timer = 0;
    const arm = () => {
      primeAudio();
      clearTimeout(timer);
      if (moodRef.current.mood === 'sleep') react('wave', '¡Ya desperté!');
      timer = window.setTimeout(() => react('sleep'), 45000);
    };
    arm();
    const events = ['pointerdown', 'keydown', 'scroll'] as const;
    events.forEach(e => addEventListener(e, arm, { passive: true }));
    return () => { clearTimeout(timer); events.forEach(e => removeEventListener(e, arm)); };
  }, [react]);

  useEffect(() => {
    if (hidden) return;
    const el = host.current!;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 1.25, 5);
    camera.lookAt(0, 0.8, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight('#FFFFFF', '#E8C9C9', 1.9));
    const key = new THREE.DirectionalLight('#FFFFFF', 1.6);
    key.position.set(2, 4, 4);
    scene.add(key);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.12 }));
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);

    const g = buildPig();
    g.pig.rotation.y = -0.35;
    scene.add(g.pig);

    const size = () => {
      const s = el.clientWidth;
      renderer.setSize(s, s);
    };
    size();

    // Head follows the pointer anywhere on the page.
    const look = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      look.x = THREE.MathUtils.clamp((e.clientX - (r.left + r.width / 2)) / 600, -0.6, 0.6);
      look.y = THREE.MathUtils.clamp((e.clientY - (r.top + r.height / 2)) / 600, -0.4, 0.4);
    };
    addEventListener('pointermove', onMove);

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let nextBlink = 2;
    let frame = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      const { mood: m, since } = moodRef.current;
      const age = (performance.now() - since) / 1000;
      if (m !== 'idle' && m !== 'sleep' && age > 2.6) moodRef.current = { mood: 'idle', since: performance.now() };

      // Idle base: breathing, tail wag, ear twitch.
      const breath = Math.sin(t * 2.2) * 0.02;
      g.body.scale.set(1 + breath, 0.82 - breath, 1.08 + breath);
      g.tail.rotation.z = Math.sin(t * 6) * 0.35;
      g.ears[0].rotation.x = Math.sin(t * 1.3) * 0.08;
      g.ears[1].rotation.x = Math.sin(t * 1.3 + 1) * 0.08;
      let y = 0, spin = -0.35, headTilt = 0, earDrop = 0, eyeOpen = 1;

      if (reduced) {
        // Keep gentle idle motion only.
      } else if (m === 'happy') {
        const hop = Math.abs(Math.sin(age * 7));
        y = hop * 0.35 * Math.max(0, 1 - age / 2.4);
        spin = -0.35 + Math.min(age / 0.8, 1) * Math.PI * 2;
        g.tail.rotation.z = Math.sin(t * 18) * 0.6;
      } else if (m === 'wave') {
        g.ears[0].rotation.z = -0.45 + Math.sin(age * 14) * 0.5;
        y = Math.abs(Math.sin(age * 5)) * 0.08;
      } else if (m === 'sad') {
        headTilt = 0.35; earDrop = 0.6; g.tail.rotation.z = 0;
      } else if (m === 'curious') {
        headTilt = -0.1; g.head.rotation.z = Math.sin(age * 3) * 0.25;
      } else if (m === 'sleep') {
        headTilt = 0.3; earDrop = 0.4; eyeOpen = 0.12;
        g.body.scale.y = 0.82 - Math.sin(t * 1.2) * 0.04;
      }

      if (m !== 'sleep' && t > nextBlink) {
        eyeOpen = 0.1;
        if (t > nextBlink + 0.12) nextBlink = t + 2.5 + Math.random() * 3;
      }
      g.eyes.forEach(e => { e.scale.y = THREE.MathUtils.lerp(e.scale.y, eyeOpen, 0.5); });
      g.ears[0].rotation.z = m === 'wave' ? g.ears[0].rotation.z : -0.45 - earDrop;
      g.ears[1].rotation.z = 0.45 + earDrop;
      g.pig.position.y = THREE.MathUtils.lerp(g.pig.position.y, y, 0.35);
      g.pig.rotation.y = THREE.MathUtils.lerp(g.pig.rotation.y, spin, 0.2);
      g.head.rotation.y = THREE.MathUtils.lerp(g.head.rotation.y, m === 'sleep' ? 0 : look.x, 0.1);
      g.head.rotation.x = THREE.MathUtils.lerp(g.head.rotation.x, (m === 'sleep' ? 0 : look.y) + headTilt, 0.1);
      if (m !== 'curious') g.head.rotation.z = THREE.MathUtils.lerp(g.head.rotation.z, 0, 0.1);
      shadow.scale.setScalar(1 - g.pig.position.y * 0.8);
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('pointermove', onMove);
      renderer.dispose();
      scene.traverse(o => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose?.();
        (mesh.material as THREE.Material | undefined)?.dispose?.();
      });
      el.innerHTML = '';
    };
  }, [hidden]);

  if (hidden) {
    return <button className="gaston-peek" onClick={() => { setHidden(false); react('wave', '¡Volví!'); }} aria-label="Mostrar a Gastón">🐷</button>;
  }
  return (
    <div className={'gaston' + (mood === 'sleep' ? ' asleep' : '')}>
      {bubble && <div className="gaston-bubble" role="status">{bubble}</div>}
      {mood === 'sleep' && <span className="gaston-zzz" aria-hidden="true">z<b>z</b><i>z</i></span>}
      <button className="gaston-stage" ref={host} onClick={() => react(mood === 'sleep' ? 'wave' : 'happy', mood === 'sleep' ? '¡Ya desperté!' : null)} aria-label="Gastón, la mascota. Tócalo para que salte." />
      <button className="gaston-close" onClick={() => setHidden(true)} aria-label="Ocultar a Gastón"><X size={12} /></button>
      <button className="gaston-close gaston-mute" onClick={() => setMuted(!muted)} aria-label={muted ? 'Activar sonidos de Gastón' : 'Silenciar a Gastón'} aria-pressed={muted}>{muted ? <VolumeX size={12} /> : <Volume2 size={12} />}</button>
    </div>
  );
}
