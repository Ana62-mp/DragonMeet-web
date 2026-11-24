import { lazy, Suspense, useState } from 'react';
import { LockKeyhole, MapPin } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { CampusSvgMap } from '../components/CampusSvgMap';
import { Badge, Button, Heading, Segmented, Toggle } from '../components/ui';
import { CAMPUS_ZONES, zoneLabel } from '../data/campus.ts';
import { groupFriendsByZone, isPresenceFresh } from '../domain/availability.ts';
import { useFriends } from '../hooks/useFriends';
import { useClock } from '../lib/useClock';
import { useApp } from '../store';
import type { Person } from '../types';

// three.js only downloads when the 3D view is actually shown.
const CampusMap3D = lazy(() => import('../components/CampusMap3D'));

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function CampusMap() {
  const me = useApp(s => s.me)!;
  const people = useApp(s => s.people);
  const zones = useApp(s => s.zones);
  const setOnCampus = useApp(s => s.setOnCampus);
  const setZone = useApp(s => s.setZone);
  const { friendIds, accessOf } = useFriends();
  const clock = useClock();
  const [active, setActive] = useState('biblioteca');
  const [choice, setChoice] = useState<string | null>(null);
  const [view, setView] = useState<'3d' | '2d'>(() => (hasWebGL() ? '3d' : '2d'));

  const byZone = groupFriendsByZone(friendIds, Object.fromEntries(friendIds.map(id => [id, accessOf(id)])), zones, clock.ts);
  const friendsByZone = Object.fromEntries(
    Object.entries(byZone).map(([zone, ids]) => [zone, ids.map(id => people[id]).filter((p): p is Person => Boolean(p))]),
  );
  const mine = me.zone && me.zoneUpdatedAt ? { zone: me.zone, updatedAt: me.zoneUpdatedAt } : undefined;
  const hasFreshZone = me.onCampus && isPresenceFresh(mine, clock.ts);
  const zoneToConfirm = choice ?? me.zone ?? CAMPUS_ZONES[0].id;
  const activeZone = CAMPUS_ZONES.find(z => z.id === active)!;
  const hereNow = friendsByZone[active] ?? [];

  return (
    <>
      <Heading eyebrow="EXPLORA TU CAMPUS" title="Dragon Map" desc="Encuentra a tus amigos en las zonas del campus, siempre con su permiso." />
      <div className="map-layout">
        <div className="panel map-panel">
          <div className="panel-top">
            <h2>Campus Cumbayá</h2>
            <Segmented<'3d' | '2d'> value={view} onChange={setView} options={[{ id: '3d', label: '3D' }, { id: '2d', label: '2D' }]} />
          </div>
          {view === '3d' ? (
            <Suspense fallback={<div className="map3d map3d-loading">Cargando campus 3D…</div>}>
              <CampusMap3D active={active} selfZone={hasFreshZone ? me.zone : null} friendsByZone={friendsByZone} onSelect={setActive} />
            </Suspense>
          ) : (
            <div className="map-graphic">
              <CampusSvgMap active={active} selfZone={hasFreshZone ? me.zone : null} friendsByZone={friendsByZone} onSelect={setActive} />
            </div>
          )}
          <p className="subtle-note">
            <MapPin size={16} /> {view === '3d'
              ? 'Modelo ilustrativo basado en el mapa del campus de Noticias USFQ (2012) · arrastra para girar, toca un edificio'
              : 'Mapa ilustrativo de referencia'} · No es ubicación GPS ni plano oficial
          </p>
        </div>
        <div className="map-side">
          <section className="panel">
            <span className="eyebrow">TU PRESENCIA</span>
            <h2>¿Estás en campus?</h2>
            <Toggle value={me.onCampus} onChange={setOnCampus} label="Estoy en campus" desc="No activa por sí solo compartir tu zona" />
            {me.onCampus ? (
              <div className="form">
                <label>
                  ¿En qué zona estás?
                  <select value={zoneToConfirm} onChange={e => setChoice(e.target.value)}>
                    {CAMPUS_ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                  </select>
                </label>
                <Button onClick={() => setZone(zoneToConfirm)}>{me.zone ? 'Actualizar mi presencia' : 'Confirmar ubicación'}</Button>
                {me.zone && (
                  <div className="location-current">
                    <MapPin size={18} />
                    {hasFreshZone ? zoneLabel(me.zone) : 'Ubicación no actualizada'}
                  </div>
                )}
                <p className="muted small">
                  {me.shareLocation
                    ? 'Solo los contactos con consentimiento mutuo pueden ver tu zona.'
                    : 'Tu zona sigue privada: activa «Compartir mi zona» en Perfil > Privacidad.'}
                </p>
              </div>
            ) : (
              <p className="muted small">Con el interruptor apagado nadie ve tu zona y no cuentas como presente.</p>
            )}
          </section>
          <section className="panel">
            <span className="eyebrow">ZONA SELECCIONADA</span>
            <h2>{activeZone.label}</h2>
            <p className="muted">{activeZone.kind === 'BUILDING' ? 'Edificio del campus.' : 'Espacio de encuentro o paso.'}</p>
            <Button secondary onClick={() => { setChoice(null); setZone(active); }}>
              <MapPin size={16} /> Estoy aquí
            </Button>
            <div className="divider" />
            <h3>Amigos visibles aquí</h3>
            {hereNow.length ? hereNow.map(p => (
              <div className="person-row" key={p.id}>
                <Avatar id={p.id} />
                <b className="truncate">{p.firstName}</b>
                <Badge tone="green">Compartiendo zona</Badge>
              </div>
            )) : <p className="muted small">Ningún amigo ha compartido presencia en esta zona.</p>}
          </section>
          <div className="tip">
            <LockKeyhole size={21} />
            <div><b>Ubicación privada</b><p>No se recopilan coordenadas, rutas ni historial de movimientos.</p></div>
          </div>
        </div>
      </div>
    </>
  );
}
