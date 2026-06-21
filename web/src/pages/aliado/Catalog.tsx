import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { catalogApi, type Product } from '../../api/client';
import { useCart } from '../../store/cart';
import { WatchGlyph } from '../../components/WatchGlyph';
import { Badge } from '../../components/Badge';
import { Spinner, PageError } from '../../components/Spinner';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const pvpSug = (mayo: number, mgn = 35) => Math.round(mayo * (1 + mgn / 100) / 100) * 100;

const BADGES = ['TOP', 'NUEVO', 'PREMIUM', 'BAJO', 'AGOTADO'];

// ── Product detail modal ───────────────────────────────────────────────────────
function ProductDetailModal({ p, qtyInCart, onAdd, onClose }: {
  p: Product; qtyInCart: number; onAdd: () => void; onClose: () => void;
}) {
  const [mgn, setMgn] = useState(35);
  const out   = p.stock === 0;
  const tone  = p.ref.includes('4') ? 'green' : p.ref.includes('5') ? 'dark' : 'ivory';

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-paper rounded-card shadow-xl w-full max-w-[520px] flex flex-col sm:flex-row overflow-hidden">
        <div className="sm:w-[200px] flex-shrink-0">
          <WatchGlyph tone={tone} size={160} />
          <div className="relative -mt-2 px-3 pb-3"><Badge kind={p.badge} /></div>
        </div>
        <div className="flex-1 p-5 overflow-y-auto max-h-[80vh]">
          <div className="flex items-start justify-between mb-1">
            <p className="mono">{p.ref} · Línea {p.line}</p>
            <button onClick={onClose} className="text-ink-mute hover:text-ink text-[18px] leading-none ml-2">×</button>
          </div>
          <h3 className="h3 mb-2">{p.name}</h3>
          <p className="font-display font-semibold text-green text-[22px] mb-1">
            {cop(p.priceMayo)} <span className="text-[11px] font-sans font-normal text-ink-mute">IVA incl · pack ×{p.packSize}</span>
          </p>
          <p className="text-[12px] text-ink-mute mb-4">
            {out ? 'Agotado — tu asesor te avisa cuando llegue' : `Stock disponible: ${p.stock} unidades`}
          </p>
          <div className="bg-ivory rounded-brand p-4 mb-4">
            <div className="flex justify-between items-center mb-2 text-[12px]">
              <span className="text-ink-soft">Calcula tu ganancia · margen</span>
              <strong className="text-green font-display font-semibold">{mgn}%</strong>
            </div>
            <input type="range" min={25} max={60} step={5} value={mgn}
              onChange={e => setMgn(+e.target.value)}
              className="w-full h-1.5 rounded-full appearance-none bg-rule accent-green mb-3 cursor-pointer"
            />
            <div className="flex flex-col gap-1.5">
              {[
                { label: 'PVP en tu vitrina',               val: cop(pvpSug(p.priceMayo, mgn)),             bold: false },
                { label: 'Ganancia por unidad',              val: cop(pvpSug(p.priceMayo, mgn) - p.priceMayo),  bold: true  },
                { label: `Ganancia por pack ×${p.packSize}`, val: cop((pvpSug(p.priceMayo, mgn) - p.priceMayo) * p.packSize), bold: true },
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
            {out ? 'Sin stock' : `Agregar pack ×${p.packSize} · ${cop(p.priceMayo * p.packSize)}`}
          </button>
          {qtyInCart > 0 && <p className="text-center text-[11px] text-ok mt-2">Ya tienes {qtyInCart} und en tu pedido</p>}
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
          {cop(p.priceMayo)}{' '}<span className="text-[10px] font-sans font-normal text-ink-mute">IVA incluido</span>
        </p>
        <div className="flex justify-between text-[11px] text-ink-mute mt-1 mb-3">
          <span>PVP sugerido (+35%): {cop(pvpSug(p.priceMayo))}</span>
          <span className={low ? 'text-risk font-medium' : ''}>
            {out ? 'Agotado' : low ? `¡Solo ${p.stock}!` : `Stock: ${p.stock}`}
          </span>
        </div>
        <button
          className={`mt-auto text-[12px] font-display font-semibold tracking-[0.04em] min-h-[38px] rounded-brand border transition-colors
                      ${out ? 'border-rule text-ink-mute cursor-not-allowed'
                        : qtyInCart > 0 ? 'border-green bg-green text-ivory hover:bg-green-soft'
                        : 'border-green text-green hover:bg-green hover:text-ivory'}`}
          disabled={out}
          onClick={onAdd}
        >
          {out ? 'Sin stock' : qtyInCart > 0 ? `En pedido (${qtyInCart}) · agregar ${p.packSize} más` : `Agregar pack ×${p.packSize}`}
        </button>
      </div>
    </div>
  );
}

export default function Catalog() {
  const [searchParams]              = useSearchParams();
  const [products, setProducts]     = useState<Product[]>([]);
  const [error, setError]           = useState('');
  const [lines, setLines]           = useState<string[]>([]);
  const [selLines, setSelLines]     = useState<Set<string>>(new Set());
  const [selBadges, setSelBadges]   = useState<Set<string>>(new Set());
  const [q, setQ]                   = useState(searchParams.get('q') ?? '');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detail, setDetail]         = useState<Product | null>(null);
  const { items, add }              = useCart();
  const navigate                    = useNavigate();

  useEffect(() => {
    catalogApi.list().then(ps => {
      setProducts(ps);
      setLines([...new Set(ps.map(p => p.line))].sort());
    }).catch(() => setError('Error cargando catálogo.'));
  }, []);

  // Sincronizar query param ?q= con el buscador
  useEffect(() => {
    const qParam = searchParams.get('q') ?? '';
    setQ(qParam);
  }, [searchParams]);

  if (error)                        return <PageError message={error} />;
  if (!products.length && !error)   return <Spinner />;

  const toggleLine  = (l: string) => setSelLines(s  => { const n = new Set(s); n.has(l) ? n.delete(l) : n.add(l); return n; });
  const toggleBadge = (b: string) => setSelBadges(s => { const n = new Set(s); n.has(b) ? n.delete(b) : n.add(b); return n; });
  const clearAll    = () => { setSelLines(new Set()); setSelBadges(new Set()); setQ(''); };

  const list = products.filter(p =>
    p.active &&
    (selLines.size  === 0 || selLines.has(p.line)) &&
    (selBadges.size === 0 || (p.badge && selBadges.has(p.badge))) &&
    (q === '' || (p.name + p.ref).toLowerCase().includes(q.toLowerCase()))
  );

  const hasFilters = selLines.size > 0 || selBadges.size > 0 || q !== '';

  return (
    <div className="page max-w-[1200px]">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="h1 mb-0.5">Catálogo mayorista</h1>
          <p className="text-[12px] text-ink-mute">
            Precio por unidad · IVA incluido · Pedido mínimo por pack · {list.length} referencias
          </p>
        </div>
        {/* Mobile filter toggle */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="md:hidden btn-secondary text-[12px] flex items-center gap-1.5"
        >
          ⊟ Filtros {hasFilters ? `(${selLines.size + selBadges.size + (q ? 1 : 0)})` : ''}
        </button>
      </div>

      <div className="flex gap-6">
        {/* ── Sidebar de filtros ───────────────────────────────────────── */}
        <aside className={`flex-shrink-0 w-52 space-y-6
                           ${sidebarOpen ? 'block' : 'hidden'} md:block`}>

          {/* Búsqueda */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-mute mb-2">Buscar</p>
            <input
              className="input w-full text-[13px]"
              placeholder="Referencia o nombre…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>

          {/* Líneas */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-mute mb-2">Línea</p>
            <div className="space-y-1.5">
              {lines.map(l => (
                <label key={l} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selLines.has(l)}
                    onChange={() => toggleLine(l)}
                    className="w-3.5 h-3.5 accent-green rounded"
                  />
                  <span className={`text-[13px] transition-colors ${selLines.has(l) ? 'text-green font-medium' : 'text-ink-soft group-hover:text-ink'}`}>
                    {l}
                  </span>
                  <span className="ml-auto text-[10px] text-ink-mute">
                    {products.filter(p => p.line === l && p.active).length}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Badges */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-mute mb-2">Etiqueta</p>
            <div className="space-y-1.5">
              {BADGES.map(b => {
                const count = products.filter(p => p.badge === b && p.active).length;
                if (!count) return null;
                return (
                  <label key={b} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selBadges.has(b)}
                      onChange={() => toggleBadge(b)}
                      className="w-3.5 h-3.5 accent-green rounded"
                    />
                    <span className={`text-[13px] transition-colors ${selBadges.has(b) ? 'text-green font-medium' : 'text-ink-soft group-hover:text-ink'}`}>
                      {b}
                    </span>
                    <span className="ml-auto text-[10px] text-ink-mute">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Limpiar filtros */}
          {hasFilters && (
            <button onClick={clearAll} className="text-[12px] text-error hover:underline">
              × Limpiar filtros
            </button>
          )}
        </aside>

        {/* ── Grid de productos ────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {list.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-ink-mute text-[13px] mb-3">No hay referencias que coincidan.</p>
              <button onClick={clearAll} className="btn-secondary text-[12px]">Limpiar filtros</button>
            </div>
          ) : (
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
          )}
        </div>
      </div>

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
