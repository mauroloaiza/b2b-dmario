import { useEffect, useState } from 'react';
import { kamApi, type KamDashboard } from '../../api/client';
import { Spinner, PageError } from '../../components/Spinner';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const pct = (n: number) => `${n}%`;

export default function KamDashboardPage() {
  const [data, setData]   = useState<KamDashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    kamApi.dashboard().then(setData).catch(() => setError('Error cargando dashboard.'));
  }, []);

  if (error) return <PageError message={error} />;
  if (!data)  return <Spinner />;

  const cumplimientoPct = Math.min(data.cumplimiento, 100);

  return (
    <div className="page">
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 mb-6">
        <div className="flex flex-col justify-center">
          <p className="eyebrow mb-2">Panel del vendedor</p>
          <h1 className="h1 mb-1">Hola, {data.vendor.name}</h1>
          <p className="text-[13px] text-ink-soft">{data.vendor.zone}</p>
        </div>

        {/* Meta card */}
        <div className="cupo-card">
          <div className="flex justify-between items-baseline">
            <span className="text-[12px] text-ivory/70">Meta del mes</span>
            <strong className="font-display text-[22px] font-semibold">{pct(data.cumplimiento)}</strong>
          </div>
          <div className="progress-track bg-green-soft">
            <div
              className="progress-bar bg-ivory/40"
              style={{ width: `${cumplimientoPct}%` }}
            />
          </div>
          <p className="text-[11px] text-ivory/60">
            {cop(data.ytdReal)} de {cop(data.meta)} · {data.activeClients} clientes activos
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Clientes totales', value: data.totalClients },
          { label: 'Activos',          value: data.activeClients, color: 'text-ok' },
          { label: 'En riesgo',        value: data.riskClients,   color: data.riskClients > 0 ? 'text-risk' : '' },
          { label: 'Facturas vencidas',value: data.overdueInvoices, color: data.overdueInvoices > 0 ? 'text-risk' : '' },
        ].map(kpi => (
          <div key={kpi.label} className="card text-center py-5">
            <p className={`font-display font-bold text-[28px] mb-0.5 ${kpi.color ?? 'text-ink'}`}>{kpi.value}</p>
            <p className="text-[11px] text-ink-mute">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Regla 80/20 */}
      <div className="card mb-6 flex items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-green flex items-center justify-center flex-shrink-0">
          <span className="font-display font-bold text-ivory text-[18px]">80/20</span>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-ink mb-0.5">
            {data.top80.clientCount} de {data.top80.ofTotal} clientes generan el 80% del volumen
          </p>
          <p className="text-[12px] text-ink-mute">
            Segmento A — prioridad de atención semanal
          </p>
        </div>
      </div>

      {/* Alertas de cupo */}
      {data.cupoAlerts.length > 0 && (
        <div className="mb-6">
          <h3 className="h3 mb-3">Alertas de cupo &gt;80% usado</h3>
          <div className="flex flex-col gap-2">
            {data.cupoAlerts.map(c => (
              <div key={c.clientId} className="alert-strip flex items-center justify-between gap-4">
                <div>
                  <p className="text-[13px] font-semibold text-ink">{c.name}</p>
                  <p className="text-[12px] text-ink-soft">
                    Usado {cop(c.creditUsed)} de {cop(c.creditLimit)}
                  </p>
                </div>
                <span className="font-display font-bold text-[20px] text-risk">{c.usedPct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.cupoAlerts.length === 0 && (
        <div className="card border-ok bg-ok-soft mb-6 text-center py-5">
          <p className="text-[13px] font-medium text-ok">✓ Ningún cliente supera el 80% de cupo usado</p>
        </div>
      )}
    </div>
  );
}
