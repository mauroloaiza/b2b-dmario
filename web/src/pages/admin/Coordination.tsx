import { useEffect, useState } from 'react';
import { adminApi, type AdminClient, type AdminVendor } from '../../api/client';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const SEG_COLOR: Record<string, string> = {
  A: 'bg-ok/20 text-ok',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-line text-ink-mute',
};

const STATUS_LABEL: Record<string, string> = {
  activo:     'Activo',
  riesgo:     'En riesgo',
  inactivo:   'Inactivo',
  prospecto:  'Prospecto',
};

const STATUS_COLOR: Record<string, string> = {
  activo:    'bg-ok/20 text-ok',
  riesgo:    'bg-amber-100 text-amber-700',
  inactivo:  'bg-error/20 text-error',
  prospecto: 'bg-line text-ink-mute',
};

export default function Coordination() {
  const [clients,  setClients]  = useState<AdminClient[]>([]);
  const [vendors,  setVendors]  = useState<AdminVendor[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [editVId,  setEditVId]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [filter,   setFilter]   = useState<'all' | 'orphan' | 'riesgo'>('all');

  useEffect(() => {
    Promise.all([
      adminApi.listClients(1, 200),
      adminApi.listVendors(),
    ]).then(([c, v]) => {
      setClients(c.data);
      setVendors(v);
      setLoading(false);
    });
  }, []);

  const save = async (id: string) => {
    setSaving(true);
    const updated = await adminApi.updateClient(id, { vendorId: editVId || undefined });
    setClients(cs => cs.map(c => c.id === id ? { ...c, vendor: updated.vendor } : c));
    setEditId(null);
    setSaving(false);
  };

  const filtered = clients.filter(c => {
    if (filter === 'orphan')  return !c.vendor;
    if (filter === 'riesgo')  return c.status === 'riesgo';
    return true;
  });

  if (loading) return <div className="text-center py-16 text-ink-mute text-[13px]">Cargando…</div>;

  const orphanCount = clients.filter(c => !c.vendor).length;
  const riesgoCount = clients.filter(c => c.status === 'riesgo').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Coordinación comercial</h1>
        <p className="text-[13px] text-ink-mute mt-0.5">Asignación de vendedores · clientes sin cobertura · alertas de riesgo</p>
      </div>

      {/* ── Summary chips ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: 'all',    label: `Todos (${clients.length})`,         color: 'bg-ivory border border-line text-ink' },
          { key: 'orphan', label: `Sin vendedor (${orphanCount})`,      color: orphanCount > 0 ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-ivory border border-line text-ink-mute' },
          { key: 'riesgo', label: `En riesgo (${riesgoCount})`,         color: riesgoCount > 0 ? 'bg-error/10 border border-error/30 text-error' : 'bg-ivory border border-line text-ink-mute' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-4 py-2 rounded-brand text-[12px] font-medium transition-all ${f.color} ${filter === f.key ? 'ring-2 ring-green/40' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Vendor coverage overview ─────────────────────────────────────── */}
      <div className="card p-5">
        <h2 className="h2 mb-3">Cobertura por vendedor</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-line rounded-brand p-3 text-center">
            <p className="text-[10px] text-ink-mute uppercase tracking-wide mb-1">Sin asignar</p>
            <p className={`text-[22px] font-display font-bold ${orphanCount > 0 ? 'text-amber-600' : 'text-ok'}`}>{orphanCount}</p>
          </div>
          {vendors.map(v => {
            const count = clients.filter(c => c.vendor?.id === v.id).length;
            return (
              <div key={v.id} className="border border-line rounded-brand p-3 text-center">
                <p className="text-[10px] text-ink-mute uppercase tracking-wide mb-1 truncate">{v.name}</p>
                <p className="text-[22px] font-display font-bold text-green">{count}</p>
                <p className="text-[10px] text-ink-mute">{v.zone}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Client table ─────────────────────────────────────────────────── */}
      <div className="card p-5">
        <h2 className="h2 mb-3">
          {filter === 'all' ? 'Todos los clientes' : filter === 'orphan' ? 'Sin vendedor asignado' : 'Clientes en riesgo'}
          <span className="text-ink-mute text-[13px] font-normal ml-2">({filtered.length})</span>
        </h2>
        <div className="overflow-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-ink-mute text-[10px] uppercase tracking-wide border-b border-line">
                <th className="pb-2 pr-4">Cliente</th>
                <th className="pb-2 pr-4">Ciudad</th>
                <th className="pb-2 pr-4">Seg.</th>
                <th className="pb-2 pr-4">Estado</th>
                <th className="pb-2 pr-4">YTD</th>
                <th className="pb-2">Vendedor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-line/50 hover:bg-ivory/50 align-middle">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-ink leading-tight">{c.name}</p>
                    <p className="text-[10px] text-ink-mute">{c.code}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-ink-mute">{c.city}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${SEG_COLOR[c.segment] ?? 'bg-line text-ink'}`}>
                      {c.segment}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLOR[c.status] ?? 'bg-line text-ink'}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-semibold text-green">{cop(c.ytd)}</td>
                  <td className="py-2.5">
                    {editId === c.id ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          className="input text-[11px] py-1 pr-7"
                          value={editVId}
                          onChange={e => setEditVId(e.target.value)}
                        >
                          <option value="">Sin asignar</option>
                          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <button
                          onClick={() => save(c.id)}
                          disabled={saving}
                          className="text-[10px] bg-green text-ivory px-2 py-1 rounded font-medium disabled:opacity-50"
                        >
                          {saving ? '…' : 'OK'}
                        </button>
                        <button onClick={() => setEditId(null)} className="text-[10px] text-ink-mute hover:text-ink px-1">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditId(c.id); setEditVId(c.vendor?.id ?? ''); }}
                        className={`text-[11px] ${c.vendor ? 'text-ink' : 'text-amber-600 font-medium'} hover:underline`}
                      >
                        {c.vendor ? c.vendor.name : '⚠ Sin asignar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-ink-mute text-[13px] py-8">No hay clientes en este filtro.</p>
          )}
        </div>
      </div>
    </div>
  );
}
