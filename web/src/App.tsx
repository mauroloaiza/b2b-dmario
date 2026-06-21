import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/auth';
import { Topbar } from './components/Topbar';
import { AdminLayout } from './components/AdminLayout';

import Login          from './pages/Login';
import Home           from './pages/aliado/Home';
import Catalog        from './pages/aliado/Catalog';
import Cart           from './pages/aliado/Cart';
import Confirmation   from './pages/aliado/Confirmation';
import Account        from './pages/aliado/Account';
import KamDashboard   from './pages/kam/Dashboard';
import KamClients     from './pages/kam/Clients';
import KamCommissions from './pages/kam/Commissions';
import AdminDashboard    from './pages/admin/Dashboard';
import AdminProducts     from './pages/admin/Products';
import AdminClients      from './pages/admin/Clients';
import AdminOrders       from './pages/admin/Orders';
import AdminIntelligence from './pages/admin/Intelligence';
import AdminCoordination from './pages/admin/Coordination';
import AdminTreasury     from './pages/admin/Treasury';
import AdminLogistics    from './pages/admin/Logistics';
import KamRoute          from './pages/kam/Route';

function RequireAuth({ children, role }: { children: JSX.Element; role?: 'aliado' | 'kam' | 'admin' }) {
  const user = useAuth(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'kam')   return <Navigate to="/kam" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar />
      <main>{children}</main>
    </>
  );
}

export default function App() {
  const user = useAuth(s => s.user);

  const defaultPath = !user ? '/login'
    : user.role === 'admin' ? '/admin'
    : user.role === 'kam'   ? '/kam'
    : '/';

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to={defaultPath} replace /> : <Login />}
        />

        {/* Aliado */}
        <Route path="/" element={<RequireAuth role="aliado"><Layout><Home /></Layout></RequireAuth>} />
        <Route path="/catalogo" element={<RequireAuth role="aliado"><Layout><Catalog /></Layout></RequireAuth>} />
        <Route path="/pedido" element={<RequireAuth role="aliado"><Layout><Cart /></Layout></RequireAuth>} />
        <Route path="/confirmado" element={<RequireAuth role="aliado"><Layout><Confirmation /></Layout></RequireAuth>} />
        <Route path="/cuenta" element={<RequireAuth role="aliado"><Layout><Account /></Layout></RequireAuth>} />

        {/* KAM */}
        <Route path="/kam" element={<RequireAuth role="kam"><Layout><KamDashboard /></Layout></RequireAuth>} />
        <Route path="/kam/clientes" element={<RequireAuth role="kam"><Layout><KamClients /></Layout></RequireAuth>} />
        <Route path="/kam/comisiones" element={<RequireAuth role="kam"><Layout><KamCommissions /></Layout></RequireAuth>} />

        <Route path="/kam/ruta" element={<RequireAuth role="kam"><Layout><KamRoute /></Layout></RequireAuth>} />

        {/* Admin backoffice */}
        <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout><AdminDashboard /></AdminLayout></RequireAuth>} />
        <Route path="/admin/productos" element={<RequireAuth role="admin"><AdminLayout><AdminProducts /></AdminLayout></RequireAuth>} />
        <Route path="/admin/clientes" element={<RequireAuth role="admin"><AdminLayout><AdminClients /></AdminLayout></RequireAuth>} />
        <Route path="/admin/pedidos" element={<RequireAuth role="admin"><AdminLayout><AdminOrders /></AdminLayout></RequireAuth>} />
        <Route path="/admin/inteligencia" element={<RequireAuth role="admin"><AdminLayout><AdminIntelligence /></AdminLayout></RequireAuth>} />
        <Route path="/admin/coordinacion" element={<RequireAuth role="admin"><AdminLayout><AdminCoordination /></AdminLayout></RequireAuth>} />
        <Route path="/admin/cartera" element={<RequireAuth role="admin"><AdminLayout><AdminTreasury /></AdminLayout></RequireAuth>} />
        <Route path="/admin/logistica" element={<RequireAuth role="admin"><AdminLayout><AdminLogistics /></AdminLayout></RequireAuth>} />

        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
