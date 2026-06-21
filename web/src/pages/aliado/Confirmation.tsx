import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Order } from '../../api/client';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

// ── PSE payment modal ──────────────────────────────────────────────────────────
const BANKS = ['Bancolombia', 'Davivienda', 'BBVA Colombia', 'Banco de Bogotá', 'Nequi', 'Banco de Occidente'];

function PseModal({ amount, concept, onClose, onPaid }: {
  amount: number; concept: string; onClose: () => void; onPaid: () => void;
}) {
  const [bank, setBank] = useState('');
  const [step, setStep] = useState<'form' | 'processing' | 'done'>('form');

  const pay = () => {
    setStep('processing');
    setTimeout(() => setStep('done'), 1600);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget && step === 'form') onClose(); }}
    >
      <div className="bg-paper rounded-card shadow-xl w-full max-w-[380px] p-6">
        {step === 'form' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-brand bg-navy flex items-center justify-center flex-shrink-0">
                <span className="text-ivory font-display font-bold text-[10px] tracking-wide">PSE</span>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-ink">Pago seguro en línea</p>
                <p className="text-[11px] text-ink-mute">{concept}</p>
              </div>
            </div>
            <p className="font-display font-bold text-[26px] text-green mb-4 text-center">{cop(amount)}</p>
            <label className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-1">Tu banco</label>
            <select
              className="input w-full mb-4"
              value={bank}
              onChange={e => setBank(e.target.value)}
            >
              <option value="">Selecciona tu banco…</option>
              {BANKS.map(b => <option key={b}>{b}</option>)}
            </select>
            <button className="btn-primary w-full mb-2" disabled={!bank} onClick={pay}>
              Pagar {cop(amount)}
            </button>
            <button className="w-full text-center text-[12px] text-ink-mute hover:text-ink transition-colors py-1" onClick={onClose}>
              Cancelar
            </button>
          </>
        )}
        {step === 'processing' && (
          <div className="text-center py-8">
            <div className="w-10 h-10 border-2 border-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[13px] text-ink-soft">Conectando con tu banco…</p>
          </div>
        )}
        {step === 'done' && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-ok-soft flex items-center justify-center mx-auto mb-4">
              <span className="text-ok text-[24px] font-bold">✓</span>
            </div>
            <h3 className="h3 mb-2">Pago aprobado</h3>
            <p className="text-[12px] text-ink-mute mb-5">Comprobante enviado a tu correo registrado.</p>
            <button className="btn-primary w-full" onClick={() => { onPaid(); onClose(); }}>Listo</button>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [showPse, setShowPse] = useState(false);
  const [paid, setPaid]       = useState(false);

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

        {/* PSE payment for contado */}
        {order.paymentTerm === 'contado' && (
          <div className="mt-4">
            {paid ? (
              <div className="bg-ok-soft text-ok rounded-brand px-4 py-3 text-[13px] font-medium text-center">
                ✓ Pago recibido — tu despacho queda liberado
              </div>
            ) : (
              <div className="bg-accent-soft rounded-brand px-4 py-3 text-center">
                <p className="text-[12px] text-ink-soft mb-2">Tu −8% aplica con el pago inmediato.</p>
                <button className="btn-primary" onClick={() => setShowPse(true)}>
                  Pagar ahora por PSE · {cop(order.total)}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <button className="btn-primary" onClick={() => navigate('/cuenta')}>
            Ver mis pedidos
          </button>
          <button className="btn-secondary" onClick={() => navigate('/catalogo')}>
            Seguir comprando
          </button>
        </div>
      </div>

      {showPse && (
        <PseModal
          amount={order.total}
          concept={`Pedido ${order.code} · contado −8%`}
          onClose={() => setShowPse(false)}
          onPaid={() => setPaid(true)}
        />
      )}
    </div>
  );
}
