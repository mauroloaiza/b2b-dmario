import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { kamApi, catalogApi, type Product } from '../../api/client';
import { useCart } from '../../store/cart';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

interface KamClient {
  id: string; code: string; name: string; city: string;
  segment: string; status: string;
  creditLimit: number; creditUsed: number; creditAvailable: number; creditUsedPct: number;
  ytd: number; lastOrderAt?: string;
}

const SEG_COLOR: Record<string, string> = {
  A: 'bg-ok/20 text-ok',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-line text-ink-mute',
};

const STATUS_LABEL: Record<string, string> = {
  activo:    'Activo',
  riesgo:    'En riesgo',
  inactivo:  'Inactivo',
  prospecto: 'Prospecto',
};

export default function Route() {
  const navigate  = useNavigate();
  const cartAdd   = useCart(s => s.add);
  const cartClear = useCart(s => s.clear);
  const [clients,   setClients]   = useState<KamClient[]>([]);
  const [products,  setProducts]  = useState<Product[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [proxyId,   setProxyId]   = useState<string | null>(null);
  const [proxyName, setProxyName] = useState('');
  const [showProxy, setShowProxy] = useState(false);
  const [filter,    setFilter]    = useState<'all' | 'visitar' | 'riesgo'>('all');

  useEffect(() => {
    Promise.all([
      kamApi.clients(1, 100),
      catalogApi.list(),
    ]).then(([c, p]) => {
      setClients(c.data);
      setProducts(p);
      setLoading(false);
    });
  }, []);

  const today = new Date();

  const filtered = clients.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.code.includes(search)) return false;
    if (filter === 'riesgo') return c.status === 'riesgo' || c.status === 'inactivo';
    if (filter === 'visitar') {
      if (!c.lastOrderAt) return true;
      const last = new Date(c.lastOrderAt);
      return (today.getTime() - last.getTime()) > 30 * 86400000;
    }
    return true;
  });

  const startProxy = (client: KamClient) => {
    setProxyId(client.id);
    setProxyName(client.name);
    cartClear();
    setShowProxy(true);
  };

  const exitProxy = () => {
    setProxyId(null);
    setProxyName('');
    setShowProxy(false);
  };

  if (loading) return <div className="page text-center py-16 text-ink-mute text-[13px]">Cargando ruta…</div>;

  const visitCount = clients.filter(c => {
    if (!c.lastOrderAt) return true;
    return (today.getTime() - new Date(c.lastOrderAt).getTime()) > 30 * 86400000;
  }).length;

  const riskCount  = clients.filter(c => c.status === 'riesgo' || c.status === 'inactivo').length;

  // ── Proxy mode: order on behalf of client ───────────────────────────────────
  if (showProxy && proxyId) {
    const client = clients.find(c => c.id === proxyId);
    return (
      <div className="page max-w-[700px]">
        {/* proxy banner */}
        <div className="bg-accent text-ivory rounded-card px-5 py-3 flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80">Modo proxy — pedido a nombre de</p>
            <p className="text-[15px] font-display font-bold">{proxyName}</p>
          </div>
          <button onClick={exitProxy} className="text-[11px] font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-brand transition-colors">
            ✕ Salir
          </button>
        </div>

        {/* credit summary */}
        {client && (
          <div className="card p-4 mb-5 flex gap-4 text-[12px]">
            <div>
              <p className="text-ink-mute text-[10px] uppercase tracking-wide">Cupo disponible</p>
              <p className="font-display font-bold text-[18px] text-green">{cop(client.creditAvailable)}</p>
            </div>
            <div className="border-l border-line pl-4">
              <p className="text-ink-mute text-[10px] uppercase tracking-wide">YTD</p>
              <p className="font-display font-bold text-[18px] text-ink">{cop(client.ytd)}</p>
            </div>
            <div className="border-l border-line pl-4">
              <p className="text-ink-mute text-[10px] uppercase tracking-wide">Segmento</p>
              <p className="font-display font-bold text-[18px] text-ink">{client.segment}</p>
            </div>
          </div>
        )}

        {/* quick product grid */}
        <div className="card p-5">
          <h2 className="h2 mb-3">Catálogo rápido</h2>
          <p className="text-[12px] text-ink-mute mb-4">Agrega productos al carrito y finaliza el pedido en nombre del cliente.</p>
          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-auto">
            {products.filter(p => p.active).slice(0, 20).map(p => (
              <div key={p.id} className="border border-line rounded-brand p-3 text-[12px]">
                <p className="font-medium text-ink leading-tight truncate">{p.name}</p>
                <p className="text-[10px] text-ink-mute">{p.ref} · pack {p.packSize}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-semibold text-green">{cop(p.priceMayo)}</span>
                  <button
                    onClick={() => cartAdd(p)}
                    className="text-[10px] bg-green text-ivory px-2 py-1 rounded font-medium hover:bg-green/90 transition-colors"
                  >
                    + Agregar
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => navigate('/pedido')}
              className="btn-primary flex-1"
            >
              Ver carrito y finalizar
            </button>
            <button onClick={exitProxy} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal route view ───────────────────────────────────────────────────────
  return (
    <div className="page max-w-[800px]">
      <div className="mb-5">
        <h1 className="h1">Vendedor de ruta</h1>
        <p className="text-[13px] text-ink-mute mt-0.5">Agenda de visitas · modo proxy · alertas de clientes</p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card py-4 px-4 text-center">
          <p className="text-[10px] text-ink-mute uppercase tracking-wide mb-1">Cartera total</p>
          <p className="text-[20px] font-display font-bold text-green">{clients.length}</p>
        </div>
        <div className="card py-4 px-4 text-center">
          <p className="text-[10px] text-ink-mute uppercase tracking-wide mb-1">Por visitar</p>
          <p className={`text-[20px] font-display font-bold ${visitCount > 0 ? 'text-amber-600' : 'text-ok'}`}>{visitCount}</p>
        </div>
        <div className="card py-4 px-4 text-center">
          <p className="text-[10px] text-ink-mute uppercase tracking-wide mb-1">En riesgo</p>
          <p className={`text-[20px] font-display font-bold ${riskCount > 0 ? 'text-error' : 'text-ok'}`}>{riskCount}</p>
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: 'all',     label: 'Todos' },
          { key: 'visitar', label: `Por visitar (${visitCount})` },
          { key: 'riesgo',  label: `En riesgo (${riskCount})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-3 py-1.5 rounded-brand text-[12px] font-medium transition-all
                        ${filter === f.key ? 'bg-green text-ivory' : 'bg-ivory border border-line text-ink-mute hover:text-ink'}`}
          >
            {f.label}
          </button>
        ))}
        <input
          className="input flex-1 min-w-[160px] text-[13px] py-1.5"
          placeholder="Buscar cliente…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Client list */}
      <div className="space-y-2">
        {filtered.map(c => {
          const lastDate    = c.lastOrderAt ? new Date(c.lastOrderAt) : null;
          const daysSince   = lastDate ? Math.floor((today.getTime() - lastDate.getTime()) / 86400000) : null;
          const needsVisit  = daysSince === null || daysSince > 30;

          return (
            <div key={c.id} className={`card p-4 flex items-center gap-4 ${needsVisit ? 'border-l-2 border-amber-400' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-ink text-[13px]">{c.name}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${SEG_COLOR[c.segment] ?? 'bg-line'}`}>{c.segment}</span>
                  <span className="text-[10px] text-ink-mute">{STATUS_LABEL[c.status] ?? c.status}</span>
                </div>
                <p className="text-[11px] text-ink-mute">{c.city} · {c.code}</p>
                <div className="flex gap-3 mt-1 text-[11px]">
                  <span className="text-green font-semibold">YTD {cop(c.ytd)}</span>
                  <span className="text-ink-mute">
                    {daysSince === null ? '⚠ Sin pedidos' : `Último pedido: hace ${daysSince}d`}
                  </span>
                </div>
              </div>

              {/* cupo bar */}
              <div className="hidden md:block w-28">
                <p className="text-[9px] text-ink-mute uppercase tracking-wide mb-1">Cupo usado</p>
                <div className="h-2 rounded-full bg-line overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.creditUsedPct >= 90 ? 'bg-error' : c.creditUsedPct >= 70 ? 'bg-amber-400' : 'bg-green'}`}
                    style={{ width: `${Math.min(c.creditUsedPct, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-ink-mute mt-0.5">{Math.round(c.creditUsedPct)}%</p>
              </div>

              <button
                onClick={() => startProxy(c)}
                className="btn-primary text-[11px] py-1.5 px-3 flex-shrink-0"
              >
                Tomar pedido
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-ink-mute text-[13px] py-8">No hay clientes en este filtro.</p>
        )}
      </div>
    </div>
  );
}
