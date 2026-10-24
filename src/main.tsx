import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Brand, Layout } from './components/Layout';
import { Toaster } from './components/ui';
import { isSupabaseConfigured } from './lib/supabase';
import { CampusMap } from './pages/CampusMap';
import { Dashboard } from './pages/Dashboard';
import { Friends } from './pages/Friends';
import { Login } from './pages/Login';
import { Match } from './pages/Match';
import { Profile } from './pages/Profile';
import { Schedule } from './pages/Schedule';
import { useApp } from './store';
import './style.css';

function SetupNeeded() {
  return (
    <div className="login-right setup">
      <div className="login-card">
        <Brand />
        <h2>Falta conectar Supabase</h2>
        <p>
          Crea el archivo <code>.env.local</code> con <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> (mira
          <code> .env.example</code> y el README) y reinicia <code>npm run dev</code>.
        </p>
      </div>
    </div>
  );
}

function App() {
  const auth = useApp(s => s.auth);
  const init = useApp(s => s.init);
  useEffect(() => (isSupabaseConfigured ? init() : undefined), [init]);

  if (!isSupabaseConfigured) return <SetupNeeded />;
  if (auth === 'loading') return <div className="splash" role="status" aria-label="Cargando"><Brand /></div>;
  return (
    <BrowserRouter>
      {auth === 'signed-out' ? (
        <>
          <Routes><Route path="*" element={<Login />} /></Routes>
          <Toaster />
        </>
      ) : (
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/horarios" element={<Schedule />} />
            <Route path="/match" element={<Match />} />
            <Route path="/mapa" element={<CampusMap />} />
            <Route path="/amigos" element={<Friends />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
