import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ordersApi, invoicesApi, clientsApi,
  type Order, type Invoice, type ClientMe, type RecompraItem,
} from '../../api/client';
import { useCart } from '../../store/cart';
import { useAuth } from '../../store/auth';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const TERM_LABEL: Record<string, string> = {
  contado:     'Contado',
  pronto_pago: 'Pronto pago 30d',
  credito90:   '90 días',
};

const STATUS_LABEL: Record<string, string> = {
  pendiente:   'Pendiente',
  confirmado:  'Confirmado',
  alistamiento:'Alistando',
  alistando:   'Alistando',
  en_ruta:     'En ruta',
  entregado:   'Entregado',
  cancelado:   'Cancelado',
};

const STATUS_PILL: Record<string, string> = {
  entregado:  'bg-ok/20 text-ok',
  en_ruta:    'bg-blue-100 text-blue-700',
  alistando:  'bg-amber-100 text-amber-700',
  alistamiento:'bg-amber-100 text-amber-700',
  pendiente:  'bg-line text-ink-mute',
  confirmado: 'bg-ok/10 text-ok',
  cancelado:  'bg-error/20 text-error',
};

// Puntos de lealtad: 1 COP ≈ 0.000259 puntos (alineado al prototipo)
const pts = (ytd: number) => Math.round(ytd * 0.000259).toLocaleString('es-CO');
const nextPrize = (ytd: number) => {
  const p = Math.round(ytd * 0.000259);
  const thresholds = [5000, 10000, 15000, 25000, 50000];
  return thresholds.find(t => t > p) ?? thresholds[thresholds.length - 1];
};

