import { useEffect, useState } from 'react';
import { adminApi, type AdminStats, type TrendPoint, type Product } from '../../api/client';
import { Spinner, PageError } from '../../components/Spinner';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const MONTH_ES: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
};
const shortMonth = (ym: string) => {
  const [, m] = ym.split('-');
  return MONTH_ES[m] ?? m;
};

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="card py-5 text-center">
      <p className={`font-display font-bold text-[30px] mb-0.5 ${color ?? 'text-ink'}`}>{value}</p>
      <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide">{label}</p>
      {sub && <p className="text-[11px] text-ink-mute mt-0.5">{sub}</p>}
    </div>
  );
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  if (!points.length) return <p className="text-center text-ink-mute text-[12px] py-8">Sin datos de tendencia.</p>;
  const maxRev = Math.max(...points.map(p => p.revenue), 1);

  return (
    <div className="flex items-end gap-1.5 h-[120px] w-full">
      {points.map(p => {
        const pct = Math.max((p.revenue / maxRev) * 100, 2);
        return (
          <div key={p.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full flex flex-col justify-end" style={{ height: '96px' }}>
              <div
                className="w-full rounded-t-sm bg-green/70 hover:bg-green transition-colors cursor-default group relative"
                style={{ height: `${pct}%` }}
                title={`${shortMonth(p.month)}: ${cop(p.revenue)} (${p.count} pedidos)`}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-ink text-ivory text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {cop(p.revenue)}
                </div>
              </div>
            </div>
            <span className="text-[9px] text-ink-mute">{shortMonth(p.month)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats,     setStats]     = useState<AdminStats | null>(null);
  const [trend,     setTrend]     = useState<TrendPoint[]>([]);
  const [lowStock,  setLowStock]  = useState<Product[]>([]);
  const [error,     setError]     = useState('');

  useEffect(() => {
    Promise.all([
      adminApi.stats(),
      adminApi.statsTrend(),
      adminApi.listProducts(1, 8, undefined, undefined, true),
    ]).then(([s, t, ls]) => {
      setStats(s);
      setTrend(t);
      setLowStock(ls.data);
    }).catch(() => setError('Error cargando dashboard.'));
  }, []);

  if (error) return <PageError message={error} />;
  if (!stats) return <Spinner />;

  const activeClients   = stats.clientsByStatus['activo']    ?? 0;
  const riskClients     = stats.clientsByStatus['riesgo']    ?? 0;
  const inactiveClients = stats.clientsByStatus['inactivo']  ?? 0;
  const pendingOrders   = (stats.ordersByStatus['alistando']  ?? 0)
                        + (stats.ordersByStatus['confirmado'] ?? 0)
                        + (stats.ordersByStatus['pendiente']  ?? 0);
  const shippedOrders   = stats.ordersByStatus['en_ruta']   ?? 0;
  const deliveredOrders = stats.ordersByStatus['entregado'] ?? 0;

  const trendRevenue = trend.reduce((s, p) => s + p.revenue, 0);
  const trendOrders  = trend.reduce((s, p) => s + p.count,   0);

  return (
    <div>
      <h1 className="h1 mb-1">Dashboard</h1>
      <p className="text-[13px] text-ink-mute mb-6">Resumen operativo D'MARIO B2B</p>

      {/* ── Revenue hero ───────────────────────────────────────────────────── */}
      <div className="card bg-green text-ivory mb-6 flex items-center justify-between px-6 py-5">
        <div>
          <p className="text-[11px] text-ivory/60 uppercase tracking-widest mb-1">Facturación total acumulada</p>
          <p className="font-display font-bold text-[34px]">{cop(stats.totalRevenue)}</p>
        </div>
        <div className="text-right">
          <p className="text-[13px] text-ivory/70">{stats.totalOrders} pedidos</p>
          <p className="text-[12px] text-ivory/50">
            {cop(stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders) : 0)} promedio
          </p>
        </div>
      </div>

      {/* ── Trend chart ────────────────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-widest mb-0.5">Últimos 12 meses</p>
            <h3 className="font-display font-semibold text-[15px] text-ink">Facturación mensual</h3>
          </div>
          <div className="text-right">
            <p className="font-display font-bold text-[18px] text-green">{cop(trendRevenue)}</p>
            <p className="text-[11px] text-ink-mute">{trendOrders} pedidos en el período</p>
          </div>
        </div>
        <TrendChart points={trend} />
      </div>

      {/* ── Clientes KPI ───────────────────────────────────────────────────── */}
      <h3 className="h3 mb-3">Clientes · {stats.totalClients} total</h3>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Activos"   value={activeClients}   color="text-ok"
          sub={`${stats.totalClients > 0 ? Math.round(activeClients / stats.totalClients * 100) : 0}% del total`} />
        <KpiCard label="En riesgo" value={riskClients}     color={riskClients > 0 ? 'text-risk' : 'text-ink'} />
        <KpiCard label="Inactivos" value={inactiveClients} color="text-ink-mute" />
      </div>

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-[1fr_340px] gap-6">

        {/* Orders pipeline */}
        <div>
          <h3 className="h3 mb-3">Estado de pedidos</h3>
          <div className="card p-0 overflow-hidden mb-6">
            {[
              { label: 'Pendiente / Confirmado / Alistando', value: pendingOrders,   color: 'text-accent' },
              { label: 'En ruta',                            value: shippedOrders,   color: 'text-ok' },
              { label: 'Entregados',                         value: deliveredOrders, color: 'text-ink-mute' },
            ].map((row, i, arr) => (
              <div key={row.label} className={`flex items-center justify-between px-5 py-4 ${i < arr.length - 1 ? 'border-b border-rule' : ''}`}>
                <span className="text-[13px] text-ink">{row.label}</span>
                <span className={`font-display font-bold text-[22px] ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>

          <h3 className="h3 mb-3">Catálogo</h3>
          <div className="grid grid-cols-2 gap-4">
            <KpiCard label="Referencias activas" value={stats.activeProducts}
              sub={`${stats.totalProducts - stats.activeProducts} inactivas`} />
            <KpiCard label="Total en catálogo"   value={stats.totalProducts} />
          </div>
        </div>

        {/* Low-stock alert */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-widest">Alerta de inventario</p>
              <h3 className="font-display font-semibold text-[15px] text-ink">Stock bajo · &lt; 10 und</h3>
            </div>
            {lowStock.length > 0 && (
              <span className="text-[10px] font-bold bg-risk/20 text-risk px-2 py-0.5 rounded-full">
                {lowStock.length} refs
              </span>
            )}
          </div>
          <div className="card p-0 overflow-hidden">
            {lowStock.length === 0 ? (
              <p className="text-center text-ink-mute text-[12px] py-8">✓ Todo el inventario está bien.</p>
            ) : (
              <div className="divide-y divide-rule">
                {lowStock.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[10px] text-ink-mute">{p.ref}</p>
                      <p className="text-[12px] font-medium text-ink truncate">{p.name}</p>
                      <p className="text-[10px] text-ink-mute">Línea {p.line}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`font-display font-bold text-[18px] ${p.stock === 0 ? 'text-error' : 'text-risk'}`}>
                        {p.stock}
                      </span>
                      <p className="text-[10px] text-ink-mute">und</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
