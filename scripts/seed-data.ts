/** Single source of truth for the prototype's accounts, schedules and relationships.
 * Used by scripts/seed-users.ts (Auth accounts) and scripts/build-seed-sql.ts (supabase/seed.sql).
 * Banner codes in the 0099xxxx range are fictitious placeholders; replace them with real ones if needed.
 */
export type SeedPerson = {
  key: string;
  fullName: string;
  firstName: string;
  email: string;
  banner: string;
  career: string;
  semester: number;
  color: string;
  passwordEnv: 'SEED_PASSWORD_ANA' | 'SEED_PASSWORD_VALE' | 'SEED_PASSWORD_PAULO' | 'SEED_PASSWORD_FILLER';
};
export type SeedBlock = { key: string; code: string; name: string; day: number; start: string; end: string; building: string; room: string };

const main: Omit<SeedPerson, 'banner'>[] = [
  { key: 'ana', fullName: 'Ana Paula Moposita Plaza', firstName: 'Ana', email: 'pmoposita@estud.usfq.edu.ec', career: 'Ciencias de la Computación', semester: 1, color: '#E11B22', passwordEnv: 'SEED_PASSWORD_ANA' },
  { key: 'vale', fullName: 'Valentina Paredes Torres', firstName: 'Valentina', email: 'jvparedes@estud.usfq.edu.ec', career: 'Ciencias de la Computación', semester: 1, color: '#8B5CF6', passwordEnv: 'SEED_PASSWORD_VALE' },
  { key: 'paulo', fullName: 'Paulo Pérez', firstName: 'Paulo', email: 'pperez@estud.usfq.edu.ec', career: 'Ciencias de la Computación', semester: 4, color: '#3B82F6', passwordEnv: 'SEED_PASSWORD_PAULO' },
];

const fillers: [string, string, string, string, number, string][] = [
  ['camila', 'Camila Andrade', 'candrade', 'Arquitectura', 3, '#EC4899'],
  ['sebastian', 'Sebastián Játiva', 'sjativa', 'Administración', 5, '#F97316'],
  ['daniela', 'Daniela Cevallos', 'dcevallos', 'Medicina', 2, '#10B981'],
  ['joaquin', 'Joaquín Toapanta', 'jtoapanta', 'Ingeniería Industrial', 6, '#0EA5E9'],
  ['isabella', 'Isabella Ron', 'iron', 'Psicología', 4, '#A855F7'],
  ['martin', 'Martín Salazar', 'msalazar', 'Comunicación', 3, '#EAB308'],
  ['antonella', 'Antonella Vera', 'avera', 'Medicina', 1, '#14B8A6'],
  ['andres', 'Andrés Quishpe', 'aquishpe', 'Ingeniería Industrial', 2, '#F43F5E'],
  ['renata', 'Renata Espinosa', 'respinosa', 'Arquitectura', 7, '#6366F1'],
  ['nicolas', 'Nicolás Carrión', 'ncarrion', 'Administración', 1, '#84CC16'],
  ['emilia', 'Emilia Naranjo', 'enaranjo', 'Comunicación', 5, '#D946EF'],
  ['gabriel', 'Gabriel Arteaga', 'garteaga', 'Psicología', 2, '#06B6D4'],
  ['samantha', 'Samantha Yánez', 'syanez', 'Ingeniería Industrial', 4, '#FB923C'],
  ['david', 'David Cárdenas', 'dcardenas', 'Medicina', 3, '#22C55E'],
];

export const people: SeedPerson[] = [
  ...main.map((p, i) => ({ ...p, banner: `0099${String(i + 1).padStart(4, '0')}` })),
  ...fillers.map(([key, fullName, user, career, semester, color], i) => ({
    key, fullName, firstName: fullName.split(' ')[0], email: `${user}@estud.usfq.edu.ec`, banner: `0099${String(i + 4).padStart(4, '0')}`,
    career, semester, color, passwordEnv: 'SEED_PASSWORD_FILLER' as const,
  })),
];

const b = (key: string, code: string, name: string, day: number, start: string, end: string, building: string, room: string): SeedBlock =>
  ({ key, code, name, day, start, end, building, room });