export default function Account() {
  const navigate   = useNavigate();
  const user       = useAuth(s => s.user);
  const cartAdd    = useCart(s => s.add);

  const [me,        setMe]        = useState<ClientMe | null>(null);
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [invoices,  setInvoices]  = useState<Invoice[]>([]);
  const [recompra,  setRecompra]  = useState<RecompraItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [repeating, setRepeating] = useState<string | null>(null);
  const [added,     setAdded]     = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      clientsApi.me(),
      ordersApi.list(1, 5),
      invoicesApi.me(),
      ordersApi.recompra(),
    ]).then(([m, o, inv, rec]) => {
      setMe(m);
      setOrders(o.data);
      setInvoices(inv.data);
      setRecompra(rec);
    }).finally(() => setLoading(false));
  }, []);

  const repeatOrder = async (orderId: string) => {
    setRepeating(orderId);
    try {
      await ordersApi.repeat(orderId);
      navigate('/pedido');
    } catch {
      navigate('/catalogo');
    } finally {
      setRepeating(null);
    }
  };

  const addToCart = (item: RecompraItem) => {
    cartAdd({
      id: item.productId, ref: item.ref, name: item.name,
      priceMayo: item.priceMayo, packSize: item.packSize,
      stock: 9999, active: true,
    } as any);
    setAdded(item.productId);
    setTimeout(() => setAdded(null), 1800);
  };

  if (loading) {
    return (
      <div className="page flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!me) return null;

  const pendingInvoices = invoices.filter(f => f.status !== 'pagada');
  const totalCartera    = pendingInvoices.reduce((s, f) => s + f.amount, 0);
  const creditPct       = me.creditLimit > 0 ? (me.creditUsed / me.creditLimit) * 100 : 0;
  const loyaltyPts      = pts(me.ytd);
  const nextPts         = nextPrize(me.ytd);
  const vendorPhone     = (me.vendor as any)?.phone;
  const vendorName      = me.vendor?.name;

  return (
    <div className="page max-w-[1000px]">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <p className="text-[11px] font-semibold text-ink-mute uppercase tracking-widest mb-1">Mi cuenta</p>
          <h1 className="font-display font-bold text-[28px] text-ink leading-tight">
            Hola, {me.name}
          </h1>
          <p className="text-[13px] text-ink-mute mt-1">
            Cliente {me.segment} · NIT {me.code} · {me.city}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {vendorPhone && (
            <a
              href={`https://wa.me/${vendorPhone.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(vendorName ?? '')}%2C%20necesito%20ayuda%20con%20mi%20cuenta`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-[12px] flex items-center gap-1.5"
            >
              <span>💬</span> WhatsApp con {vendorName?.split(' ')[0] ?? 'vendedor'}
            </a>
          )}
          <button
            onClick={() => alert('Función disponible próximamente.')}
            className="btn-secondary text-[12px] flex items-center gap-1.5"
          >
            <span>↓</span> Descargar estado
          </button>
        </div>
      </div>

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
        {/* YTD */}
        <div className="card py-5 px-5">
          <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Compras YTD</p>
          <p className="font-display font-bold text-[22px] text-ink leading-tight">{cop(me.ytd)}</p>
          <div className="mt-2 h-[28px] flex items-end gap-px opacity-40">
            {[30, 45, 38, 55, 48, 62, 58, 75, 70, 85, 80, 100].map((h, i) => (
              <div key={i} className="flex-1 bg-green rounded-sm" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* Cupo */}
        <div className="card py-5 px-5">
          <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Cupo disponible</p>
          <p className="font-display font-bold text-[22px] text-green leading-tight">{cop(me.creditAvailable)}</p>
          <p className="text-[11px] text-ink-mute mt-1">de {cop(me.creditLimit)} aprobado</p>
          <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
            <div
              className={`h-full rounded-full ${creditPct >= 90 ? 'bg-error' : creditPct >= 70 ? 'bg-amber-400' : 'bg-green'}`}
              style={{ width: `${Math.min(creditPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Cartera */}
        <div className="card py-5 px-5">
          <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Saldo en cartera</p>
          <p className={`font-display font-bold text-[22px] leading-tight ${totalCartera > 0 ? 'text-ink' : 'text-ok'}`}>
            {cop(totalCartera)}
          </p>
          <p className="text-[11px] text-ink-mute mt-1">
            {pendingInvoices.length > 0
              ? `${pendingInvoices.length} factura${pendingInvoices.length > 1 ? 's' : ''} pendiente${pendingInvoices.length > 1 ? 's' : ''}`
              : 'Al día ✓'}
          </p>
        </div>

        {/* Puntos lealtad */}
        <div className="card py-5 px-5">
          <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Puntos lealtad</p>
          <p className="font-display font-bold text-[22px] text-amber-600 leading-tight">{loyaltyPts} pts</p>
          <p className="text-[11px] text-ink-mute mt-1">Próx. premio: {nextPts.toLocaleString('es-CO')}k</p>
        </div>
      </div>

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-[1.4fr_1fr] gap-6">

        {/* ── Recompra inteligente ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-widest">Recompra inteligente</p>
              <h2 className="font-display font-semibold text-[16px] text-ink">Productos que normalmente repite</h2>
            </div>
            <button onClick={() => navigate('/catalogo')} className="text-[12px] text-green font-medium hover:underline">
              Ver todos
            </button>
          </div>

          <div className="space-y-2">
            {recompra.length === 0 ? (
              <div className="card p-8 text-center text-ink-mute text-[13px]">
                Aún no tienes historial de compras para generar sugerencias.
                <br />
                <button onClick={() => navigate('/catalogo')} className="btn-primary mt-4 text-[12px]">
                  Explorar catálogo
                </button>
              </div>
            ) : (
              recompra.map(item => (
                <div
                  key={item.productId}
                  className={`card p-3.5 flex items-center gap-3 transition-all
                              ${item.tocaPedir ? 'border border-accent/40 bg-accent-soft/30' : ''}`}
                >
                  {/* imagen / placeholder */}
                  <div className="w-12 h-12 rounded-brand bg-ivory border border-line flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      : <span className="text-[10px] text-ink-mute font-mono leading-tight text-center px-1">{item.ref}</span>
                    }
                  </div>

                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink text-[13px] leading-tight truncate">{item.name}</p>
                    <p className="text-[11px] text-ink-mute mt-0.5">
                      Repite cada {item.avgCycleDays} días · Última: hace {item.daysSinceLastOrder} días
                      {item.tocaPedir && <span className="text-accent font-semibold"> · toca pedir</span>}
                    </p>
                  </div>

                  {/* precio + acción */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-display font-bold text-[13px] text-ink">{cop(item.priceMayo)}</p>
                    <p className="text-[10px] text-ink-mute mb-1.5">sug. {item.suggestedQty} ud</p>
                    <button
                      onClick={() => addToCart(item)}
                      className={`text-[11px] font-semibold px-3 py-1 rounded-brand transition-all
                                  ${added === item.productId
                                    ? 'bg-ok text-ivory'
                                    : 'border border-green text-green hover:bg-green hover:text-ivory'}`}
                    >
                      {added === item.productId ? '✓ Agregado' : '+ Agregar'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {recompra.length > 0 && (
            <button
              onClick={() => navigate('/pedido')}
              className="btn-primary w-full mt-3 text-[13px]"
            >
              Ver carrito y pedir
            </button>
          )}
        </div>

        {/* ── Últimos pedidos ──────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-widest">Últimos pedidos</p>
              <h2 className="font-display font-semibold text-[16px] text-ink">Historial</h2>
            </div>
            <button onClick={() => navigate('/cuenta/pedidos')} className="text-[12px] text-green font-medium hover:underline hidden">
              Ver todos
            </button>
          </div>

          <div className="card p-0 overflow-hidden divide-y divide-line">
            {orders.length === 0 ? (
              <p className="text-ink-mute text-center py-10 text-[13px]">Aún no tienes pedidos.</p>
            ) : (
              orders.map(o => (
                <div key={o.id} className="px-4 py-3.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-display font-semibold text-[13px] text-ink">{o.code}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[o.status] ?? 'bg-line text-ink-mute'}`}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-mute">
                      {new Date(o.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}{(o as any).itemCount ?? o.items?.length ?? 0} piezas{' · '}{TERM_LABEL[o.paymentTerm] ?? o.paymentTerm}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display font-semibold text-[14px] text-ink">{cop(o.total)}</p>
                    <div className="flex gap-2 mt-1.5 justify-end">
                      <button
                        onClick={() => repeatOrder(o.id)}
                        disabled={repeating === o.id}
                        className="text-[11px] font-medium text-green hover:underline disabled:opacity-50"
                      >
                        {repeating === o.id ? '…' : 'Repetir'}
                      </button>
                      <span className="text-ink-mute text-[11px]">·</span>
                      <button
                        onClick={() => alert('Descarga de factura próximamente.')}
                        className="text-[11px] font-medium text-ink-mute hover:text-ink"
                      >
                        Factura
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Cartera pendiente ───────────────────────────────────── */}
          {pendingInvoices.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-widest">Facturas</p>
                  <h2 className="font-display font-semibold text-[16px] text-ink">Saldo pendiente</h2>
                </div>
              </div>
              <div className="card p-0 overflow-hidden divide-y divide-line">
                {pendingInvoices.slice(0, 4).map(f => {
                  const isVencida = f.status === 'vencida';
                  return (
                    <div key={f.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[11px] text-ink">{f.id.slice(0, 8).toUpperCase()}</span>
                          {isVencida && (
                            <span className="text-[10px] font-semibold text-error bg-error/10 px-1.5 py-0.5 rounded-full">Vencida</span>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-mute">
                          Vence {new Date(f.dueDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                          {f.daysOverdue && f.daysOverdue > 0 ? ` · ${f.daysOverdue}d de mora` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[13px] text-ink">{cop(f.amount)}</p>
                        <a
                          href={`/api/invoices/${f.id}/pay`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-green font-medium hover:underline"
                        >
                          Pagar PSE
                        </a>
                      </div>
                    </div>
                  );
                })}
                <div className="px-4 py-2.5 bg-ivory flex justify-between text-[12px]">
                  <span className="font-semibold text-ink-soft">Total pendiente</span>
                  <span className="font-display font-bold text-ink">{cop(totalCartera)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Vendedor ─────────────────────────────────────────────── */}
          {me.vendor && (
            <div className="card p-4 mt-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green flex items-center justify-center flex-shrink-0">
                <span className="text-ivory font-display font-bold text-[14px]">
                  {me.vendor.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px] text-ink">{me.vendor.name}</p>
                <p className="text-[11px] text-ink-mute">Tu vendedor asignado</p>
              </div>
              {vendorPhone && (
                <a
                  href={`https://wa.me/${vendorPhone.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(me.vendor.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] font-semibold text-ok bg-ok/10 hover:bg-ok/20 px-3 py-1.5 rounded-brand transition-colors"
                >
                  WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
