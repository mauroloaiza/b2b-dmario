import { useEffect, useState } from 'react';
import { adminApi, type AdminClient, type AdminOrder, type AdminVendor } from '../../api/client';
import { Spinner, PageError } from '../../components/Spinner';

// ── Create client modal ────────────────────────────────────────────────────────
function NewClientModal({ vendors, onCreated, onClose }: {
  vendors: AdminVendor[];
  onCreated: (result: { client: AdminClient; tempPassword: string }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    code: '', name: '', city: '', email: '',
    segment: 'C', creditLimit: 0, vendorId: '', address: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.code || !form.name || !form.city || !form.email) {
      setErr('Código, nombre, ciudad y correo son obligatorios.'); return;
    }
    setSaving(true); setErr('');
    try {
      const result = await adminApi.createClient({
        ...form,
        creditLimit: form.creditLimit || undefined,
        vendorId:    form.vendorId    || undefined,
        address:     form.address     || undefined,
      });
      onCreated(result);
      onClose();
    } catch (e: any) {
      setErr(e.body?.message ?? e.message ?? 'Error al crear el cliente.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-paper rounded-card shadow-xl w-full max-w-[520px] p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="h3">Nuevo aliado</h3>
          <button onClick={onClose} className="text-ink-mute hover:text-ink text-[20px]">×</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">NIT / Código *</label>
            <input className="input w-full" placeholder="900123456-1" value={form.code}
              onChange={e => set('code', e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Ciudad *</label>
            <input className="input w-full" placeholder="Bogotá" value={form.city}
              onChange={e => set('city', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Nombre comercial *</label>
            <input className="input w-full" placeholder="Joyería ejemplo S.A.S." value={form.name}
              onChange={e => set('name', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Correo (login) *</label>
            <input className="input w-full" type="email" placeholder="contacto@aliado.com" value={form.email}
              onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Segmento</label>
            <select className="input w-full" value={form.segment} onChange={e => set('segment', e.target.value)}>
              <option value="A">A — Premium</option>
              <option value="B">B — Estándar</option>
              <option value="C">C — Básico</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Cupo de crédito (COP)</label>
            <input className="input w-full" type="number" placeholder="0" value={form.creditLimit || ''}
              onChange={e => set('creditLimit', +e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">KAM asignado</label>
            <select className="input w-full" value={form.vendorId} onChange={e => set('vendorId', e.target.value)}>
              <option value="">Sin asignar</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name} — {v.zone}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Dirección</label>
            <input className="input w-full" placeholder="Calle 10 # 5-20, Local 3" value={form.address}
              onChange={e => set('address', e.target.value)} />
          </div>
        </div>
        {err && <p className="text-[12px] text-risk mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button className="btn-primary flex-1" disabled={saving} onClick={submit}>
            {saving ? 'Creando…' : 'Crear aliado'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ── Credentials modal (shown after creation) ───────────────────────────────────
function CredentialsModal({ client, tempPassword, onClose }: {
  client: AdminClient; tempPassword: string; onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = `Acceso D'MARIO B2B\nCorreo: ${client.email ?? ''}\nContraseña temporal: ${tempPassword}\nURL: ${window.location.origin}/login`;

  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-paper rounded-card shadow-xl w-full max-w-[420px] p-6">
        <div className="w-12 h-12 rounded-full bg-ok-soft flex items-center justify-center mx-auto mb-4">
          <span className="text-ok text-[22px]">✓</span>
        </div>
        <h3 className="h3 text-center mb-1">Aliado creado</h3>
        <p className="text-[12px] text-ink-mute text-center mb-5">{client.name}</p>

        <div className="bg-ivory rounded-brand p-4 font-mono text-[12px] mb-4 space-y-1">
          <p><span className="text-ink-mute">Correo:</span> <strong>{client.email ?? '—'}</strong></p>
          <p><span className="text-ink-mute">Contraseña:</span> <strong className="text-accent">{tempPassword}</strong></p>
        </div>
        <p className="text-[11px] text-ink-mute text-center mb-4">
          Comparte estas credenciales con el aliado. Puede cambiar su contraseña en Mi cuenta.
        </p>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={copy}>
            {copied ? '✓ Copiado' : 'Copiar credenciales'}
          </button>
          <button className="btn-primary flex-1" onClick={onClose}>Listo</button>
        </div>
      </div>
    </div>
  );
}

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const STATUS_OPTS = ['', 'activo', 'riesgo', 'inactivo'];
const SEG_OPTS    = ['', 'A', 'B', 'C'];

const STATUS_COLOR: Record<string, string> = {
  activo: 'pill-ok', riesgo: 'pill-risk', inactivo: 'pill-proc',
};
const ORDER_STATUS_COLOR: Record<string, string> = {
  pendiente:  'bg-line text-ink-mute',
  confirmado: 'bg-ok/10 text-ok',
  alistando:  'pill-proc',
  en_ruta:    'pill-ok',
  entregado:  'bg-ivory text-ink-mute border border-rule',
  cancelado:  'bg-error/20 text-error',
};
const ORDER_STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', confirmado: 'Confirmado', alistando: 'Alistando',
  en_ruta: 'En ruta', entregado: 'Entregado', cancelado: 'Cancelado',
};
const TERM_LABEL: Record<string, string> = {
  contado: 'Contado', pronto_pago: '30 días', credito90: '90 días',
};

// ── Edit modal ─────────────────────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
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

// ── Client detail drawer ───────────────────────────────────────────────────────
function ClientDrawer({ client, vendors, onEdit, onClose, onSaved }: {
  client: AdminClient;
  vendors: AdminVendor[];
  onEdit: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [orders, setOrders]     = useState<AdminOrder[]>([]);
  const [loadingOrders, setLO]  = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    adminApi.listOrders(1, 8, undefined, client.id)
      .then(r => setOrders(r.data))
      .catch(() => {})
      .finally(() => setLO(false));
  }, [client.id]);

  const creditPct = client.creditLimit > 0 ? (client.creditUsed / client.creditLimit) * 100 : 0;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-ink/20" onClick={onClose} />

      {/* Panel */}
      <aside className="fixed top-0 right-0 h-full w-full max-w-[440px] z-50 bg-paper shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-rule flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`pill text-[10px] ${STATUS_COLOR[client.status] ?? 'pill-proc'}`}>{client.status}</span>
              <span className="text-[11px] text-ink-mute font-semibold">Seg. {client.segment}</span>
            </div>
            <h2 className="font-display font-bold text-[18px] text-ink leading-tight">{client.name}</h2>
            <p className="text-[12px] text-ink-mute mt-0.5">{client.code} · {client.city}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <button
              onClick={() => setShowEdit(true)}
              className="btn-secondary text-[12px] px-3 py-1.5"
            >
              Editar
            </button>
            <button onClick={onClose} className="text-ink-mute hover:text-ink text-[22px] leading-none">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* KPI mini-grid */}
          <div className="grid grid-cols-3 gap-px bg-rule m-5 rounded-brand overflow-hidden">
            {[
              { label: 'YTD', value: cop(client.ytd), color: 'text-green' },
              { label: 'Cupo', value: cop(client.creditLimit), color: 'text-ink' },
              { label: 'Disponible', value: cop(client.creditLimit - client.creditUsed), color: creditPct >= 80 ? 'text-risk' : 'text-ok' },
            ].map(k => (
              <div key={k.label} className="bg-paper px-3 py-3 text-center">
                <p className={`font-display font-bold text-[14px] ${k.color}`}>{k.value}</p>
                <p className="text-[9px] text-ink-mute uppercase tracking-wide mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Cupo bar */}
          <div className="px-5 mb-5">
            <div className="flex justify-between text-[10px] text-ink-mute mb-1">
              <span>Uso de cupo</span>
              <span className={creditPct >= 80 ? 'text-risk font-semibold' : ''}>{Math.round(creditPct)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-line overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${creditPct >= 90 ? 'bg-error' : creditPct >= 70 ? 'bg-amber-400' : 'bg-green'}`}
                style={{ width: `${Math.min(creditPct, 100)}%` }}
              />
            </div>
          </div>

          {/* KAM asignado */}
          <div className="px-5 mb-5">
            <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-wide mb-2">KAM asignado</p>
            <div className="flex items-center gap-2">
              {client.vendor ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-green flex items-center justify-center">
                    <span className="text-ivory font-bold text-[11px]">{client.vendor.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-ink">{client.vendor.name}</p>
                    <p className="text-[11px] text-ink-mute">{client.vendor.zone}</p>
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-ink-mute italic">Sin vendedor asignado</p>
              )}
            </div>
          </div>

          {/* Última actividad */}
          {client.lastOrderAt && (
            <div className="px-5 mb-5">
              <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-wide mb-1">Último pedido</p>
              <p className="text-[13px] text-ink">
                {new Date(client.lastOrderAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}

          {/* Historial de pedidos */}
          <div className="px-5 pb-6">
            <p className="text-[10px] font-semibold text-ink-mute uppercase tracking-wide mb-3">Últimos pedidos</p>
            {loadingOrders ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-green border-t-transparent rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <p className="text-[13px] text-ink-mute italic text-center py-4">Sin pedidos registrados.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {orders.map(o => (
                  <div key={o.id} className="bg-ivory rounded-brand px-3.5 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-display font-semibold text-[12px] text-ink">{o.code}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ORDER_STATUS_COLOR[o.status] ?? 'bg-line text-ink-mute'}`}>
                          {ORDER_STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-mute">
                        {new Date(o.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}{TERM_LABEL[o.paymentTerm] ?? o.paymentTerm}
                        {' · '}{o.items.length} líneas
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-display font-semibold text-[13px] text-ink">{cop(o.total)}</p>
                      {o.discount > 0 && (
                        <p className="text-[10px] text-ok">−{cop(o.discount)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {showEdit && (
        <ClientModal
          client={client}
          vendors={vendors}
          onSave={async dto => {
            await adminApi.updateClient(client.id, dto);
            onSaved();
            setShowEdit(false);
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
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
  const [detail, setDetail]     = useState<AdminClient | null>(null);
  const [showNew, setShowNew]   = useState(false);
  const [created, setCreated]   = useState<{ client: AdminClient; tempPassword: string } | null>(null);
  // Prefetch vendors once for both drawer + new client modal
  const ensureVendors = async () => {
    if (!vendors.length) {
      const vs = await adminApi.listVendors();
      setVendors(vs as AdminVendor[]);
      return vs as AdminVendor[];
    }
    return vendors;
  };

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

  if (error) return <PageError message={error} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="h1 mb-0.5">Clientes</h1>
          <p className="text-[13px] text-ink-mute">{total} aliados registrados</p>
        </div>
        <button className="btn-primary text-[13px]" onClick={() => setShowNew(true)}>+ Nuevo aliado</button>
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
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr
                  key={c.id}
                  className="border-b border-rule last:border-0 hover:bg-ivory/50 transition-colors cursor-pointer"
                  onClick={() => setDetail(c)}
                >
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
                    <span className={c.creditLimit > 0 && c.creditUsed / c.creditLimit > 0.8 ? 'text-risk font-semibold' : 'text-ink-soft'}>
                      {cop(c.creditUsed)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-display font-semibold text-green text-[13px]">
                    {cop(c.ytd)}
                  </td>
                  <td className="px-4 py-3 text-ink-mute text-[12px]">{c.vendor?.name ?? '—'}</td>
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

      {detail && (
        <ClientDrawer
          client={detail}
          vendors={vendors}
          onEdit={() => {}}
          onClose={() => setDetail(null)}
          onSaved={() => { load(); setDetail(null); }}
        />
      )}

      {showNew && (
        <NewClientModal
          vendors={vendors}
          onCreated={result => { setCreated(result); load(); }}
          onClose={() => setShowNew(false)}
        />
      )}

      {created && (
        <CredentialsModal
          client={created.client}
          tempPassword={created.tempPassword}
          onClose={() => setCreated(null)}
        />
      )}
    </div>
  );
}
