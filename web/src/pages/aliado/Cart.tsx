import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../store/cart';
import { ordersApi, clientsApi, type PreviewReq, type ClientMe } from '../../api/client';
import { WatchGlyph } from '../../components/WatchGlyph';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const TERMS = [
  { id: 'contado',     label: 'Contado inmediato',   discount: 8, note: 'Transferencia o PSE · −8%' },
  { id: 'pronto_pago', label: 'Pronto pago 30 días', discount: 5, note: 'Cancelación a 30 días · −5%' },
  { id: 'credito90',   label: 'Crédito 90 días',     discount: 0, note: 'Plazo estándar de cartera' },
] as const;

export default function Cart() {
  const { items, setQty, clear }  = useCart();
  const [term, setTerm]           = useState<'contado' | 'pronto_pago' | 'credito90'>('credito90');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [client, setClient]       = useState<ClientMe | null>(null);
  const navigate                  = useNavigate();

  useEffect(() => {
    clientsApi.me().then(setClient).catch(() => null);
  }, []);

  const list     = Object.values(items);
  const subtotal = list.reduce((s, i) => s + i.product.priceMayo * i.qty, 0);
  const t        = TERMS.find(x => x.id === term)!;
  const desc     = Math.round(subtotal * t.discount / 100);
  const total    = subtotal - desc;

  const cupoOk = term !== 'credito90' || !client || total <= client.creditAvailable;

  if (list.length === 0) {
    return (
      <div className="page">
        <h1 className="h1 mb-4">Tu pedido</h1>
        <div className="card text-center py-12">
          <p className="text-ink-mute mb-4">El carrito está vacío.</p>
          <button className="btn-secondary" onClick={() => navigate('/catalogo')}>
            Ir al catálogo
          </button>
        </div>
      </div>
    );
  }

  const confirm = async () => {
    setError('');
    setLoading(true);
    try {
      const body: PreviewReq = {
        paymentTerm: term as PreviewReq['paymentTerm'],
        items: list.map(i => ({ productId: i.product.id, qty: i.qty })),
      };
      const order = await ordersApi.create(body);
      clear();
      navigate('/confirmado', { state: { order } });
    } catch (e: any) {
      setError(e.body?.message ?? 'Error al confirmar el pedido. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1 className="h1 mb-6">Tu pedido</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
        {/* Items */}
        <div className="card p-0 overflow-hidden">
          {list.map((item, idx) => {
            const p = item.product;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-4 px-5 py-4 ${idx < list.length - 1 ? 'border-b border-rule' : ''}`}
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-brand overflow-hidden">
                  <WatchGlyph tone="ivory" size={56} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate">{p.name}</p>
                  <p className="mono">{p.ref} · {cop(p.priceMayo)} c/u</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    className="w-7 h-7 rounded-brand border border-rule text-ink-soft hover:border-green hover:text-green transition-colors text-[14px]"
                    onClick={() => setQty(p.id, item.qty - p.packSize)}
                  >−</button>
                  <span className="font-mono text-[13px] w-8 text-center">{item.qty}</span>
                  <button
                    className="w-7 h-7 rounded-brand border border-rule text-ink-soft hover:border-green hover:text-green transition-colors text-[14px]"
                    onClick={() => setQty(p.id, Math.min(item.qty + p.packSize, p.stock))}
                  >+</button>
                </div>
                <div className="font-display font-semibold text-[14px] text-ink w-24 text-right flex-shrink-0">
                  {cop(p.priceMayo * item.qty)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar */}
        <div className="card flex flex-col gap-5 lg:sticky lg:top-20">
          {/* Forma de pago */}
          <div>
            <h3 className="h3 mb-3">Forma de pago</h3>
            <div className="flex flex-col gap-2">
              {TERMS.map(pt => (
                <label
                  key={pt.id}
                  className={`flex flex-col gap-0.5 px-4 py-3 rounded-brand border cursor-pointer transition-colors
                              ${term === pt.id ? 'border-green bg-ok-soft' : 'border-rule hover:border-green/40'}`}
                >
                  <input
                    type="radio"
                    name="term"
                    className="sr-only"
                    checked={term === pt.id}
                    onChange={() => setTerm(pt.id as 'contado' | 'pronto_pago' | 'credito90')}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] font-semibold text-ink">{pt.label}</span>
                    {pt.discount > 0 && (
                      <span className="text-[11px] font-semibold text-ok">
                        ahorras {cop(Math.round(subtotal * pt.discount / 100))}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-ink-mute">{pt.note}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="border-t border-rule pt-4 flex flex-col gap-2">
            <div className="flex justify-between text-[13px] text-ink-soft">
              <span>Subtotal ({list.reduce((s, i) => s + i.qty, 0)} und)</span>
              <span>{cop(subtotal)}</span>
            </div>
            {desc > 0 && (
              <div className="flex justify-between text-[13px] text-ok font-medium">
                <span>Descuento {t.label} (−{t.discount}%)</span>
                <span>−{cop(desc)}</span>
              </div>
            )}
            <div className="flex justify-between text-[16px] font-display font-bold text-ink border-t border-rule pt-2 mt-1">
              <span>Total a pagar</span>
              <span>{cop(total)}</span>
            </div>
            <p className="text-[11px] text-ink-mute">IVA incluido en los precios</p>
          </div>

          {/* Entrega */}
          {client && (
            <div className="border border-rule rounded-brand px-4 py-3 text-[12px] text-ink-soft">
              <p className="text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Entrega</p>
              <p className="text-ink font-medium">{client.name} · {client.city}</p>
              <p className="mt-0.5">Despacho en 24–48 h · llega en 2–4 días hábiles · envío incluido</p>
            </div>
          )}

          {/* Cupo alert */}
          {term === 'credito90' && client && (
            <div className={`rounded-brand px-3 py-2 text-[12px] font-medium
                            ${cupoOk
                              ? 'bg-ok-soft text-ok'
                              : 'bg-risk-soft text-risk'}`}>
              {cupoOk
                ? `✓ Dentro de tu cupo · disponible ${cop(client.creditAvailable)}`
                : `Tu cupo disponible es ${cop(client.creditAvailable)}. Reduce el pedido o elige contado / pronto pago.`}
            </div>
          )}

          {error && (
            <p className="text-[12px] text-risk bg-risk-soft rounded-brand px-3 py-2">{error}</p>
          )}

          <button
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={confirm}
            disabled={loading || !cupoOk}
          >
            {loading ? 'Confirmando…' : 'Confirmar pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}
