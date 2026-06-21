import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';

const NAV = [
  { to: '/admin',          label: 'Dashboard',  icon: '◈' },
  { to: '/admin/productos',label: 'Productos',   icon: '◷' },
  { to: '/admin/clientes', label: 'Clientes',    icon: '◉' },
  { to: '/admin/pedidos',  label: 'Pedidos',     icon: '◎' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const logout = useAuth(s => s.logout);

  return (
    <div className="min-h-screen flex bg-cream font-sans">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 bg-green text-ivory flex flex-col">
        <div className="px-5 py-5 border-b border-green-soft">
          <p className="font-display font-bold text-[15px] tracking-wide">D'MARIO</p>
          <p className="text-[10px] text-ivory/50 uppercase tracking-widest mt-0.5">Backoffice</p>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-0.5 mt-2">
          {NAV.map(({ to, label, icon }) => {
            const active = to === '/admin' ? pathname === '/admin' : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-brand text-[13px] font-medium transition-colors
                            ${active ? 'bg-green-soft text-ivory' : 'text-ivory/60 hover:text-ivory hover:bg-green-soft/50'}`}
              >
                <span className="text-[15px]">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-green-soft">
          <button
            onClick={logout}
            className="w-full text-left text-[12px] text-ivory/50 hover:text-ivory px-3 py-2 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1100px] mx-auto px-6 py-7">
          {children}
        </div>
      </main>
    </div>
  );
}
