import { useEffect, useRef } from 'react';

/** Calls `onEscape` when the Escape key is pressed while `active` (closes menus and modals from the keyboard). */
export function useEscape(onEscape: () => void, active = true) {
  const handler = useRef(onEscape);
  useEffect(() => { handler.current = onEscape; });
  useEffect(() => {
    if (!active) return;
    const listener = (e: KeyboardEvent) => { if (e.key === 'Escape') handler.current(); };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [active]);
}
