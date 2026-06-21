import { useLocation, useNavigate } from 'react-router-dom';
import type { Order } from '../../api/client';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const TERM_LABELS: Record<string, string> = {
  contado:     'Contado inmediato',
  pronto_pago: 'Pronto pago 30 días',
  credito90:   'Crédito 90 días',
};

const TERM_STEP3: Record<string, string> = {
  contado:     'Pago por transferencia o PSE para liberar el despacho',
  pronto_pago: 'Factura a 30 días — paga antes y asegura tu −5%',
  credito90:   'Factura a 90 días con tu cupo de crédito',
};

export default function Confirmation() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const order: Order = state?.order;

  if (!order) {
    return (
      <div className="page text-center py-16">
        <p className="text-ink-mute">No hay pedido para mostrar.</p>
        <button className="btn-primary mt-4" onClick={() => navigate('/')}>Ir al inicio</button>
      </div>
    );
  }

  const termLabel = TERM_LABELS[order.paymentTerm] ?? order.paymentTerm;
  const step3     = TERM_STEP3[order.paymentTerm] ?? '';
  const totalUnits = order.items?.reduce((s, i) => s + i.qty, 0) ?? 0;

  return (
    <div className="page max-w-[600px]">
      <div className="card text-center py-10 px-8">
        {/* Check */}
        <div className="w-16 h-16 rounded-full bg-ok-soft flex items-center justify-center mx-auto mb-5">
          <span className="text-ok text-[28px] font-bold">✓</span>
        </div>

        <h1 className="h1 mb-2">Pedido {order.code} confirmado</h1>
        <p className="text-[14px] text-ink-soft mb-6">
          {totalUnits} unidades · {termLabel} · total {cop(order.total)}
        </p>

        {/* Pasos */}
        <div className="text-left bg-ivory rounded-card p-5 flex flex-col gap-3 mb-6">
          <div className="flex gap-3 text-[13px]">
            <span className="font-display font-bold text-green w-5 flex-shrink-0">1.</span>
            <span className="text-ink-soft">Bodega alista tu pedido <strong className="text-ink">(24–48 h)</strong></span>
          </div>
          <div className="flex gap-3 text-[13px]">
            <span className="font-display font-bold text-green w-5 flex-shrink-0">2.</span>
            <span className="text-ink-soft">Despacho con guía a tu ciudad <strong className="text-ink">(2–4 días hábiles)</strong></span>
          </div>
          <div className="flex gap-3 text-[13px]">
            <span className="font-display font-bold text-green w-5 flex-shrink-0">3.</span>
            <span className="text-ink-soft">{step3}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button className="btn-primary" onClick={() => navigate('/cuenta')}>
            Ver mis pedidos
          </button>
          <button className="btn-secondary" onClick={() => navigate('/catalogo')}>
            Seguir comprando
          </button>
        </div>
      </div>
    </div>
  );
}
