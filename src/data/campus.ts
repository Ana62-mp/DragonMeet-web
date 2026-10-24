export type ZoneKind = 'BUILDING' | 'OPEN';
export type CampusZone = { id: string; label: string; kind: ZoneKind };

/** Academic buildings offered when creating a class (reference list, pending university validation). */
export const CLASS_BUILDINGS = [
  'Da Vinci', 'Newton', 'Einstein', 'Galileo', 'Darwin', 'Maxwell', 'Miguel de Santiago',
  'Aristóteles', 'Sócrates', 'Lao Tse', 'Mozart', 'Epicuro', 'Complejo Hayek',
] as const;

/** Places a student can report as their general area; includes open spaces that never host classes. */
export const CAMPUS_ZONES: CampusZone[] = [
  { id: 'da-vinci', label: 'Da Vinci', kind: 'BUILDING' },
  { id: 'newton', label: 'Newton', kind: 'BUILDING' },
  { id: 'einstein', label: 'Einstein', kind: 'BUILDING' },
  { id: 'galileo', label: 'Galileo', kind: 'BUILDING' },
  { id: 'darwin', label: 'Darwin', kind: 'BUILDING' },
  { id: 'maxwell', label: 'Maxwell', kind: 'BUILDING' },
  { id: 'epicuro', label: 'Epicuro', kind: 'BUILDING' },
  { id: 'hayek', label: 'Complejo Hayek', kind: 'BUILDING' },
  { id: 'biblioteca', label: 'Biblioteca Cicerón', kind: 'OPEN' },
  { id: 'hall-espejo', label: 'Hall Espejo', kind: 'OPEN' },
  { id: 'cuadrangulos', label: 'Cuadrángulos', kind: 'OPEN' },
  { id: 'plaza-maxwell', label: 'Plaza Maxwell', kind: 'OPEN' },
  { id: 'plaza-academica', label: 'Plaza Académica', kind: 'OPEN' },
];

/** How long a manual presence report stays valid before it is shown as outdated. */
export const PRESENCE_TTL_MS = 4 * 60 * 60 * 1000;

export const DEFAULT_BUILDING = 'Da Vinci';

export const zoneLabel = (id: string) => CAMPUS_ZONES.find(z => z.id === id)?.label ?? id;

/** Maps legacy or unknown building names onto a valid one without dropping the class. */
export const normalizeBuilding = (building: string) =>
  (CLASS_BUILDINGS as readonly string[]).includes(building) ? building : DEFAULT_BUILDING;