const mainBlocks: SeedBlock[] = [
  b('ana', 'MAT-1201', 'Cálculo Diferencial', 1, '08:00', '09:30', 'Newton', 'N-201'), b('ana', 'CMP-101', 'Programación I', 1, '10:00', '11:30', 'Da Vinci', 'DV-105'),
  b('ana', 'MAT-2101', 'Álgebra Lineal', 2, '09:00', '10:30', 'Einstein', 'E-203'), b('ana', 'ECO-101', 'Microeconomía', 3, '08:00', '09:30', 'Galileo', 'G-102'),
  b('ana', 'ESP-100', 'Escritura Académica', 3, '14:00', '15:30', 'Sócrates', 'S-104'), b('ana', 'MAT-1201', 'Cálculo Diferencial', 4, '08:00', '09:30', 'Newton', 'N-201'),
  b('ana', 'CMP-101', 'Programación I', 5, '10:00', '11:30', 'Da Vinci', 'DV-105'),
  b('vale', 'CMP-101', 'Programación I', 1, '08:00', '09:30', 'Da Vinci', 'DV-105'), b('vale', 'MAT-2101', 'Álgebra Lineal', 1, '13:30', '15:00', 'Einstein', 'E-203'),
  b('vale', 'FIS-100', 'Física I', 2, '10:00', '12:00', 'Newton', 'N-103'), b('vale', 'CMP-230', 'Bases de Datos', 3, '09:00', '11:00', 'Da Vinci', 'DV-205'),
  b('vale', 'FIS-100', 'Física I', 4, '13:00', '15:00', 'Newton', 'N-103'), b('vale', 'CMP-101', 'Programación I', 5, '08:00', '09:30', 'Da Vinci', 'DV-105'),
  b('paulo', 'MAT-1201', 'Cálculo Diferencial', 1, '08:00', '10:00', 'Newton', 'N-201'), b('paulo', 'CMP-230', 'Bases de Datos', 1, '14:00', '16:00', 'Da Vinci', 'DV-205'),
  b('paulo', 'CMP-101', 'Programación I', 2, '08:00', '10:00', 'Da Vinci', 'DV-105'), b('paulo', 'FIS-100', 'Física I', 3, '11:00', '13:00', 'Newton', 'N-103'),
  b('paulo', 'MAT-2101', 'Álgebra Lineal', 4, '10:00', '12:00', 'Einstein', 'E-203'), b('paulo', 'FIS-100', 'Física I', 5, '13:00', '15:00', 'Newton', 'N-103'),
];

/** Per career: [code, name, building, room]. */
const catalog: Record<string, [string, string, string, string][]> = {
  'Arquitectura': [['ARQ-110', 'Taller de Diseño', 'Galileo', 'G-201'], ['ARQ-120', 'Dibujo', 'Galileo', 'G-103'], ['ARQ-130', 'Historia del Arte', 'Miguel de Santiago', 'MS-202']],
  'Administración': [['ADM-100', 'Contabilidad', 'Einstein', 'E-101'], ['ADM-201', 'Marketing', 'Aristóteles', 'A-101'], ['ECO-101', 'Economía', 'Galileo', 'G-101']],
  'Medicina': [['MED-110', 'Anatomía', 'Darwin', 'D-101'], ['MED-120', 'Biología Celular', 'Darwin', 'D-204'], ['QUI-100', 'Química General', 'Maxwell', 'M-102']],
  'Ingeniería Industrial': [['IND-110', 'Procesos de Manufactura', 'Maxwell', 'M-201'], ['MAT-1201', 'Cálculo Diferencial', 'Newton', 'N-201'], ['FIS-100', 'Física I', 'Newton', 'N-103']],
  'Psicología': [['PSI-100', 'Psicología General', 'Sócrates', 'S-101'], ['PSI-210', 'Desarrollo Humano', 'Lao Tse', 'LT-102'], ['EST-100', 'Estadística', 'Lao Tse', 'LT-201']],
  'Comunicación': [['COM-100', 'Teoría de la Comunicación', 'Mozart', 'MZ-101'], ['COM-220', 'Producción Audiovisual', 'Mozart', 'MZ-203'], ['LIT-110', 'Redacción', 'Epicuro', 'EP-102']],
};

