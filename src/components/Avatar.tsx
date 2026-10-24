import { useApp } from '../store';
import type { Person } from '../types';

/** Two letters: first name + last surname ("Ana Paula Moposita Plaza" -> "AP"). */
export const initialsOf = (person: Pick<Person, 'fullName' | 'firstName'>) => {
  const words = person.fullName.trim().split(/\s+/);
  return ((person.firstName[0] ?? '?') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
};

export function PersonAvatar({ person, size = 42 }: { person: Person | undefined; size?: number }) {
  const color = person?.color ?? '#9CA3AF';
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: color + '18', color, borderColor: color + '28', fontSize: size * 0.31 }}
    >
      {person ? initialsOf(person) : '?'}
    </span>
  );
}

export const usePerson = (id: string) => useApp(s => s.people[id]);

/** Avatar for someone already known to the app (me, a friend or a request). */
export function Avatar({ id, size = 42 }: { id: string; size?: number }) {
  return <PersonAvatar person={usePerson(id)} size={size} />;
}

export const nameOf = (person: Person | undefined) => person?.firstName ?? 'Estudiante';
