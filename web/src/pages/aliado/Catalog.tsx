import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogApi, type Product } from '../../api/client';
import { useCart } from '../../store/cart';
import { WatchGlyph } from '../../components/WatchGlyph';
import { Badge } from '../../components/Badge';
import { Spinner, PageError } from '../../components/Spinner';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const pvpSug = (mayo: number) => Math.round(mayo * 1.35 / 100) * 100;

function ProductCard({ p, qtyInCart, onAdd }: { p: Product; qtyInCart: number; onAdd: () => void }) {
  const out = p.stock === 0;
  const low = p.stock > 0 && p.stock < 15;
  return (
    <div className={`card p-0 flex flex-col overflow-hidden transition-opacity ${out ? 'opacity-60' : ''}`}>
      <div className="relative">
        <WatchGlyph tone={p.ref.includes('4') ? 'green' : p.ref.includes('5') ? 'dark' : 'ivory'} size={130} />
        <Badge kind={p.badge} />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="mono mb-0.5">{p.ref} · Línea {p.line}</p>
        <p className="text-[14px] font-semibold text-ink mb-1 leading-snug">{p.name}</p>
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
          />
        ))}
      </div>

      {list.length === 0 && (
        <p className="text-center text-ink-mute py-12">No hay referencias que coincidan.</p>
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
