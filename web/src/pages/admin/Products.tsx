import { useEffect, useState } from 'react';
import { adminApi, type Product } from '../../api/client';
import { Spinner, PageError } from '../../components/Spinner';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const BADGES = ['', 'TOP', 'NUEVO', 'PREMIUM', 'BAJO', 'AGOTADO'];
const LINES  = ['Alpes', 'Bern', 'Geneva', 'Lyon', 'Zürich'];

// ── Edit modal ────────────────────────────────────────────────────────────────
function ProductModal({ product, onSave, onClose }: {
  product: Partial<Product> | null;
  onSave: (dto: Partial<Product>) => Promise<void>;
  onClose: () => void;
}) {
  const isNew = !product?.id;
  const [form, setForm] = useState<Partial<Product>>(product ?? { active: true, packSize: 6, stock: 0 });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: keyof Product, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true); setErr('');
    try { await onSave(form); onClose(); }
    catch (e: any) { setErr(e.body?.message?.[0] ?? e.message ?? 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-paper rounded-card shadow-xl w-full max-w-[480px] p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="h3">{isNew ? 'Nuevo producto' : 'Editar producto'}</h3>
          <button onClick={onClose} className="text-ink-mute hover:text-ink text-[20px]">×</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {isNew && (
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Referencia (SKU)</label>
              <input className="input w-full" placeholder="DM-XXXX" value={form.ref ?? ''}
                onChange={e => set('ref', e.target.value)} />
            </div>
          )}
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Nombre</label>
            <input className="input w-full" value={form.name ?? ''}
              onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Línea</label>
            <select className="input w-full" value={form.line ?? ''} onChange={e => set('line', e.target.value)}>
              <option value="">Selecciona…</option>
              {LINES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Badge</label>
            <select className="input w-full" value={form.badge ?? ''} onChange={e => set('badge', e.target.value || null)}>
              {BADGES.map(b => <option key={b} value={b}>{b || 'Ninguno'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Precio mayorista (COP)</label>
            <input className="input w-full" type="number" value={form.priceMayo ?? ''}
              onChange={e => set('priceMayo', +e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Pack mínimo</label>
            <input className="input w-full" type="number" value={form.packSize ?? ''}
              onChange={e => set('packSize', +e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Stock</label>
            <input className="input w-full" type="number" value={form.stock ?? ''}
              onChange={e => set('stock', +e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">URL de imagen (opcional)</label>
            <input className="input w-full" placeholder="https://…" value={form.imageUrl ?? ''}
              onChange={e => set('imageUrl', e.target.value || null)} />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="active" checked={form.active ?? true}
              onChange={e => set('active', e.target.checked)} className="accent-green" />
            <label htmlFor="active" className="text-[13px] text-ink">Activo en catálogo</label>
          </div>
        </div>
        {err && <p className="text-[12px] text-risk mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button className="btn-primary flex-1" disabled={saving} onClick={submit}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filterLine, setFilterLine]       = useState('');
  const [filterActive, setFilterActive]   = useState<string>('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [modal, setModal]       = useState<Partial<Product> | null | false>(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listProducts(page, 30, filterLine || undefined,
        filterActive === '' ? undefined : filterActive === 'true',
        filterLowStock || undefined);
      setProducts(res.data);
      setTotal(res.meta.total);
    } catch { setError('Error cargando productos.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, filterLine, filterActive, filterLowStock]);

  const save = async (dto: Partial<Product>) => {
    if (dto.id) await adminApi.updateProduct(dto.id, dto);
    else        await adminApi.createProduct(dto as any);
    load();
  };

  const toggle = async (p: Product) => {
    await adminApi.updateProduct(p.id, { active: !p.active });
    setProducts(ps => ps.map(x => x.id === p.id ? { ...x, active: !x.active } : x));
  };

  if (error) return <PageError message={error} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="h1 mb-0.5">Productos</h1>
          <p className="text-[13px] text-ink-mute">{total} referencias</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({})}>+ Nuevo producto</button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select className="input" value={filterLine} onChange={e => { setFilterLine(e.target.value); setPage(1); }}>
          <option value="">Todas las líneas</option>
          {LINES.map(l => <option key={l}>{l}</option>)}
        </select>
        <select className="input" value={filterActive} onChange={e => { setFilterActive(e.target.value); setPage(1); }}>
          <option value="">Activos e inactivos</option>
          <option value="true">Solo activos</option>
          <option value="false">Solo inactivos</option>
        </select>
        <label className="flex items-center gap-2 cursor-pointer text-[13px] text-ink-soft">
          <input type="checkbox" checked={filterLowStock}
            onChange={e => { setFilterLowStock(e.target.checked); setPage(1); }}
            className="accent-green w-3.5 h-3.5" />
          Stock bajo (&lt; 10)
        </label>
      </div>

      {loading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-rule bg-ivory text-[11px] text-ink-mute uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Ref · Nombre</th>
                <th className="px-4 py-3 text-left">Línea</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-right">Pack</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-left">Badge</th>
                <th className="px-4 py-3 text-center">Activo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={p.id} className={`border-b border-rule last:border-0 ${!p.active ? 'opacity-50' : ''} hover:bg-ivory/50 transition-colors`}>
                  <td className="px-4 py-3">
                    <p className="font-mono text-[11px] text-ink-mute">{p.ref}</p>
                    <p className="font-medium text-ink">{p.name}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{p.line}</td>
                  <td className="px-4 py-3 text-right font-display font-semibold text-green">{cop(p.priceMayo)}</td>
                  <td className="px-4 py-3 text-right text-ink-soft">×{p.packSize}</td>
                  <td className={`px-4 py-3 text-right font-medium ${p.stock === 0 ? 'text-risk' : p.stock < 15 ? 'text-accent' : 'text-ink'}`}>
                    {p.stock}
                  </td>
                  <td className="px-4 py-3">
                    {p.badge && (
                      <span className="badge-proc text-[10px] px-1.5 py-0.5 rounded font-semibold">{p.badge}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggle(p)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${p.active ? 'bg-ok' : 'bg-rule'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-paper rounded-full shadow transition-all ${p.active ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-[12px] text-green hover:underline" onClick={() => setModal(p)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 30 && (
        <div className="flex gap-2 justify-center mt-4">
          <button className="btn-secondary px-3 py-1.5 text-[12px]" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
          <span className="text-[12px] text-ink-soft px-2 py-1.5">Pág. {page} de {Math.ceil(total / 30)}</span>
          <button className="btn-secondary px-3 py-1.5 text-[12px]" disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)}>→</button>
        </div>
      )}

      {modal !== false && (
        <ProductModal product={modal} onSave={save} onClose={() => setModal(false)} />
      )}
    </div>
  );
}
