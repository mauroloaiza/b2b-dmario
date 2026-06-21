import { useEffect, useState } from 'react';
import { adminApi, type IntelligenceData } from '../../api/client';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const pct = (n: number) => `${Math.round(n)}%`;

const SEG_COLOR: Record<string, string> = {
  A: 'bg-ok text-ok-soft',
  B: 'bg-amber-500 text-amber-50',
  C: 'bg-ink-mute text-ivory',
};
const SEG_LABEL: Record<string, string> = { A: 'Estratégico', B: 'Recurrente', C: 'Potencial' };

export default function Intelligence() {
  const [data, setData]     = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.intelligence().then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-16 text-ink-mute text-[13px]">Calculando…</div>;
  if (!data)   return null;

  const top20Pct    = data.totalRevenue > 0 ? (data.top20Revenue / data.totalRevenue) * 100 : 0;
  const clientCount = data.topClients.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Inteligencia comercial</h1>
        <p className="text-[13px] text-ink-mute mt-0.5">Análisis 80/20 · segmentación · scoreboard de vendedores</p>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Facturación YTD',         value: cop(data.totalRevenue) },
          { label: `Top ${data.top20Count} clientes`,  value: pct(top20Pct) + ' del total' },
          { label: 'Clientes Seg. A',         value: (data.segmentation.counts['A'] ?? 0).toString() },
          { label: 'Vendedores activos',       value: data.vendorScoreboard.length.toString() },
        ].map(k => (
          <div key={k.label} className="card py-4 px-4">
            <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-wide mb-1">{k.label}</p>
            <p className="text-[20px] font-display font-bold text-green">{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── 80/20 bar ───────────────────────────────────────────────────── */}
      <div className="card p-5">
        <h2 className="h2 mb-3">Análisis Pareto (80/20)</h2>
        <p className="text-[13px] text-ink-soft mb-4">
          <strong className="text-ink">{data.top20Count} clientes</strong> generan{' '}
          <strong className="text-green">{pct(top20Pct)}</strong> del total facturado
          {' '}— {cop(data.top20Revenue)} de {cop(data.totalRevenue)}
        </p>
        <div className="h-5 rounded-full bg-line overflow-hidden">
          <div
            className="h-full bg-green rounded-full transition-all"
            style={{ width: `${Math.min(top20Pct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[11px] text-ink-mute">
          <span>0%</span>
          <span>80%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ── Top clientes ────────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="h2 mb-3">Top {clientCount} clientes YTD</h2>
          <div className="overflow-auto max-h-80">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-ink-mute text-[10px] uppercase tracking-wide border-b border-line">
                  <th className="pb-2 pr-3">#</th>
                  <th className="pb-2 pr-3">Cliente</th>
                  <th className="pb-2 pr-3">Seg.</th>
                  <th className="pb-2 text-right">YTD</th>
                </tr>
              </thead>
              <tbody>
                {data.topClients.map((c, i) => (
                  <tr key={c.id} className="border-b border-line/50 hover:bg-ivory/50">
                    <td className="py-2 pr-3 text-ink-mute font-mono">{i + 1}</td>
                    <td className="py-2 pr-3">
                      <p className="font-medium text-ink leading-tight">{c.name}</p>
                      <p className="text-[10px] text-ink-mute">{c.city}</p>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${SEG_COLOR[c.segment] ?? 'bg-line text-ink'}`}>
                        {c.segment}
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold text-green">{cop(c.ytd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── City sales ──────────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="h2 mb-3">Ventas por ciudad</h2>
          <div className="space-y-3">
            {data.citySales.map((c, i) => {
              const barPct = data.citySales[0]?.sales > 0 ? (c.sales / data.citySales[0].sales) * 100 : 0;
              return (
                <div key={c.city}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-ink">{i + 1}. {c.city}</span>
                    <span className="font-semibold text-green">{cop(c.sales)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-line overflow-hidden">
                    <div className="h-full bg-green/70 rounded-full" style={{ width: `${barPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Segmentation ────────────────────────────────────────────────── */}
      <div className="card p-5">
        <h2 className="h2 mb-4">Segmentación de clientes</h2>
        <div className="grid grid-cols-3 gap-3">
          {['A', 'B', 'C'].map(seg => (
            <div key={seg} className="border border-line rounded-brand p-4 text-center">
              <div className={`inline-flex w-10 h-10 rounded-full items-center justify-center font-display font-bold text-[16px] mb-2 ${SEG_COLOR[seg]}`}>
                {seg}
              </div>
              <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide">{SEG_LABEL[seg]}</p>
              <p className="text-[22px] font-display font-bold text-ink mt-1">
                {data.segmentation.counts[seg] ?? 0}
              </p>
              <p className="text-[11px] text-green font-medium">{cop(data.segmentation.revenue[seg] ?? 0)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Vendor scoreboard ───────────────────────────────────────────── */}
      <div className="card p-5">
        <h2 className="h2 mb-3">Scoreboard vendedores</h2>
        <div className="overflow-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-ink-mute text-[10px] uppercase tracking-wide border-b border-line">
                <th className="pb-2 pr-4">Vendedor</th>
                <th className="pb-2 pr-4">Zona</th>
                <th className="pb-2 pr-4 text-right">Meta</th>
                <th className="pb-2 pr-4 text-right">Real</th>
                <th className="pb-2 pr-4 text-right">%</th>
                <th className="pb-2 text-right">Clientes</th>
              </tr>
            </thead>
            <tbody>
              {data.vendorScoreboard.map(v => (
                <tr key={v.id} className="border-b border-line/50 hover:bg-ivory/50">
                  <td className="py-2.5 pr-4 font-medium text-ink">{v.name}</td>
                  <td className="py-2.5 pr-4 text-ink-mute">{v.zone}</td>
                  <td className="py-2.5 pr-4 text-right">{cop(v.meta)}</td>
                  <td className="py-2.5 pr-4 text-right font-semibold text-green">{cop(v.real)}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <span className={`font-bold ${v.pct >= 90 ? 'text-ok' : v.pct >= 70 ? 'text-amber-500' : 'text-error'}`}>
                      {v.pct}%
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-ink-mute">
                    {v.activeCount}/{v.clientsCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
