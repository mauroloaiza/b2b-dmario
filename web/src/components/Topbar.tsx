import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useCart } from '../store/cart';
import { useClientStore } from '../store/clientStore';
import { authApi, clientsApi } from '../api/client';

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

export function Topbar() {
  const { user, setUser } = useAuth();
  const totalUnits  = useCart(s => s.totalUnits());
  const clientData  = useClientStore(s => s.client);
  const clientLoaded = useClientStore(s => s.loaded);
  const setClient   = useClientStore(s => s.set);
  const clearClient = useClientStore(s => s.clear);
  const location    = useLocation();
  const navigate    = useNavigate();
  const [search, setSearch] = useState('');
  const inputRef    = useRef<HTMLInputElement>(null);

  // Carga datos del cliente aliado una sola vez
  useEffect(() => {
    if (user?.role === 'aliado' && !clientLoaded) {
      clientsApi.me().then(setClient).catch(() => {});
    }
  }, [user, clientLoaded]);

  const logout = async () => {
    await authApi.signOut().catch(() => {});
    setUser(null);
    clearClient();
    navigate('/login');
  };

  const is    = (path: string)   => location.pathname === path;
  const starts = (path: string)  => location.pathname.startsWith(path);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/catalogo?q=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const creditPct = clientData
    ? Math.min((clientData.creditUsed / clientData.creditLimit) * 100, 100)
    : 0;

  const cop1M = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
    if (n >= 1_000)     return `$${Math.round(n / 1000)}k`;
    return `$${n}`;
  };

  return (
    <header className="topbar">
      <Link to={user?.role === 'kam' ? '/kam' : user?.role === 'admin' ? '/admin' : '/'} className="flex-shrink-0">
        <img src="/dmario-logo.png" alt="D'MARIO" className="tb-logo" />
      </Link>

      {/* ── Aliado nav ──────────────────────────────────────────────────── */}
      {user?.role === 'aliado' && (<>
        <nav className="tb-nav hidden md:flex">
          <Link to="/"         className={is('/')         ? 'tb-link-active' : 'tb-link'}>Inicio</Link>
          <Link to="/catalogo" className={starts('/catalogo') ? 'tb-link-active' : 'tb-link'}>Catálogo</Link>
          <Link to="/cuenta"   className={starts('/cuenta')   ? 'tb-link-active' : 'tb-link'}>Mi cuenta</Link>
        </nav>

        {/* Búsqueda */}
        <form onSubmit={submitSearch} className="flex-1 max-w-[280px] mx-3 hidden sm:flex">
          <div className="relative w-full">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar referencia o colección…"
              className="w-full bg-white/10 border border-white/20 rounded-brand px-3 py-1.5 text-[12px] text-ivory placeholder-ivory/40 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all"
            />
            {search && (
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-ivory/60 hover:text-ivory text-[11px]">↵</button>
            )}
          </div>
        </form>

        {/* Cupo indicador */}
        {clientData && (
          <div className="hidden lg:flex flex-col items-end gap-0.5 flex-shrink-0 mr-2">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-ivory/50 uppercase tracking-wide text-[9px] font-semibold">Cupo crédito</span>
              <span className="text-ivory font-semibold">{cop1M(clientData.creditAvailable)}</span>
              <span className="text-ivory/40">/</span>
              <span className="text-ivory/60">{cop1M(clientData.creditLimit)}</span>
            </div>
            <div className="w-28 h-1 rounded-full bg-white/20 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${creditPct >= 90 ? 'bg-error' : creditPct >= 70 ? 'bg-amber-400' : 'bg-ok'}`}
                style={{ width: `${creditPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Carrito */}
        <button
          onClick={() => navigate('/pedido')}
          className="relative flex-shrink-0 text-ivory/70 hover:text-ivory transition-colors"
        >
          <span className="text-[20px]">⊞</span>
          {totalUnits > 0 && (
            <span className="absolute -top-1 -right-1.5 bg-accent text-ivory text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
              {totalUnits}
            </span>
          )}
        </button>
      </>)}

      {/* ── KAM nav ─────────────────────────────────────────────────────── */}
      {user?.role === 'kam' && (
        <nav className="tb-nav">
          <Link to="/kam"            className={is('/kam')            ? 'tb-link-active' : 'tb-link'}>Dashboard</Link>
          <Link to="/kam/clientes"   className={starts('/kam/clientes')   ? 'tb-link-active' : 'tb-link'}>Mis clientes</Link>
          <Link to="/kam/comisiones" className={starts('/kam/comisiones') ? 'tb-link-active' : 'tb-link'}>Comisiones</Link>
          <Link to="/kam/ruta"       className={starts('/kam/ruta')       ? 'tb-link-active' : 'tb-link'}>Mi ruta</Link>
        </nav>
      )}

      {/* ── User area ───────────────────────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        {/* Avatar con iniciales */}
        {user && (
          <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
            <span className="text-ivory text-[10px] font-bold leading-none">
              {initials(user.name)}
            </span>
          </div>
        )}
        <span className="text-ivory/60 text-[12px] font-display hidden sm:block truncate max-w-[150px]">
          {user?.name}
        </span>
        <button onClick={logout} className="tb-link text-ivory/40 hover:text-ivory text-[11px] ml-1">
          Salir
        </button>
      </div>
    </header>
  );
}
