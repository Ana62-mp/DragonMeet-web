import { users } from '../store';

export const person = (id: string) => users.find(u => u.id === id)!;

export function Avatar({ id, size = 42 }: { id: string; size?: number }) {
  const u = person(id);
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: u.color + '18', color: u.color, borderColor: u.color + '28', fontSize: size * 0.31 }}
    >
      {u.initials}
    </span>
  );
}
