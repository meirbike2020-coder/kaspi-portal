'use client';

import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '@/lib/supabase';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabaseConfigured) {
    return (
      <div className="login panel">
        <h1>Kaspi <span>портал</span></h1>
        <p>База не подключена. Добавьте в Vercel переменные NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY и сделайте Redeploy.</p>
      </div>
    );
  }

  if (session === undefined) return <p className="wrap muted">Загрузка…</p>;

  if (!session) {
    const submit = async (e) => {
      e.preventDefault();
      setBusy(true);
      setError('');
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError('Неверная почта или пароль. Пользователей создаёт владелец в Supabase.');
      setBusy(false);
    };
    return (
      <form className="login panel" onSubmit={submit}>
        <h1>Kaspi <span>портал</span></h1>
        <label htmlFor="email">Почта<input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label htmlFor="password">Пароль<input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Входим…' : 'Войти'}</button>
      </form>
    );
  }

  return children(session);
}
