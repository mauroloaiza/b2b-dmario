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
  const pay = () => { setStep('processing'); setTimeout(() => setStep('done'), 1600); };
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget && step === 'form') onClose(); }}
    >
      <div className="bg-paper rounded-card shadow-xl w-full max-w-[380px] p-6">
        {step === 'form' && (<>
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
          <select className="input w-full mb-4" value={bank} onChange={e => setBank(e.target.value)}>
            <option value="">Selecciona tu banco…</option>
            {BANKS.map(b => <option key={b}>{b}</option>)}
          </select>
          <button className="btn-primary w-full mb-2" disabled={!bank} onClick={pay}>Pagar {cop(amount)}</button>
          <button className="w-full text-center text-[12px] text-ink-mute hover:text-ink transition-colors py-1" onClick={onClose}>Cancelar</button>
        </>)}
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

// ── 4-step order tracker ───────────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: 'confirmado',  label: 'Confirmado',   icon: '✓' },
  { key: 'alistando',   label: 'Alistando',    icon: '⬡' },
  { key: 'en_ruta',     label: 'En ruta',      icon: '⟩' },
  { key: 'entregado',   label: 'Entregado',    icon: '★' },
];

function OrderTracker({ status }: { status: string }) {
  const activeIdx = STATUS_STEPS.findIndex(s => s.key === status);
  const current = Math.max(activeIdx, 0);
  return (
    <div className="flex items-center justify-between w-full mb-7">
      {STATUS_STEPS.map((step, idx) => {
        const done    = idx <= current;
        const isLast  = idx === STATUS_STEPS.length - 1;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold border-2 transition-colors
                              ${done ? 'bg-green border-green text-ivory' : 'bg-paper border-line text-ink-mute'}`}>
                {step.icon}
              </div>
              <span className={`text-[10px] font-medium tracking-wide ${done ? 'text-green' : 'text-ink-mute'}`}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={`h-[2px] flex-1 mx-1 -mt-5 ${idx < current ? 'bg-green' : 'bg-line'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const TERM_LABELS: Record<string, string> = {
  contado:     'Contado inmediato',
  pronto_pago: 'Pronto pago 30 días',
  credito90:   'Crédito 90 días',
};

function dueDateStr(order: Order): string {
  const d = new Date(order.createdAt);
  const days = order.paymentTerm === 'credito90' ? 90 : order.paymentTerm === 'pronto_pago' ? 30 : 0;
  d.setDate(d.getDate() + days);
  return days === 0 ? 'Inmediato' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

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

  const termLabel  = TERM_LABELS[order.paymentTerm] ?? order.paymentTerm;
  const totalUnits = order.items?.reduce((s, i) => s + i.qty, 0) ?? 0;
  const dueDate    = dueDateStr(order);
  const trackStatus = paid ? 'alistando' : order.status;

  return (
    <div className="page max-w-[640px]">
      <div className="card py-8 px-6">
        {/* ── Success header ─────────────────────────────────────────────── */}
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-full bg-ok-soft flex items-center justify-center mx-auto mb-4">
            <span className="text-ok text-[24px] font-bold">✓</span>
          </div>
          <h1 className="h1 mb-1">¡Pedido recibido!</h1>
          <p className="text-[13px] text-ink-mute">N.° <strong className="text-ink">{order.code}</strong></p>
        </div>

        {/* ── Order tracker ──────────────────────────────────────────────── */}
        <OrderTracker status={trackStatus} />

        {/* ── Facts grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-ivory rounded-brand p-3">
            <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-wide mb-0.5">Código</p>
            <p className="text-[14px] font-bold text-ink">{order.code}</p>
          </div>
          <div className="bg-ivory rounded-brand p-3">
            <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-wide mb-0.5">Unidades</p>
            <p className="text-[14px] font-bold text-ink">{totalUnits.toLocaleString('es-CO')}</p>
          </div>
          <div className="bg-ivory rounded-brand p-3">
            <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-wide mb-0.5">Total</p>
            <p className="text-[14px] font-bold text-green">{cop(order.total)}</p>
          </div>
          <div className="bg-ivory rounded-brand p-3">
            <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-wide mb-0.5">
              {order.paymentTerm === 'contado' ? 'Condición' : 'Vencimiento'}
            </p>
            <p className="text-[14px] font-bold text-ink">{dueDate}</p>
          </div>
        </div>

        {/* ── Delivery note ──────────────────────────────────────────────── */}
        <div className="bg-ivory rounded-brand px-4 py-3 text-[12px] text-ink-soft flex items-center gap-2 mb-6">
          <span className="text-[16px]">⟩</span>
          <span>Despacho estimado <strong className="text-ink">24–48 h hábiles</strong> · te notificamos por correo cuando salga tu pedido.</span>
        </div>

        {/* ── PSE payment for contado ────────────────────────────────────── */}
        {order.paymentTerm === 'contado' && (
          <div className="mb-5">
            {paid ? (
              <div className="bg-ok-soft text-ok rounded-brand px-4 py-3 text-[13px] font-medium text-center">
                ✓ Pago recibido — despacho liberado
              </div>
            ) : (
              <div className="bg-accent-soft rounded-brand px-4 py-3 text-center">
                <p className="text-[12px] text-ink-soft mb-2">Descuento −8% aplica con el pago inmediato · {termLabel}</p>
                <button className="btn-primary" onClick={() => setShowPse(true)}>
                  Pagar ahora por PSE · {cop(order.total)}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button className="btn-primary" onClick={() => navigate('/cuenta')}>Ver mis pedidos</button>
          <button className="btn-secondary" onClick={() => navigate('/catalogo')}>Seguir comprando</button>
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
