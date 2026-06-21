import { useEffect, useState } from 'react';
import { adminApi, type TreasuryData } from '../../api/client';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const pct = (a: number, b: number) => b > 0 ? `${Math.round((a / b) * 100)}%` : '—';

const BUCKET_COLORS = [
  'bg-ok text-ok',
  'bg-amber-100 text-amber-600',
  'bg-orange-100 text-orange-600',
  'bg-red-100 text-red-600',
  'bg-red-200 text-red-800',
];

export default function Treasury() {
  const [data, setData]       = useState<TreasuryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.treasury().then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-16 text-ink-mute text-[13px]">Cargando cartera…</div>;
  if (!data)   return null;

  const vencidaPct = data.totalCxC > 0 ? (data.vencida / data.totalCxC) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Cartera y tesorería</h1>
        <p className="text-[13px] text-ink-mute mt-0.5">CxC · envejecimiento · DSO · top deudores</p>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card py-5 px-5">
          <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Total CxC</p>
          <p className="text-[24px] font-display font-bold text-green">{cop(data.totalCxC)}</p>
        </div>
        <div className="card py-5 px-5">
          <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Cartera vencida</p>
          <p className="text-[24px] font-display font-bold text-error">{cop(data.vencida)}</p>
          <p className="text-[11px] text-ink-mute mt-0.5">{pct(data.vencida, data.totalCxC)} del total</p>
        </div>
        <div className="card py-5 px-5">
          <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-wide mb-1">DSO</p>
          <p className="text-[24px] font-display font-bold text-ink">{data.dso} días</p>
          <p className="text-[11px] text-ink-mute mt-0.5">Days Sales Outstanding</p>
        </div>
      </div>

      {/* ── Vencida bar ─────────────────────────────────────────────────── */}
      {data.totalCxC > 0 && (
        <div className="card p-5">
          <div className="flex justify-between text-[12px] mb-2">
            <span className="font-semibold text-ink">Cartera corriente vs. vencida</span>
            <span className="text-error font-semibold">{Math.round(vencidaPct)}% vencida</span>
          </div>
          <div className="h-4 rounded-full bg-line overflow-hidden flex">
            <div className="h-full bg-ok rounded-l-full transition-all" style={{ width: `${100 - vencidaPct}%` }} />
            <div className="h-full bg-error rounded-r-full transition-all" style={{ width: `${vencidaPct}%` }} />
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-ink-mute">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-ok inline-block" />Corriente</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error inline-block" />Vencida</span>
          </div>
        </div>
      )}

      {/* ── Aging buckets ───────────────────────────────────────────────── */}
      <div className="card p-5">
        <h2 className="h2 mb-4">Envejecimiento de cartera</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {data.aging.map((b, i) => (
            <div key={b.bucket} className="border border-line rounded-brand p-3 text-center">
              <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-2 ${BUCKET_COLORS[i] ?? 'bg-line text-ink'}`}>
                {b.bucket}
              </div>
              <p className="text-[15px] font-display font-bold text-ink">{cop(b.amount)}</p>
              <p className="text-[10px] text-ink-mute mt-0.5">{b.count} pedidos</p>
              <p className="text-[10px] text-ink-mute">{pct(b.amount, data.totalCxC)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Aging bar chart ─────────────────────────────────────────────── */}
      {data.totalCxC > 0 && (
        <div className="card p-5">
          <h2 className="h2 mb-4">Distribución visual</h2>
          <div className="space-y-2.5">
            {data.aging.map((b, i) => {
              const barPct = (b.amount / data.totalCxC) * 100;
              const colors = ['bg-ok', 'bg-amber-400', 'bg-orange-400', 'bg-red-400', 'bg-red-700'];
              return (
                <div key={b.bucket} className="flex items-center gap-3">
                  <span className="text-[11px] text-ink-mute w-16 flex-shrink-0">{b.bucket}</span>
                  <div className="flex-1 h-5 rounded bg-line overflow-hidden">
                    <div className={`h-full rounded ${colors[i]}`} style={{ width: `${barPct}%` }} />
                  </div>
                  <span className="text-[11px] font-semibold text-ink w-24 text-right">{cop(b.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Top deudores ────────────────────────────────────────────────── */}
      {data.topDeudores.length > 0 && (
        <div className="card p-5">
          <h2 className="h2 mb-3">Top deudores</h2>
          <div className="overflow-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-ink-mute text-[10px] uppercase tracking-wide border-b border-line">
                  <th className="pb-2 pr-4">Cliente</th>
                  <th className="pb-2 pr-4">Ciudad</th>
                  <th className="pb-2 pr-4">Vendedor</th>
                  <th className="pb-2 pr-4 text-right">Deuda total</th>
                  <th className="pb-2 text-right">Antigüedad</th>
                </tr>
              </thead>
              <tbody>
                {data.topDeudores.map(d => (
                  <tr key={d.id} className="border-b border-line/50 hover:bg-ivory/50">
                    <td className="py-2.5 pr-4 font-medium text-ink">{d.name}</td>
                    <td className="py-2.5 pr-4 text-ink-mute">{d.city}</td>
                    <td className="py-2.5 pr-4 text-ink-mute">{d.vendorName}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-error">{cop(d.due)}</td>
                    <td className="py-2.5 text-right">
                      <span className={`font-medium ${d.oldest > 90 ? 'text-red-700' : d.oldest > 60 ? 'text-error' : d.oldest > 30 ? 'text-amber-600' : 'text-ok'}`}>
                        {d.oldest}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
