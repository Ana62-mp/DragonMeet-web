import { create } from 'zustand';

/** What Gastón can do. Each reaction plays once and then he goes back to idle. */
export type MascotMood = 'idle' | 'wave' | 'happy' | 'sad' | 'sleep' | 'curious';

type MascotState = {
  mood: MascotMood;
  line: string | null;
  /** Increments on every reaction so the same mood can replay. */
  beat: number;
  hidden: boolean;
  muted: boolean;
  react: (mood: MascotMood, line?: string | null) => void;
  setHidden: (hidden: boolean) => void;
  setMuted: (muted: boolean) => void;
};

const MUTE_KEY = 'dragonmeet:gaston-muted';
const readMuted = () => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; } };

export const useMascot = create<MascotState>(set => ({
  mood: 'idle',
  line: null,
  beat: 0,
  hidden: false,
  muted: readMuted(),
  react: (mood, line = null) => set(s => ({ mood, line, beat: s.beat + 1 })),
  setHidden: hidden => set({ hidden }),
  setMuted: muted => {
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* private mode: keep it for this session only */ }
    set({ muted });
  },
}));

/** Success messages from the store, translated into a reaction (and what Gastón says). */
const REACTIONS: [RegExp, MascotMood, string][] = [
  [/Invitación enviada/, 'happy', '¡Encuentro enviado! 🎉'],
  [/Invitación aceptada|Solicitud aceptada|Ya son amigos/, 'happy', '¡Qué bien! 💕'],
  [/Solicitud enviada/, 'wave', '¡Ojalá te acepte!'],
  [/rechazada|cancelado/i, 'sad', 'Oh… otra vez será'],
  [/Ubicación actualizada/, 'curious', '¡Te veo en el mapa!'],
  [/Clase (agregada|actualizada)|clases importadas/, 'happy', '¡Horario al día!'],
  [/se revocaron los permisos/, 'sad', 'Listo, ahora es privado 🔒'],
];

export function mascotForMessage(message: string) {
  const hit = REACTIONS.find(([re]) => re.test(message));
  if (hit) useMascot.getState().react(hit[1], hit[2]);
}

export const mascotOops = () => useMascot.getState().react('sad', 'Uy, algo salió mal');
