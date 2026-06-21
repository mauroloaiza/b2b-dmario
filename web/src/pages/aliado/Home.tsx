import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsApi, catalogApi, type ClientMe, type Product } from '../../api/client';
import { useCart } from '../../store/cart';
import { WatchGlyph } from '../../components/WatchGlyph';
import { Spinner, PageError } from '../../components/Spinner';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const pvpSug = (mayo: number) => Math.round(mayo * 1.35 / 100) * 100;

export default function Home() {
  const [client, setClient]     = useState<ClientMe | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError]       = useState('');
  const navigate                = useNavigate();
  const add                     = useCart(s => s.add);

  useEffect(() => {
    Promise.all([clientsApi.me(), catalogApi.list()])
      .then(([c, p]) => { setClient(c); setProducts(p); })
      .catch(() => setError('Error cargando datos.'));
  }, []);

  if (error) return <PageError message={error} />;
  if (!client) return <Spinner />;

  const disponible = client.creditAvailable;
  const usedPct    = client.creditLimit > 0 ? (client.creditUsed / client.creditLimit) * 100 : 0;
  const sugeridos  = products.filter(p => p.active && p.stock > 0).slice(0, 3);

  return (
    <div className="page">
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 mb-6">
        <div className="flex flex-col justify-center">
          <p className="eyebrow mb-2">Bienvenido de nuevo</p>
          <h1 className="h1 mb-2">{client.name}</h1>
          {client.vendor && (
            <p className="text-[13px] text-ink-soft">
              Tu asesor: <strong className="text-ink">{client.vendor.name}</strong>
            </p>
          )}
        </div>

        {/* Cupo card */}
        <div className="cupo-card">
          <div className="flex justify-between items-baseline">
            <span className="text-[12px] text-ivory/70">Cupo disponible</span>
            <strong className="font-display text-[22px] font-semibold">{cop(disponible)}</strong>
          </div>
          <div className="progress-track bg-green-soft">
            <div className="progress-bar bg-ivory/40" style={{ width: `${Math.min(usedPct, 100)}%` }} />
          </div>
          <p className="text-[11px] text-ivory/60">
            Usado {cop(client.creditUsed)} de {cop(client.creditLimit)} · crédito a 90 días
          </p>
        </div>
      </div>

      {/* Cards de acción */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Recompra */}
        <div className="card bg-green text-ivory border-green">
          <p className="eyebrow-gold mb-2">Recompra rápida</p>
          <h3 className="font-display text-[16px] font-semibold mb-2">Repite tu último pedido</h3>
          <p className="text-[13px] text-ivory/70 mb-4">
            Arma el carrito con las referencias de tu pedido anterior en un clic.
          </p>
          <button className="btn-primary" onClick={() => navigate('/catalogo')}>
            Ver catálogo y recomprar
          </button>
        </div>

        {/* Condiciones */}
        <div className="card">
          <p className="eyebrow mb-3">Condiciones vigentes</p>
          <ul className="flex flex-col gap-2.5">
            <li className="flex items-center gap-3 text-[13px]">
              <span className="font-display font-bold text-ok text-[15px] w-10 text-right">−8%</span>
              <span className="text-ink-soft">Pago de contado inmediato</span>
            </li>
            <li className="flex items-center gap-3 text-[13px]">
              <span className="font-display font-bold text-ok text-[15px] w-10 text-right">−5%</span>
              <span className="text-ink-soft">Pronto pago a 30 días</span>
            </li>
            <li className="flex items-center gap-3 text-[13px]">
              <span className="font-display font-bold text-ink text-[15px] w-10 text-right">90d</span>
              <span className="text-ink-soft">Crédito estándar con cupo</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Sugeridos */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="h3">Sugeridos para tu vitrina</h3>
        <button className="link-btn" onClick={() => navigate('/catalogo')}>
          Ver catálogo completo →
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sugeridos.map(p => (
          <div key={p.id} className="card flex gap-3 items-start p-4">
            <div className="flex-shrink-0 w-16 h-16 rounded-brand overflow-hidden">
              <WatchGlyph tone="ivory" size={64} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="mono truncate">{p.ref} · {p.line}</p>
              <p className="text-[13px] font-medium text-ink truncate">{p.name}</p>
              <p className="font-display font-semibold text-green text-[15px]">{cop(p.priceMayo)}</p>
              <p className="text-[11px] text-ink-mute">PVP sugerido: {cop(pvpSug(p.priceMayo))}</p>
            </div>
            <button
              className="flex-shrink-0 text-[11px] font-medium text-accent border border-accent-soft
                         rounded-brand px-2 py-1 hover:bg-accent-soft transition-colors whitespace-nowrap"
              onClick={() => { add(p); navigate('/pedido'); }}
            >
              + Agregar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
