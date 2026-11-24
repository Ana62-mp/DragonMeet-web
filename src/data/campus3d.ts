/**
 * Layout for the 3D Dragon Map.
 *
 * Positions were traced as pixel coordinates on Google Maps satellite imagery of the Cumbayá campus (© 2026 Airbus,
 * Maxar Technologies; viewed at ~600 m) and cross-checked with the illustrated campus map from Noticias USFQ (2012,
 * "Ubícate en la USFQ"). Heights, colours and roofs follow public photos of the campus. It is a stylised model:
 * not georeferenced, not to exact scale and not an official plan. Locations marked `approx` could not be confirmed.
 *
 * Pixel → scene units: x = (px - 690) / 12, z = (py - 530) / 12 (north is -z, like the map).
 */
export type Roof = 'gable' | 'flat' | 'pyramid' | 'dome' | 'pagoda';
export type Block = { px: number; py: number; w: number; d: number; h: number; wall: string; roof: string; roofType: Roof; rot?: number };
export type ZoneModel = { blocks: Block[]; open?: { px: number; py: number; r: number; color: string; kind: 'garden' | 'plaza' | 'lawn' }; approx?: boolean };

export const toScene = (px: number, py: number): [number, number] => [(px - 690) / 12, (py - 530) / 12];

const PINK = '#E9B8A8', CREAM = '#F1E4CF', TERRACOTTA = '#B5603E', TEAL = '#5E8C86', BROWN = '#7A4A32', ORANGE = '#E0844F', LILAC = '#C9A3C4';

/** The 13 zones the app already uses (src/data/campus.ts). */
export const ZONES_3D: Record<string, ZoneModel> = {
  'hall-espejo': { blocks: [{ px: 640, py: 400, w: 9.5, d: 8.5, h: 3.4, wall: PINK, roof: TERRACOTTA, roofType: 'gable', rot: -0.3 }] },
  biblioteca: { blocks: [{ px: 598, py: 458, w: 5.8, d: 4.2, h: 3, wall: CREAM, roof: BROWN, roofType: 'gable', rot: -0.3 }] },
  einstein: { blocks: [{ px: 646, py: 468, w: 3, d: 3, h: 3.2, wall: CREAM, roof: TEAL, roofType: 'pyramid' }] },
  galileo: { blocks: [{ px: 672, py: 518, w: 6.6, d: 5, h: 4, wall: PINK, roof: TERRACOTTA, roofType: 'gable', rot: -0.3 }] },
  darwin: { blocks: [{ px: 742, py: 470, w: 5, d: 3.6, h: 3.2, wall: LILAC, roof: TEAL, roofType: 'gable', rot: -0.3 }] },
  'da-vinci': { blocks: [{ px: 762, py: 388, w: 6.4, d: 6.8, h: 3.6, wall: ORANGE, roof: '#4C5560', roofType: 'flat', rot: -0.3 }] },
  newton: { blocks: [{ px: 745, py: 525, w: 4, d: 3.4, h: 3.6, wall: PINK, roof: TERRACOTTA, roofType: 'gable', rot: -0.3 }] },
  maxwell: { blocks: [
    { px: 815, py: 472, w: 7, d: 3, h: 3, wall: '#F4F1EA', roof: TEAL, roofType: 'gable', rot: -0.3 },
    { px: 862, py: 452, w: 2.6, d: 2.6, h: 4, wall: '#F4F1EA', roof: '#D4A53C', roofType: 'dome' },
  ] },
  epicuro: { blocks: [{ px: 585, py: 345, w: 3, d: 3, h: 5.5, wall: CREAM, roof: '#9AA3AD', roofType: 'flat' }] },
  hayek: { approx: true, blocks: [{ px: 880, py: 410, w: 5, d: 3.6, h: 4, wall: '#C9CED6', roof: '#7D8590', roofType: 'flat', rot: -0.3 }] },
  'plaza-academica': { blocks: [], open: { px: 700, py: 440, r: 2.3, color: '#E7DCC8', kind: 'garden' } },
  'plaza-maxwell': { blocks: [], open: { px: 838, py: 505, r: 1.8, color: '#E7DCC8', kind: 'plaza' } },
  cuadrangulos: { blocks: [], open: { px: 598, py: 556, r: 3.4, color: '#9CCB86', kind: 'lawn' } },
};