/** [course index, day, start, end] per filler; times are staggered so Match shows green, yellow and red blocks. */
const fillerSlots: Record<string, [number, number, string, string][]> = {
  camila: [[0, 1, '09:00', '12:00'], [1, 3, '10:00', '12:00'], [2, 4, '13:00', '15:00'], [0, 5, '08:00', '11:00']],
  sebastian: [[0, 1, '10:00', '12:00'], [1, 2, '11:00', '13:00'], [2, 4, '08:00', '10:00'], [1, 5, '14:00', '16:00']],
  daniela: [[0, 1, '08:00', '10:00'], [1, 2, '13:00', '15:00'], [2, 3, '10:00', '12:00'], [0, 5, '09:00', '11:00']],
  joaquin: [[1, 1, '08:00', '09:30'], [2, 2, '10:00', '12:00'], [0, 4, '13:00', '15:00'], [1, 5, '08:00', '09:30']],
  isabella: [[0, 1, '11:00', '13:00'], [1, 3, '08:00', '10:00'], [2, 4, '11:00', '13:00'], [0, 5, '15:00', '17:00']],
  martin: [[0, 2, '08:00', '10:00'], [1, 3, '13:00', '16:00'], [2, 4, '09:00', '11:00'], [1, 5, '10:00', '12:00']],
  antonella: [[0, 1, '09:30', '11:30'], [1, 2, '09:30', '11:30'], [2, 4, '14:00', '16:00'], [0, 5, '13:00', '15:00']],
  andres: [[1, 1, '13:30', '15:00'], [2, 3, '09:00', '11:00'], [0, 4, '08:00', '10:00'], [2, 5, '10:00', '12:00']],
  renata: [[0, 2, '10:00', '13:00'], [1, 3, '14:00', '16:00'], [2, 5, '09:00', '11:00'], [0, 4, '09:00', '12:00']],
  nicolas: [[0, 1, '08:00', '10:00'], [1, 2, '14:00', '16:00'], [2, 3, '11:00', '13:00'], [0, 5, '10:00', '12:00']],
  emilia: [[0, 1, '15:00', '17:00'], [1, 3, '09:00', '11:00'], [2, 4, '10:00', '12:00'], [1, 5, '13:00', '15:00']],
  gabriel: [[0, 2, '08:30', '10:00'], [1, 3, '10:30', '12:00'], [2, 4, '15:00', '17:00'], [0, 5, '08:00', '09:30']],
  samantha: [[0, 1, '10:00', '12:00'], [1, 2, '08:00', '10:00'], [2, 4, '13:00', '15:00'], [1, 5, '14:00', '16:00']],
  david: [[0, 1, '08:00', '11:00'], [1, 3, '08:00', '10:00'], [2, 4, '11:00', '13:00'], [0, 5, '14:00', '16:00']],
};

export const schedules: SeedBlock[] = [
  ...mainBlocks,
  ...people.filter(p => fillerSlots[p.key]).flatMap(p =>
    fillerSlots[p.key].map(([course, day, start, end]) => {
      const [code, name, building, room] = catalog[p.career][course];
      return b(p.key, code, name, day, start, end, building, room);
    })),
];

/** [requester, addressee, status] */
export const friendships: [string, string, 'accepted' | 'pending'][] = [
  ['ana', 'vale', 'accepted'], ['ana', 'paulo', 'accepted'], ['vale', 'paulo', 'pending'],
  ['ana', 'camila', 'accepted'], ['daniela', 'ana', 'accepted'], ['ana', 'isabella', 'accepted'],
  ['sebastian', 'ana', 'pending'], ['emilia', 'ana', 'pending'],
  ['camila', 'renata', 'accepted'], ['vale', 'martin', 'accepted'], ['paulo', 'joaquin', 'accepted'],
];

/** [owner, friend, share_schedule, share_location] — directional; omitted pairs share nothing. */
export const permissions: [string, string, boolean, boolean][] = [
  ['ana', 'vale', true, true], ['vale', 'ana', true, true],
  ['ana', 'paulo', true, true], ['paulo', 'ana', true, true],
  ['ana', 'camila', true, true], ['camila', 'ana', true, true],
  ['ana', 'daniela', true, false], ['daniela', 'ana', true, false],
  ['ana', 'isabella', false, false], ['isabella', 'ana', true, true],
  ['vale', 'martin', true, true], ['martin', 'vale', true, true],
  ['paulo', 'joaquin', true, true], ['joaquin', 'paulo', true, true],
];

/** Privacy flags and manual presence set after the accounts exist. */
export const profileState: Record<string, { schedule: boolean; location: boolean; disclosure?: 'BUSY_ONLY'; zone?: string }> = {
  ana: { schedule: true, location: true, zone: 'cuadrangulos' },
  vale: { schedule: true, location: true, zone: 'biblioteca' },
  paulo: { schedule: true, location: true, zone: 'da-vinci' },
  camila: { schedule: true, location: true, disclosure: 'BUSY_ONLY', zone: 'galileo' },
  daniela: { schedule: true, location: false },
  isabella: { schedule: false, location: false },
  martin: { schedule: true, location: true, zone: 'plaza-academica' },
  joaquin: { schedule: true, location: true },
};
