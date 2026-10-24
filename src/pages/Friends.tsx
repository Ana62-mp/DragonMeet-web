import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Plus, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import { PersonAvatar } from '../components/Avatar';
import { Badge, Button, EmptyState, Heading, Segmented, Skeleton } from '../components/ui';
import { useDebounce } from '../hooks/useDebounce';
import { useFriends, type RequestRow } from '../hooks/useFriends';
import { searchUsers } from '../services/profiles';
import { toast } from '../lib/toast';
import type { Person } from '../types';

type Tab = 'friends' | 'search' | 'requests';

const describe = (p: Person) => `${p.career} · ${p.semester}.º semestre`;

function Pills({ schedule, location }: { schedule: boolean; location: boolean }) {
  return (
    <div className="permission-pills">
      <Badge tone={schedule ? 'green' : 'neutral'}>{schedule ? 'Horario visible' : 'Horario privado'}</Badge>
      <Badge tone={location ? 'green' : 'neutral'}>{location ? 'Zona visible' : 'Zona privada'}</Badge>
    </div>
  );
}

function SearchTab() {
  const { relationTo, findFriendship, sendRequest, respondRequest } = useFriends();
  const [term, setTerm] = useState('');
  const query = useDebounce(term.trim(), 300);
  const [found, setFound] = useState<{ query: string; rows: Person[] }>({ query: '', rows: [] });
  const searching = query.length >= 2;
  const loading = searching && found.query !== query;
  const results = searching && !loading ? found.rows : [];

  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    searchUsers(query)
      .then(rows => { if (!cancelled) setFound({ query, rows }); })
      .catch(error => {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : 'No se pudo buscar.');
        setFound({ query, rows: [] });
      });
    return () => { cancelled = true; };
  }, [query, searching]);

  return (
    <div className="panel">
      <div className="searchbox">
        <Search size={19} />
        <input value={term} onChange={e => setTerm(e.target.value)} placeholder="Nombre, código Banner o correo" aria-label="Buscar estudiantes" />
      </div>
      <div className="person-list">
        {loading && <Skeleton height={56} />}
        {!loading && query.length >= 2 && results.length === 0 && <EmptyState icon={<Search size={26} />} title="Sin resultados" text="Prueba con otro nombre, código o correo." />}
        {!loading && query.length < 2 && <p className="muted small">Escribe al menos 2 caracteres. No distinguimos mayúsculas ni tildes.</p>}
        {!loading && results.map(p => {
          const relation = relationTo(p.id);
          const friendship = findFriendship(p.id);
          return (
            <div className="person-row" key={p.id}>
              <PersonAvatar person={p} />
              <div className="person-info">
                <b className="truncate">{p.fullName}</b>
                <small>{describe(p)}</small>
                <small>Banner {p.bannerCode}</small>
              </div>
              {relation === 'friend' && <Badge tone="green">Amigos</Badge>}
              {relation === 'sent' && <Badge tone="gold">Pendiente</Badge>}
              {relation === 'received' && friendship && (
                <button className="smallbutton primary" onClick={() => respondRequest(friendship.id, true)}><Check size={14} /> Aceptar</button>
              )}
              {relation === 'none' && (
                <button className="smallbutton primary" onClick={() => sendRequest(p.id)}><Plus size={15} /> Agregar</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RequestList({ title, rows, children }: { title: string; rows: RequestRow[]; children: (row: RequestRow) => React.ReactNode }) {
  if (!rows.length) return null;
  return (
    <>
      <h3 className="list-title">{title}</h3>
      {rows.map(row => (
        <div className="person-row" key={row.friendship.id}>
          <PersonAvatar person={row.person} size={44} />
          <div className="person-info">
            <b className="truncate">{row.person?.fullName ?? 'Estudiante'}</b>
            {row.person && <small>{describe(row.person)}</small>}
          </div>
          {children(row)}
        </div>
      ))}
    </>
  );
}

export function Friends() {
  const { friends, received, sent, accessOf, respondRequest, removeFriend } = useFriends();
  const [tab, setTab] = useState<Tab>('friends');

  return (
    <>
      <Heading
        eyebrow="TU COMUNIDAD"
        title="Mis amigos"
        desc="Los mejores momentos empiezan con una conexión."
        action={<Badge tone="purple"><Users size={14} /> {friends.length}</Badge>}
      />
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { id: 'friends', label: 'Amigos' },
          { id: 'search', label: 'Buscar' },
          { id: 'requests', label: 'Solicitudes', badge: received.length },
        ]}
      />
      {tab === 'friends' && (
        <div className="panel">
          {friends.length ? friends.map(p => (
            <div className="person-row" key={p.id}>
              <PersonAvatar person={p} size={46} />
              <div className="person-info">
                <b className="truncate">{p.fullName}</b>
                <small>{describe(p)}</small>
                <Pills {...accessOf(p.id)} />
              </div>
              <button
                className="iconbutton danger"
                aria-label={`Eliminar a ${p.firstName}`}
                onClick={() => { if (confirm(`¿Eliminar la amistad con ${p.firstName}? Se revocarán los permisos en ambos sentidos.`)) removeFriend(p.id); }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          )) : (
            <EmptyState icon={<UserPlus size={28} />} title="Aún no tienes amigos" text="Busca compañeros por nombre, código o correo." action={<Button onClick={() => setTab('search')}>Buscar estudiantes</Button>} />
          )}
          <div className="tip slim">
            <CheckCircle2 size={20} />
            <div><b>Conexiones seguras</b><p>Agregar un amigo no comparte nada: tú decides en Perfil &gt; Amigos.</p></div>
          </div>
        </div>
      )}
      {tab === 'search' && <SearchTab />}
      {tab === 'requests' && (
        <div className="panel">
          <RequestList title="Recibidas" rows={received}>
            {({ friendship }) => (
              <div className="request-actions compact">
                <button className="smallbutton primary" onClick={() => respondRequest(friendship.id, true)}><Check size={14} /> Aceptar</button>
                <button className="smallbutton" onClick={() => respondRequest(friendship.id, false)}><X size={14} /> Rechazar</button>
              </div>
            )}
          </RequestList>
          <RequestList title="Enviadas" rows={sent}>
            {({ friendship }) => {
              const other = friendship.addressee;
              return <button className="smallbutton" onClick={() => removeFriend(other)}>Cancelar</button>;
            }}
          </RequestList>
          {!received.length && !sent.length && (
            <EmptyState title="¡Todo al día!" text="No tienes solicitudes pendientes." />
          )}
        </div>
      )}
    </>
  );
}