/** Context buildings (not selectable) with their names shown small. */
export const CONTEXT_3D: (Block & { name?: string })[] = [
  { name: 'Miguel de Santiago', px: 512, py: 615, w: 4.2, d: 3.6, h: 6, wall: '#6FA3A6', roof: '#3E6F73', roofType: 'flat', rot: -0.3 },
  { name: 'Aristóteles', px: 468, py: 700, w: 4, d: 3, h: 2, wall: CREAM, roof: TERRACOTTA, roofType: 'gable', rot: -0.3 },
  { name: 'Sócrates', px: 522, py: 742, w: 4, d: 3, h: 2, wall: CREAM, roof: TERRACOTTA, roofType: 'gable', rot: -0.3 },
  { name: 'Mozart', px: 566, py: 668, w: 3, d: 2.4, h: 1.8, wall: CREAM, roof: TERRACOTTA, roofType: 'gable', rot: -0.3 },
  { name: 'Coliseo Alexandros', px: 706, py: 690, w: 6, d: 5, h: 2.6, wall: CREAM, roof: TEAL, roofType: 'pyramid', rot: -0.3 },
  { name: 'Pagoda', px: 700, py: 630, w: 2, d: 2, h: 1.6, wall: '#B83A2E', roof: '#8C2A21', roofType: 'pagoda' },
  { name: 'Planta Física', px: 532, py: 500, w: 4, d: 3, h: 2.2, wall: '#D5D2CB', roof: '#8F969E', roofType: 'flat', rot: -0.3 },
  { name: 'IMC', px: 822, py: 396, w: 4, d: 3, h: 3, wall: CREAM, roof: TERRACOTTA, roofType: 'gable', rot: -0.3 },
  { name: 'Casa Tomate', px: 800, py: 532, w: 2.2, d: 2, h: 1.8, wall: '#C9472F', roof: BROWN, roofType: 'gable', rot: -0.3 },
  { px: 560, py: 420, w: 3, d: 2.6, h: 2.6, wall: PINK, roof: TERRACOTTA, roofType: 'gable', rot: -0.3 },
  { px: 700, py: 340, w: 4, d: 2.6, h: 2.8, wall: CREAM, roof: TERRACOTTA, roofType: 'gable', rot: -0.3 },
];

/** Landmarks from photos: obelisk, pond with waterfall and bridge, sports courts. */
export const LANDMARKS = {
  obelisk: { px: 650, py: 668, name: 'Obelisco' },
  pond: { px: 738, py: 585, rx: 3.2, rz: 2, name: 'Laguna y cascada' },
  tennis: { px: 595, py: 738, name: 'Canchas' },
  field: { px: 652, py: 762 },
};

/** Campus boundary, traced along Av. Pampite (N), Diego de Robles (W) and Francisco de Orellana (S). */
export const BOUNDARY: [number, number][] = [
  [585, 300], [700, 330], [890, 392], [905, 470], [862, 560], [822, 660], [790, 760], [700, 800], [470, 772], [425, 705], [455, 620], [520, 470],
];

export const STREETS: { name: string; path: [number, number][]; width: number }[] = [
  { name: 'Av. Pampite', path: [[430, 180], [585, 280], [700, 312], [900, 372], [1000, 420]], width: 2.2 },
  { name: 'Diego de Robles', path: [[600, 270], [520, 450], [440, 640], [405, 720]], width: 1.8 },
  { name: 'Francisco de Orellana', path: [[400, 740], [470, 790], [700, 822], [940, 960]], width: 2.2 },
];
