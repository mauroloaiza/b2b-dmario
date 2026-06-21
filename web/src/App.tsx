import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/auth';
import { Topbar } from './components/Topbar';

import Login          from './pages/Login';
import Home           from './pages/aliado/Home';
import Catalog        from './pages/aliado/Catalog';
import Cart           from './pages/aliado/Cart';
import Confirmation   from './pages/aliado/Confirmation';
import Account        from './pages/aliado/Account';
import KamDashboard   from './pages/kam/Dashboard';
import KamClients     from './pages/kam/Clients';
import KamCommissions from './pages/kam/Commissions';

function RequireAuth({ children, role }: { children: JSX.Element; role?: 'aliado' | 'kam' }) {
  const user = useAuth(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'kam' ? '/kam' : '/'} replace />;
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

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to={user.role === 'kam' ? '/kam' : '/'} replace /> : <Login />}
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

        <Route path="*" element={<Navigate to={user ? (user.role === 'kam' ? '/kam' : '/') : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
