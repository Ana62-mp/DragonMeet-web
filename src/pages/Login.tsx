import { useState } from 'react';
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Brand } from '../components/Layout';
import { Badge } from '../components/ui';
import { useApp } from '../store';

export function Login() {
  const signIn = useApp(s => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const problem = await signIn(email, password);
    if (problem) setError(problem);
    setBusy(false);
  }

  return (
    <div className="login">
      <div className="login-left">
        <Brand />
        <div className="login-copy">
          <Badge tone="light">🐉 HECHO PARA DRAGONES</Badge>
          <h1>Haz match con<br /><em>tu tiempo.</em></h1>
          <p>Las mejores conexiones nacen cuando encuentras un momento en común. Descubre cuándo coincides con tus amigos de la U.</p>
          <div className="feature"><span>01</span>Compara horarios sin complicaciones</div>
          <div className="feature"><span>02</span>Encuentra tiempo libre juntos</div>
          <div className="feature"><span>03</span>Conecta en el campus, con privacidad</div>
        </div>
        <small className="login-footer">Match your time. Find your people.</small>
      </div>
      <div className="login-right">
        <form className="login-card" onSubmit={submit}>
          <div className="welcome-icon">✦</div>
          <h2>¡Bienvenido a<br />DragonMeet!</h2>
          <p>Tu vida universitaria, mejor conectada.</p>
          <div className="form auth-form">
            <label>
              Correo institucional
              <input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@estud.usfq.edu.ec" />
            </label>
            <label>
              Contraseña
              <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn" disabled={busy}>
              {busy ? 'Entrando…' : <>Iniciar sesión <ArrowRight size={18} /></>}
            </button>
          </div>
          <div className="separator">O</div>
          <button type="button" className="microsoft" disabled title="Requiere autorización institucional">
            <span className="ms-grid">▦</span> Iniciar con Microsoft 365 <Badge tone="gold">Próximamente</Badge>
          </button>
          <div className="secure">
            <ShieldCheck size={19} /> Tu privacidad siempre está bajo tu control. <LockKeyhole size={14} />
          </div>
        </form>
      </div>
    </div>
  );
}
