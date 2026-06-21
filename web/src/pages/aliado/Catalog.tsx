import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogApi, type Product } from '../../api/client';
import { useCart } from '../../store/cart';
import { WatchGlyph } from '../../components/WatchGlyph';
import { Badge } from '../../components/Badge';
import { Spinner, PageError } from '../../components/Spinner';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const pvpSug = (mayo: number, mgn = 35) => Math.round(mayo * (1 + mgn / 100) / 100) * 100;

// ── Product detail modal ───────────────────────────────────────────────────────
function ProductDetailModal({ p, qtyInCart, onAdd, onClose }: {
  p: Product; qtyInCart: number; onAdd: () => void; onClose: () => void;
}) {
  const [mgn, setMgn] = useState(35);
  const out  = p.stock === 0;
  const price = p.priceMayo;
  const pvp  = pvpSug(price, mgn);
  const tone  = p.ref.includes('4') ? 'green' : p.ref.includes('5') ? 'dark' : 'ivory';

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-paper rounded-card shadow-xl w-full max-w-[520px] flex flex-col sm:flex-row overflow-hidden">
        {/* Image */}
        <div className="sm:w-[200px] flex-shrink-0">
          <WatchGlyph tone={tone} size={160} />
          <div className="relative -mt-2 px-3 pb-3">
            <Badge kind={p.badge} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 overflow-y-auto max-h-[80vh]">
          <div className="flex items-start justify-between mb-1">
            <p className="mono">{p.ref} · Línea {p.line}</p>
            <button onClick={onClose} className="text-ink-mute hover:text-ink text-[18px] leading-none ml-2">×</button>
          </div>
          <h3 className="h3 mb-2">{p.name}</h3>
          <p className="font-display font-semibold text-green text-[22px] mb-1">
            {cop(price)} <span className="text-[11px] font-sans font-normal text-ink-mute">IVA incl · pack ×{p.packSize}</span>
          </p>
          <p className="text-[12px] text-ink-mute mb-4">
            {out ? 'Agotado — tu asesor te avisa cuando llegue' : `Stock disponible: ${p.stock} unidades`}
          </p>

          {/* Margin calculator */}
          <div className="bg-ivory rounded-brand p-4 mb-4">
            <div className="flex justify-between items-center mb-2 text-[12px]">
              <span className="text-ink-soft">Calcula tu ganancia · margen</span>
              <strong className="text-green font-display font-semibold">{mgn}%</strong>
            </div>
            <input
              type="range" min={25} max={60} step={5} value={mgn}
              onChange={e => setMgn(+e.target.value)}
              className="w-full h-1.5 rounded-full appearance-none bg-rule accent-green mb-3 cursor-pointer"
            />
            <div className="flex flex-col gap-1.5">
              {[
                { label: 'PVP en tu vitrina',       val: cop(pvp),                  bold: false },
                { label: 'Ganancia por unidad',      val: cop(pvp - price),          bold: true  },
                { label: `Ganancia por pack ×${p.packSize}`, val: cop((pvp - price) * p.packSize), bold: true },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-[12px]">
                  <span className="text-ink-soft">{row.label}</span>
                  <strong className={row.bold ? 'text-ok font-semibold' : 'text-ink font-medium'}>{row.val}</strong>
                </div>
              ))}
            </div>
          </div>

          <button
            className={`btn-primary w-full ${out ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={out}
            onClick={() => { onAdd(); onClose(); }}
          >
            {out ? 'Sin stock' : `Agregar pack ×${p.packSize} · ${cop(price * p.packSize)}`}
          </button>
          {qtyInCart > 0 && (
            <p className="text-center text-[11px] text-ok mt-2">Ya tienes {qtyInCart} und en tu pedido</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ p, qtyInCart, onAdd, onOpenDetail }: {
  p: Product; qtyInCart: number; onAdd: () => void; onOpenDetail: () => void;
}) {
  const out = p.stock === 0;
  const low = p.stock > 0 && p.stock < 15;
  return (
    <div className={`card p-0 flex flex-col overflow-hidden transition-opacity ${out ? 'opacity-60' : ''}`}>
      <div className="relative cursor-pointer" onClick={onOpenDetail}>
        <WatchGlyph tone={p.ref.includes('4') ? 'green' : p.ref.includes('5') ? 'dark' : 'ivory'} size={130} />
        <Badge kind={p.badge} />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="mono mb-0.5 cursor-pointer hover:text-green transition-colors" onClick={onOpenDetail}>{p.ref} · Línea {p.line}</p>
        <p className="text-[14px] font-semibold text-ink mb-1 leading-snug cursor-pointer hover:text-green transition-colors" onClick={onOpenDetail}>{p.name}</p>
        <p className="font-display font-semibold text-green text-[19px]">
          {cop(p.priceMayo)}{' '}
          <span className="text-[10px] font-sans font-normal text-ink-mute">IVA incluido</span>
        </p>
        <div className="flex justify-between text-[11px] text-ink-mute mt-1 mb-3">
          <span>PVP sugerido (+35%): {cop(pvpSug(p.priceMayo))}</span>
          <span className={low ? 'text-risk font-medium' : ''}>
            {out ? 'Agotado' : low ? `¡Solo ${p.stock}!` : `Stock: ${p.stock}`}
          </span>
        </div>
        <button
          className={`mt-auto text-[12px] font-display font-semibold tracking-[0.04em] min-h-[38px]
                      rounded-brand border transition-colors
                      ${out
                        ? 'border-rule text-ink-mute cursor-not-allowed'
                        : qtyInCart > 0
                          ? 'border-green bg-green text-ivory hover:bg-green-soft'
                          : 'border-green text-green hover:bg-green hover:text-ivory'
                      }`}
          disabled={out}
          onClick={onAdd}
        >
          {out
            ? 'Sin stock'
            : qtyInCart > 0
              ? `En pedido (${qtyInCart}) · agregar ${p.packSize} más`
              : `Agregar pack ×${p.packSize}`}
        </button>
      </div>
    </div>
  );
}

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError]       = useState('');
  const [line, setLine]         = useState('Todas');
  const [q, setQ]               = useState('');
  const [detail, setDetail]     = useState<Product | null>(null);
  const { items, add }          = useCart();
  const navigate                = useNavigate();

  useEffect(() => {
    catalogApi.list().then(setProducts).catch(() => setError('Error cargando catálogo.'));
  }, []);

  if (error) return <PageError message={error} />;
  if (!products.length && !error) return <Spinner />;

  const lines = ['Todas', ...Array.from(new Set(products.map(p => p.line)))];
  const list  = products.filter(p =>
    p.active &&
    (line === 'Todas' || p.line === line) &&
    (q === '' || (p.name + p.ref).toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="page">
      <h1 className="h1 mb-1">Catálogo mayorista</h1>
      <p className="text-[13px] text-ink-soft mb-5">
        Precio por unidad con IVA incluido · Pedido mínimo por pack · El PVP lo defines tú
      </p>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="flex flex-wrap gap-1.5">
          {lines.map(l => (
            <button
              key={l}
              onClick={() => setLine(l)}
              className={`text-[12px] font-display font-medium px-3 py-1.5 rounded-full border transition-colors
                          ${line === l
                            ? 'bg-green text-ivory border-green'
                            : 'border-rule text-ink-soft hover:border-green hover:text-green bg-paper'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <input
          className="input ml-auto w-[200px]"
          placeholder="Buscar referencia…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {list.map(p => (
          <ProductCard
            key={p.id}
            p={p}
            qtyInCart={items[p.id]?.qty ?? 0}
            onAdd={() => add(p)}
            onOpenDetail={() => setDetail(p)}
          />
        ))}
      </div>

      {list.length === 0 && (
        <p className="text-center text-ink-mute py-12">No hay referencias que coincidan.</p>
      )}

      {/* Product detail modal */}
      {detail && (
        <ProductDetailModal
          p={detail}
          qtyInCart={items[detail.id]?.qty ?? 0}
          onAdd={() => add(detail)}
          onClose={() => setDetail(null)}
        />
      )}

      {/* Floating cart button */}
      {Object.keys(items).length > 0 && (
        <div className="fixed bottom-6 right-6">
          <button
            className="btn-primary shadow-lg flex items-center gap-2 px-6"
            onClick={() => navigate('/pedido')}
          >
            Ver pedido ({Object.values(items).reduce((s, i) => s + i.qty, 0)} und)
          </button>
        </div>
      )}
    </div>
  );
}
