import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { buildChatContext } from '../lib/chatContext';
import { supabase } from '../lib/supabase';
import { useClock } from '../lib/useClock';
import { useApp } from '../store';
import './chat.css';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  '¿Cuál es mi próxima clase?',
  '¿Cuándo estoy libre con mis amigos?',
  '¿Quién está en el campus ahora?',
  '¿Cómo creo un encuentro?',
];

/** Negritas (**texto**) y saltos de línea, sin HTML crudo. */
function renderText(text: string): ReactNode {
  return text.split('\n').map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') && part.endsWith('**') ? <b key={j}>{part.slice(2, -2)}</b> : part)}
    </Fragment>
  ));
}

export function ChatBot() {
  const firstName = useApp(s => s.me?.firstName);
  const clock = useClock();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const history: Msg[] = [...msgs, { role: 'user', content: question }];
    setMsgs([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);

    const append = (chunk: string) =>
      setMsgs(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: next[next.length - 1].content + chunk };
        return next;
      });

    try {
      const { data } = await supabase.auth.getSession();
      const controller = new AbortController();
      abortRef.current = controller;
      const res = await fetch('/api/chat', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
        body: JSON.stringify({ messages: history, context: buildChatContext(useApp.getState(), clock) }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        append(err?.error ?? 'No pude responder ahora. Intenta de nuevo en un momento.');
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        append(decoder.decode(value, { stream: true }));
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') append('No hay conexión con el asistente.');
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function reset() {
    abortRef.current?.abort();
    setMsgs([]);
    setBusy(false);
  }

  const last = msgs[msgs.length - 1];
  const waiting = busy && last?.role === 'assistant' && last.content === '';

  return (
    <>
      <button
        className={'chat-fab' + (open ? ' is-open' : '')}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'}
        aria-expanded={open}
      >
        <span className="chat-fab-icon">{open ? <X size={22} /> : '✦'}</span>
      </button>

      {open && (
        <section className="chat-panel" role="dialog" aria-label="Asistente DragonMeet">
          <header className="chat-head">
            <div className="chat-avatar">✦</div>
            <div className="chat-title">
              <b>Dragón</b>
              <small>Asistente de DragonMeet</small>
            </div>
            {msgs.length > 0 && (
              <button className="iconbutton" onClick={reset} aria-label="Nueva conversación"><RotateCcw size={17} /></button>
            )}
            <button className="iconbutton" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={19} /></button>
          </header>

          <div className="chat-body" ref={listRef} aria-live="polite">
            {msgs.length === 0 ? (
              <div className="chat-welcome">
                <Sparkles size={26} />
                <h3>Hola{firstName ? `, ${firstName}` : ''}</h3>
                <p>Pregúntame por tu horario, tus amigos o cuándo pueden verse. Solo uso lo que ya puedes ver en la app.</p>
                <div className="chat-suggestions">
                  {SUGGESTIONS.map(s => <button key={s} onClick={() => send(s)}>{s}</button>)}
                </div>
              </div>
            ) : (
              msgs.map((m, i) => (
                <div key={i} className={'chat-msg ' + m.role}>
                  {m.role === 'assistant' && m.content === '' && waiting
                    ? <span className="chat-typing" aria-label="Escribiendo"><i /><i /><i /></span>
                    : renderText(m.content)}
                </div>
              ))
            )}
          </div>

          <form className="chat-input" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe tu pregunta…"
              maxLength={1500}
              aria-label="Mensaje"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Enviar"><Send size={17} /></button>
          </form>
        </section>
      )}
    </>
  );
}
