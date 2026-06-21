import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi, invoicesApi, type Order, type Invoice } from '../../api/client';
import { useCart } from '../../store/cart';
import { Spinner, PageError } from '../../components/Spinner';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const STATUS_LABEL: Record<string, string> = {
  alistamiento: 'En alistamiento',
  enviado:      'Enviado',
  entregado:    'Entregado',
  cancelado:    'Cancelado',
};

const TERM_LABEL: Record<string, string> = {
  contado:     'Contado',
  pronto_pago: 'Pronto pago 30d',
  credito90:   '90 días',
};

export default function Account() {
  const [orders, setOrders]     = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [repeating, setRepeating] = useState<string | null>(null);
  const navigate                = useNavigate();
  const clear                   = useCart(s => s.clear);

  useEffect(() => {
    Promise.all([ordersApi.list(), invoicesApi.me()])
      .then(([o, inv]) => { setOrders(o.data); setInvoices(inv.data); })
      .catch(() => setError('Error cargando datos.'))
      .finally(() => setLoading(false));
  }, []);

  const repeatOrder = async (orderId: string) => {
    setRepeating(orderId);
    try {
      await ordersApi.repeat(orderId);
      navigate('/pedido');
    } catch {
      // repeat endpoint loads items into a new cart; on error just go to catalog
      navigate('/catalogo');
    } finally {
      setRepeating(null);
    }
  };

  if (loading) return <Spinner />;
  if (error)   return <PageError message={error} />;

  const pendingInvoices = invoices.filter(f => f.status !== 'pagada');
  const totalCartera    = pendingInvoices.reduce((s, f) => s + f.amount, 0);

  return (
    <div className="page">
      <h1 className="h1 mb-6">Mi cuenta</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
        {/* Pedidos */}
        <div>
          <h3 className="h3 mb-3">Pedidos</h3>
          <div className="card p-0 overflow-hidden">
            {orders.length === 0 ? (
              <p className="text-ink-mute text-center py-10">Aún no tienes pedidos.</p>
            ) : (
              orders.map((o, idx) => (
                <div
                  key={o.id}
                  className={`flex items-start justify-between gap-4 px-5 py-4
                              ${idx < orders.length - 1 ? 'border-b border-rule' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-display font-semibold text-[13px] text-ink">{o.code}</span>
                      <span className={`pill ${o.status === 'entregado' ? 'pill-ok' : 'pill-proc'}`}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </div>
                    <p className="text-[12px] text-ink-mute">
                      {new Date(o.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}{TERM_LABEL[o.paymentTerm] ?? o.paymentTerm}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                    <p className="font-display font-semibold text-[14px] text-ink">{cop(o.total)}</p>
                    <button
                      className="text-[11px] font-medium text-green border border-green/40
                                 rounded-brand px-2.5 py-1 hover:bg-green hover:text-ivory
                                 transition-colors disabled:opacity-50"
                      disabled={repeating === o.id}
                      onClick={() => repeatOrder(o.id)}
                    >
                      {repeating === o.id ? '…' : 'Repetir'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cartera */}
        <div>
          <h3 className="h3 mb-3">Cartera</h3>
          <div className="card p-0 overflow-hidden">
            {invoices.length === 0 ? (
              <p className="text-ink-mute text-center py-10">Sin facturas pendientes.</p>
            ) : (
              <>
                {invoices.map((f, idx) => {
                  const isPaid   = f.status === 'pagada';
                  const isVencida = f.status === 'vencida';
                  return (
                    <div
                      key={f.id}
                      className={`flex items-start justify-between gap-4 px-5 py-4 transition-opacity
                                  ${idx < invoices.length - 1 ? 'border-b border-rule' : ''}
                                  ${isPaid ? 'opacity-55' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[12px] text-ink">{f.id.slice(0, 8).toUpperCase()}</span>
                          <span className={`pill ${isPaid ? 'pill-ok' : isVencida ? 'pill-risk' : 'pill-proc'}`}>
                            {isPaid ? 'Pagada' : isVencida ? 'Vencida' : 'Pendiente'}
                          </span>
                        </div>
                        <p className="text-[12px] text-ink-mute">
                          Vence {new Date(f.dueDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                          {f.daysOverdue && f.daysOverdue > 0 ? ` · ${f.daysOverdue} días de mora` : ''}
                        </p>
                        {!isPaid && f.status === 'pendiente' && (
                          <p className="text-[11px] text-ok mt-0.5">
                            Pagando hoy aplica −5%: {cop(Math.round(f.amount * 0.95))}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                        <p className="font-display font-semibold text-[14px] text-ink">{cop(f.amount)}</p>
                        {!isPaid && (
                          <a
                            href={`/api/invoices/${f.id}/pay`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-medium text-green border border-green/40
                                       rounded-brand px-2.5 py-1 hover:bg-green hover:text-ivory transition-colors"
                          >
                            Pagar PSE
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
                {pendingInvoices.length > 0 && (
                  <div className="flex justify-between items-center px-5 py-3 bg-ivory border-t border-rule">
                    <span className="text-[12px] font-semibold text-ink-soft">Total en cartera</span>
                    <span className="font-display font-bold text-[15px] text-ink">{cop(totalCartera)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
