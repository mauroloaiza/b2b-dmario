import { useEffect, useState } from 'react';
import { adminApi, type AdminOrder } from '../../api/client';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const STATUS_PIPELINE = ['pendiente', 'confirmado', 'alistando', 'en_ruta', 'entregado', 'cancelado'];

const STATUS_LABEL: Record<string, string> = {
  pendiente:  'Pendiente',
  confirmado: 'Confirmado',
  alistando:  'Alistando',
  en_ruta:    'En ruta',
  entregado:  'Entregado',
  cancelado:  'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  pendiente:  'bg-line text-ink-mute',
  confirmado: 'bg-ok/20 text-ok',
  alistando:  'bg-amber-100 text-amber-700',
  en_ruta:    'bg-blue-100 text-blue-700',
  entregado:  'bg-ok text-ok-soft',
  cancelado:  'bg-error/20 text-error',
};

export default function Logistics() {
  const [orders,  setOrders]  = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage,   setStage]   = useState('alistando');
  const [saving,  setSaving]  = useState<string | null>(null);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    const all = await adminApi.listOrders(1, 200);
    setOrders(all.data);
    setLoading(false);
  };

  const advance = async (order: AdminOrder) => {
    const nextIdx = STATUS_PIPELINE.indexOf(order.status) + 1;
    if (nextIdx >= STATUS_PIPELINE.length) return;
    const next = STATUS_PIPELINE[nextIdx];
    setSaving(order.id);
    await adminApi.updateOrderStatus(order.id, next);
    setOrders(os => os.map(o => o.id === order.id ? { ...o, status: next } : o));
    setSaving(null);
  };

  const filtered = orders.filter(o => o.status === stage);

  // ── KPI by status ──────────────────────────────────────────────────────────
  const counts = STATUS_PIPELINE.reduce<Record<string, number>>((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {});

  if (loading) return <div className="text-center py-16 text-ink-mute text-[13px]">Cargando logística…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Logística y despachos</h1>
        <p className="text-[13px] text-ink-mute mt-0.5">Cola de picking · estado de pedidos · avance de etapa</p>
      </div>

      {/* ── Pipeline tabs ────────────────────────────────────────────────── */}
      <div className="card p-2 flex flex-wrap gap-1">
        {STATUS_PIPELINE.filter(s => s !== 'cancelado').map(s => (
          <button
            key={s}
            onClick={() => setStage(s)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-brand text-[12px] font-medium transition-all
                        ${stage === s ? 'bg-green text-ivory' : 'text-ink-mute hover:bg-ivory'}`}
          >
            {STATUS_LABEL[s]}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                              ${stage === s ? 'bg-white/20 text-ivory' : 'bg-line text-ink-mute'}`}>
              {counts[s] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── KPI summary ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {STATUS_PIPELINE.filter(s => s !== 'cancelado').map(s => (
          <div key={s} className="border border-line rounded-brand p-3 text-center">
            <p className="text-[9px] text-ink-mute uppercase tracking-wide">{STATUS_LABEL[s]}</p>
            <p className={`text-[20px] font-display font-bold ${counts[s] > 0 ? 'text-ink' : 'text-ink-mute/30'}`}>
              {counts[s] ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* ── Order cards ─────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-ink-mute text-[13px]">
          No hay pedidos en etapa <strong>{STATUS_LABEL[stage]}</strong>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map(o => {
            const totalUnits = o.items?.reduce((s, i) => s + i.qty, 0) ?? 0;
            const nextIdx    = STATUS_PIPELINE.indexOf(o.status) + 1;
            const nextStatus = STATUS_PIPELINE[nextIdx];
            const canAdvance = nextStatus && nextStatus !== 'cancelado';

            return (
              <div key={o.id} className="card p-4 flex flex-col gap-3">
                {/* header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-bold text-[14px] text-ink">{o.code}</p>
                    <p className="text-[12px] text-ink-soft mt-0.5">{o.client?.name}</p>
                    <p className="text-[11px] text-ink-mute">{o.client?.city}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLOR[o.status] ?? 'bg-line text-ink'}`}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </div>

                {/* items summary */}
                <div className="bg-ivory rounded-brand px-3 py-2 text-[11px] text-ink-soft">
                  {o.items?.slice(0, 3).map((item, i) => (
                    <span key={i} className="mr-2">{item.ref} ×{item.qty}</span>
                  ))}
                  {(o.items?.length ?? 0) > 3 && <span className="text-ink-mute">+{(o.items?.length ?? 0) - 3} más</span>}
                </div>

                {/* footer */}
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-ink-mute">
                    <span className="font-semibold text-green">{cop(o.total)}</span>
                    {' · '}{totalUnits} uds · {o.paymentTerm}
                  </div>
                  {canAdvance && (
                    <button
                      onClick={() => advance(o)}
                      disabled={saving === o.id}
                      className="text-[11px] font-semibold bg-green text-ivory px-3 py-1.5 rounded-brand hover:bg-green/90 transition-colors disabled:opacity-50"
                    >
                      {saving === o.id ? '…' : `→ ${STATUS_LABEL[nextStatus]}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
