import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../store/auth';

export default function Login() {
  const [email, setEmail]       = useState('esmeralda@aliado.com');
  const [password, setPassword] = useState('aliado123');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { setUser }             = useAuth();
  const navigate                = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await authApi.signIn(email, password);
      setUser(user);
      navigate(user.role === 'kam' ? '/kam' : '/');
    } catch {
      setError('Credenciales incorrectas. Verifica tu correo y clave.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (role: 'aliado' | 'kam') => {
    const creds = role === 'aliado'
      ? { email: 'esmeralda@aliado.com', password: 'aliado123' }
      : { email: 'andres.m@dmario.com', password: 'kam123' };
    setEmail(creds.email);
    setPassword(creds.password);
    setError('');
    setLoading(true);
    try {
      const { user } = await authApi.signIn(creds.email, creds.password);
      setUser(user);
      navigate(user.role === 'kam' ? '/kam' : '/');
    } catch {
      setError('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-dark to-green px-4">
      <div className="w-full max-w-[400px] bg-ivory rounded-card px-[42px] py-[44px] shadow-lg">
        <div className="flex flex-col items-center mb-8">
          <img src="/dmario-logo.png" alt="D'MARIO" className="h-[52px] w-auto mb-4" />
          <p className="eyebrow-gold text-[11px] tracking-[0.26em]">Portal Mayoristas · Colombia</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-medium text-ink-soft mb-1.5">
              Correo electrónico
            </label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink-soft mb-1.5">
              Clave
            </label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-[12px] text-risk bg-risk-soft rounded-brand px-3 py-2">{error}</p>
          )}

          <button className="btn-primary w-full mt-1" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar al portal'}
          </button>
        </form>

        <button
          className="w-full mt-3 text-[13px] text-ink-mute hover:text-green transition-colors py-2"
          onClick={() => quickLogin('kam')}
          disabled={loading}
        >
          Soy vendedor D'MARIO →
        </button>

        <p className="text-center text-[11px] text-ink-mute mt-6">
          ¿Aún no eres aliado?{' '}
          <a href="mailto:mayoristas@dmario.com" className="text-green hover:underline">
            mayoristas@dmario.com
          </a>
        </p>
      </div>
    </div>
  );
}
