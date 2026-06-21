import { useEffect, useState } from 'react';
import { adminApi, type AdminOrder } from '../../api/client';
import { Spinner, PageError } from '../../components/Spinner';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const STATUS_OPTS = ['', 'pendiente', 'confirmado', 'alistando', 'en_ruta', 'entregado', 'cancelado'];
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
  confirmado: 'bg-ok/10 text-ok',
  alistando:  'pill-proc',
  en_ruta:    'pill-ok',
  entregado:  'bg-ivory text-ink-mute border border-rule',
  cancelado:  'bg-error/20 text-error',
};
const TERM_LABEL: Record<string, string> = {
  contado: 'Contado', pronto_pago: 'Pronto 30d', credito90: '90 días',
};

// ── Order detail expand ────────────────────────────────────────────────────────
function OrderRow({ o, onStatusChange }: { o: AdminOrder; onStatusChange: (id: string, s: string) => void }) {
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);

  const changeStatus = async (status: string) => {
    setSaving(true);
    try { await onStatusChange(o.id, status); }
    finally { setSaving(false); }
  };

  return (
    <>
      <tr className="border-b border-rule hover:bg-ivory/50 transition-colors cursor-pointer" onClick={() => setOpen(x => !x)}>
        <td className="px-4 py-3">
          <p className="font-display font-semibold text-[13px] text-green">{o.code}</p>
          <p className="text-[11px] text-ink-mute">{new Date(o.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-ink">{o.client.name}</p>
          <p className="text-[11px] text-ink-mute">{o.client.city}</p>
        </td>
        <td className="px-4 py-3">
          <span className={`pill ${STATUS_COLOR[o.status] ?? 'pill-proc'}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
        </td>
        <td className="px-4 py-3 text-ink-soft text-[12px]">{TERM_LABEL[o.paymentTerm] ?? o.paymentTerm}</td>
        <td className="px-4 py-3 text-right font-display font-semibold text-ink">{cop(o.total)}</td>
        <td className="px-4 py-3 text-right text-ink-mute text-[12px]">{o.vendor?.name ?? '—'}</td>
        <td className="px-4 py-3 text-[12px] text-ink-mute">{open ? '▲' : '▼'}</td>
      </tr>
      {open && (
        <tr className="border-b border-rule bg-ivory/40">
          <td colSpan={7} className="px-6 py-4">
            <div className="flex gap-8 flex-wrap">
              {/* Items */}
              <div className="flex-1 min-w-[200px]">
                <p className="text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-2">Ítems del pedido</p>
                <div className="flex flex-col gap-1">
                  {o.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-[12px]">
                      <span className="text-ink-soft">{it.ref} — {it.name} × {it.qty}</span>
                      <span className="font-medium text-ink">{cop(it.lineTotal)}</span>
                    </div>
                  ))}
                </div>
                {o.discount > 0 && (
                  <div className="flex justify-between text-[12px] text-ok mt-1 pt-1 border-t border-rule">
                    <span>Descuento</span><span>−{cop(o.discount)}</span>
                  </div>
                )}
              </div>
              {/* Status change */}
              <div className="flex-shrink-0">
                <p className="text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-2">Cambiar estado</p>
                <div className="flex flex-col gap-1.5">
                  {STATUS_OPTS.filter(Boolean).map(s => (
                    <button
                      key={s}
                      disabled={o.status === s || saving}
                      onClick={e => { e.stopPropagation(); changeStatus(s); }}
                      className={`text-[12px] px-3 py-1.5 rounded-brand border transition-colors
                                  ${o.status === s
                                    ? 'bg-green text-ivory border-green cursor-default'
                                    : 'border-rule text-ink-soft hover:border-green hover:text-green disabled:opacity-40'}`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listOrders(page, 30, filterStatus || undefined);
      setOrders(res.data);
      setTotal(res.meta.total);
    } catch { setError('Error cargando pedidos.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, filterStatus]);

  const changeStatus = async (id: string, status: string) => {
    await adminApi.updateOrderStatus(id, status);
    setOrders(os => os.map(o => o.id === id ? { ...o, status } : o));
  };

  if (error) return <PageError message={error} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="h1 mb-0.5">Pedidos</h1>
          <p className="text-[13px] text-ink-mute">{total} pedidos registrados</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <select className="input" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">Todos los estados</option>
          {STATUS_OPTS.filter(Boolean).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-rule bg-ivory text-[11px] text-ink-mute uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Código · Fecha</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Plazo</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">KAM</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <OrderRow key={o.id} o={o} onStatusChange={changeStatus} />
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <p className="text-center text-ink-mute py-10">No hay pedidos con este filtro.</p>
          )}
        </div>
      )}

      {total > 30 && (
        <div className="flex gap-2 justify-center mt-4">
          <button className="btn-secondary px-3 py-1.5 text-[12px]" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
          <span className="text-[12px] text-ink-soft px-2 py-1.5">Pág. {page} de {Math.ceil(total / 30)}</span>
          <button className="btn-secondary px-3 py-1.5 text-[12px]" disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)}>→</button>
        </div>
      )}
    </div>
  );
}
