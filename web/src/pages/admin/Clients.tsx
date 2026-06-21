import { useEffect, useState } from 'react';
import { adminApi, type AdminClient, type AdminVendor } from '../../api/client';
import { Spinner, PageError } from '../../components/Spinner';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const STATUS_OPTS = ['', 'activo', 'riesgo', 'inactivo'];
const SEG_OPTS    = ['', 'A', 'B', 'C'];

const STATUS_COLOR: Record<string, string> = {
  activo: 'pill-ok', riesgo: 'pill-risk', inactivo: 'pill-proc',
};

// ── Edit modal ────────────────────────────────────────────────────────────────
function ClientModal({ client, vendors, onSave, onClose }: {
  client: AdminClient; vendors: AdminVendor[];
  onSave: (dto: Partial<AdminClient & { vendorId: string }>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    creditLimit: client.creditLimit,
    status:      client.status,
    segment:     client.segment,
    vendorId:    client.vendor?.id ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true); setErr('');
    try { await onSave(form); onClose(); }
    catch (e: any) { setErr(e.message ?? 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-paper rounded-card shadow-xl w-full max-w-[420px] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="h3 mb-0.5">{client.name}</h3>
            <p className="text-[12px] text-ink-mute">{client.code} · {client.city}</p>
          </div>
          <button onClick={onClose} className="text-ink-mute hover:text-ink text-[20px]">×</button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Cupo de crédito (COP)</label>
            <input className="input w-full" type="number" value={form.creditLimit}
              onChange={e => set('creditLimit', +e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Estado</label>
              <select className="input w-full" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTS.filter(Boolean).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Segmento</label>
              <select className="input w-full" value={form.segment} onChange={e => set('segment', e.target.value)}>
                {SEG_OPTS.filter(Boolean).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">KAM asignado</label>
            <select className="input w-full" value={form.vendorId} onChange={e => set('vendorId', e.target.value)}>
              <option value="">Sin asignar</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name} — {v.zone}</option>)}
            </select>
          </div>
        </div>
        {err && <p className="text-[12px] text-risk mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button className="btn-primary flex-1" disabled={saving} onClick={submit}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminClients() {
  const [clients, setClients]   = useState<AdminClient[]>([]);
  const [vendors, setVendors]   = useState<AdminVendor[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterSegment, setFilterSegment] = useState('');
  const [editing, setEditing]   = useState<AdminClient | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [res, vs] = await Promise.all([
        adminApi.listClients(page, 30, filterStatus || undefined, filterSegment || undefined),
        vendors.length ? Promise.resolve(vendors) : adminApi.listVendors(),
      ]);
      setClients(res.data);
      setTotal(res.meta.total);
      if (!vendors.length) setVendors(vs as AdminVendor[]);
    } catch { setError('Error cargando clientes.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, filterStatus, filterSegment]);

  const save = async (id: string, dto: any) => {
    await adminApi.updateClient(id, dto);
    load();
  };

  if (error) return <PageError message={error} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="h1 mb-0.5">Clientes</h1>
          <p className="text-[13px] text-ink-mute">{total} aliados registrados</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select className="input" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">Todos los estados</option>
          {STATUS_OPTS.filter(Boolean).map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="input" value={filterSegment} onChange={e => { setFilterSegment(e.target.value); setPage(1); }}>
          <option value="">Todos los segmentos</option>
          {SEG_OPTS.filter(Boolean).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-rule bg-ivory text-[11px] text-ink-mute uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Ciudad · Seg.</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Cupo</th>
                <th className="px-4 py-3 text-right">Usado</th>
                <th className="px-4 py-3 text-right">YTD</th>
                <th className="px-4 py-3 text-left">KAM</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} className="border-b border-rule last:border-0 hover:bg-ivory/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-[11px] text-ink-mute">{c.code}</p>
                    <p className="font-medium text-ink">{c.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-ink-soft">{c.city}</p>
                    <span className="font-display font-semibold text-[11px] text-ink-mute">Seg. {c.segment}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`pill ${STATUS_COLOR[c.status] ?? 'pill-proc'}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-ink-soft">{cop(c.creditLimit)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={c.creditUsed / c.creditLimit > 0.8 ? 'text-risk font-semibold' : 'text-ink-soft'}>
                      {cop(c.creditUsed)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-display font-semibold text-green text-[13px]">
                    {cop(c.ytd)}
                  </td>
                  <td className="px-4 py-3 text-ink-mute text-[12px]">{c.vendor?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-[12px] text-green hover:underline" onClick={() => setEditing(c)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 30 && (
        <div className="flex gap-2 justify-center mt-4">
          <button className="btn-secondary px-3 py-1.5 text-[12px]" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
          <span className="text-[12px] text-ink-soft px-2 py-1.5">Pág. {page} de {Math.ceil(total / 30)}</span>
          <button className="btn-secondary px-3 py-1.5 text-[12px]" disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)}>→</button>
        </div>
      )}

      {editing && (
        <ClientModal
          client={editing}
          vendors={vendors}
          onSave={dto => save(editing.id, dto)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
