import { useEffect, useState } from 'react';
import { adminApi, type AdminStats } from '../../api/client';
import { Spinner, PageError } from '../../components/Spinner';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="card py-5 text-center">
      <p className={`font-display font-bold text-[30px] mb-0.5 ${color ?? 'text-ink'}`}>{value}</p>
      <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide">{label}</p>
      {sub && <p className="text-[11px] text-ink-mute mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData]   = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.stats().then(setData).catch(() => setError('Error cargando stats.'));
  }, []);

  if (error) return <PageError message={error} />;
  if (!data)  return <Spinner />;

  const activeClients  = data.clientsByStatus['activo']   ?? 0;
  const riskClients    = data.clientsByStatus['riesgo']   ?? 0;
  const inactiveClients = data.clientsByStatus['inactivo'] ?? 0;
  const pendingOrders   = (data.ordersByStatus['alistando']  ?? 0) + (data.ordersByStatus['confirmado'] ?? 0) + (data.ordersByStatus['pendiente'] ?? 0);
  const shippedOrders   = data.ordersByStatus['en_ruta']    ?? 0;
  const deliveredOrders = data.ordersByStatus['entregado']  ?? 0;

  return (
    <div>
      <h1 className="h1 mb-1">Dashboard</h1>
      <p className="text-[13px] text-ink-mute mb-6">Resumen operativo D'MARIO B2B</p>

      {/* Revenue */}
      <div className="card bg-green text-ivory mb-6 flex items-center justify-between px-6 py-5">
        <div>
          <p className="text-[11px] text-ivory/60 uppercase tracking-widest mb-1">Facturación total acumulada</p>
          <p className="font-display font-bold text-[34px]">{cop(data.totalRevenue)}</p>
        </div>
        <div className="text-right">
          <p className="text-[13px] text-ivory/70">{data.totalOrders} pedidos</p>
          <p className="text-[12px] text-ivory/50">
            {cop(data.totalOrders > 0 ? Math.round(data.totalRevenue / data.totalOrders) : 0)} promedio
          </p>
        </div>
      </div>

      {/* Clients KPIs */}
      <h3 className="h3 mb-3">Clientes · {data.totalClients} total</h3>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Activos"   value={activeClients}  color="text-ok"   sub={`${Math.round(activeClients / data.totalClients * 100)}% del total`} />
        <KpiCard label="En riesgo" value={riskClients}    color={riskClients > 0 ? 'text-risk' : 'text-ink'} />
        <KpiCard label="Inactivos" value={inactiveClients} color="text-ink-mute" />
      </div>

      {/* Products */}
      <h3 className="h3 mb-3">Catálogo</h3>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <KpiCard label="Referencias activas" value={data.activeProducts}
          sub={`${data.totalProducts - data.activeProducts} inactivas`} />
        <KpiCard label="Total en catálogo"   value={data.totalProducts} />
      </div>

      {/* Orders */}
      <h3 className="h3 mb-3">Estado de pedidos</h3>
      <div className="card p-0 overflow-hidden">
        {[
          { label: 'Pendiente / Confirmado / Alistando', value: pendingOrders,  color: 'bg-accent-soft text-accent' },
          { label: 'En ruta',                           value: shippedOrders,  color: 'bg-ok-soft text-ok' },
          { label: 'Entregados',      value: deliveredOrders, color: 'bg-ivory text-ink-mute' },
        ].map((row, i, arr) => (
          <div key={row.label} className={`flex items-center justify-between px-5 py-4 ${i < arr.length - 1 ? 'border-b border-rule' : ''}`}>
            <span className="text-[13px] text-ink">{row.label}</span>
            <span className={`font-display font-bold text-[20px] ${row.color.split(' ')[1]}`}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
