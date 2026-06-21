import { useEffect, useState } from 'react';
import { kamApi, type KamDashboard, type KamClients } from '../../api/client';
import { Spinner, PageError } from '../../components/Spinner';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const pct = (n: number) => `${n}%`;

type RiskClient = KamClients['data'][number];

// ── WhatsApp message generator modal ──────────────────────────────────────────
function WhatsAppModal({ client, onClose }: { client: RiskClient; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const daysSince = client.lastOrderAt
    ? Math.round((Date.now() - new Date(client.lastOrderAt).getTime()) / 86400000)
    : null;

  const msg = [
    `Hola, te saluda tu asesor D'MARIO 👋`,
    ``,
    `Vi que en ${client.name} no piden hace ${daysSince ? `${daysSince} días` : 'un tiempo'}. Les armé una propuesta según lo que mejor les rota:`,
    ``,
    `• Reloj Automático · pack ×3 · precio mayorista`,
    `• Bern Sport · pack ×8 · gran rotación`,
    `• Geneva Cuero · pack ×6 · clásico siempre vigente`,
    ``,
    `Pagando de contado les aplica −8%. ¿Les despacho esta semana?`,
  ].join('\n');

  const copy = () => {
    navigator.clipboard?.writeText(msg).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-paper rounded-card shadow-xl w-full max-w-[460px] p-6">
        <div className="flex items-start justify-between mb-1">
          <h3 className="h3">Mensaje sugerido</h3>
          <button onClick={onClose} className="text-ink-mute hover:text-ink text-[20px] leading-none ml-2">×</button>
        </div>
        <p className="text-[12px] text-ink-mute mb-3">
          {client.name} · {client.city} · seg. {client.segment}
          {daysSince ? ` · sin comprar hace ${daysSince} días` : ''}
        </p>
        <textarea
          readOnly
          value={msg}
          rows={10}
          className="w-full text-[12px] font-mono bg-ivory border border-rule rounded-brand p-3
                     text-ink resize-none focus:outline-none mb-4"
        />
        <div className="flex gap-3">
          <button className="btn-primary flex-1" onClick={copy}>
            {copied ? '✓ Copiado' : 'Copiar mensaje'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default function KamDashboardPage() {
  const [data, setData]         = useState<KamDashboard | null>(null);
  const [error, setError]       = useState('');
  const [riskClients, setRiskClients] = useState<RiskClient[]>([]);
  const [waClient, setWaClient] = useState<RiskClient | null>(null);

  useEffect(() => {
    kamApi.dashboard().then(setData).catch(() => setError('Error cargando dashboard.'));
    // fetch all clients then filter non-activos client-side
    kamApi.clients(1, 100).then(r => {
      setRiskClients(r.data.filter(c => c.status !== 'activo'));
    }).catch(() => null);
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

      {/* Para hoy — clientes en riesgo */}
      {riskClients.length > 0 && (
        <div className="mb-6">
          <h3 className="h3 mb-3">Para hoy — donde hay plata</h3>
          <div className="flex flex-col gap-3">
            {riskClients.map(c => {
              const daysSince = c.lastOrderAt
                ? Math.round((Date.now() - new Date(c.lastOrderAt).getTime()) / 86400000)
                : null;
              const isRisk = c.status === 'riesgo';
              return (
                <div
                  key={c.id}
                  className={`card border-l-4 ${isRisk ? 'border-l-risk' : 'border-l-ink-mute'} p-4`}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-display font-semibold text-[14px] text-ink">{c.name}</span>
                        <span className={`pill ${isRisk ? 'pill-risk' : 'pill-proc'}`}>
                          {isRisk ? 'Riesgo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="text-[12px] text-ink-mute">
                        {c.city} · seg. {c.segment} · YTD {cop(c.ytd)}
                      </p>
                      <p className="text-[12px] text-ink-soft mt-0.5">
                        {daysSince
                          ? `Sin comprar hace ${daysSince} días — frecuencia esperada quincenal`
                          : 'Sin historial de compra reciente'}
                      </p>
                    </div>
                    <button
                      className="flex-shrink-0 text-[12px] font-medium bg-ok-soft text-ok border border-ok/40
                                 rounded-brand px-3 py-1.5 hover:bg-ok hover:text-ivory transition-colors whitespace-nowrap"
                      onClick={() => setWaClient(c)}
                    >
                      WhatsApp con pedido sugerido
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {waClient && <WhatsAppModal client={waClient} onClose={() => setWaClient(null)} />}
    </div>
  );
}
