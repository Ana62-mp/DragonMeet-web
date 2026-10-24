/** Deterministic fixture for the "schedule photo" demo: the image itself is never analysed. */
export type ImportRow = { title: string; code: string; day: number; startMin: number; endMin: number; building: string; room: string };

export const DEMO_IMPORT_ROWS: ImportRow[] = [
  { title: 'Estructuras de Datos', code: 'CMP-210', day: 1, startMin: 14 * 60, endMin: 15 * 60 + 30, building: 'Da Vinci', room: 'DV-110' },
  { title: 'Estadística I', code: 'MAT-2201', day: 2, startMin: 10 * 60 + 10, endMin: 11 * 60 + 40, building: 'Newton', room: 'N-105' },
  { title: 'Ética Profesional', code: 'FIL-150', day: 3, startMin: 16 * 60, endMin: 17 * 60 + 30, building: 'Sócrates', room: 'S-201' },
  { title: 'Inglés Avanzado', code: 'ENG-300', day: 4, startMin: 15 * 60, endMin: 16 * 60 + 30, building: 'Maxwell', room: 'M-102' },
];
