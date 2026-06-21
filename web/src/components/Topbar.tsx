import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useCart } from '../store/cart';
import { authApi } from '../api/client';

export function Topbar() {
  const { user, setUser } = useAuth();
  const totalUnits = useCart((s) => s.totalUnits());
  const location = useLocation();
  const navigate = useNavigate();

  const logout = async () => {
    await authApi.signOut().catch(() => {});
    setUser(null);
    navigate('/login');
  };

  const is = (path: string) => location.pathname === path;

  return (
    <header className="topbar">
      <Link to={user?.role === 'kam' ? '/kam' : '/'}>
        <img src="/dmario-logo.png" alt="D'MARIO" className="tb-logo" />
      </Link>

      {user?.role === 'aliado' && (
        <nav className="tb-nav">
          <Link to="/"         className={is('/')          ? 'tb-link-active' : 'tb-link'}>Inicio</Link>
          <Link to="/catalogo" className={is('/catalogo')  ? 'tb-link-active' : 'tb-link'}>Catálogo</Link>
          <Link to="/pedido"   className={is('/pedido') || is('/confirmado') ? 'tb-link-active' : 'tb-link'}>
            Pedido{totalUnits > 0 ? ` (${totalUnits})` : ''}
          </Link>
          <Link to="/cuenta"   className={is('/cuenta')    ? 'tb-link-active' : 'tb-link'}>Mi cuenta</Link>
        </nav>
      )}

      {user?.role === 'kam' && (
        <nav className="tb-nav">
          <Link to="/kam"              className={is('/kam')              ? 'tb-link-active' : 'tb-link'}>Dashboard</Link>
          <Link to="/kam/clientes"     className={is('/kam/clientes')     ? 'tb-link-active' : 'tb-link'}>Mis clientes</Link>
          <Link to="/kam/comisiones"   className={is('/kam/comisiones')   ? 'tb-link-active' : 'tb-link'}>Comisiones</Link>
          <Link to="/kam/ruta"         className={is('/kam/ruta')         ? 'tb-link-active' : 'tb-link'}>Mi ruta</Link>
        </nav>
      )}

      <div className="ml-auto flex items-center gap-3">
        {user && (
          <span className="text-gold/60 text-[12px] font-display hidden sm:block truncate max-w-[180px]">
            {user.name}
          </span>
        )}
        <button onClick={logout} className="tb-link text-gold/60 hover:text-ivory">
          Salir
        </button>
      </div>
    </header>
  );
}
