import { useEffect, useState } from 'react';
import { kamApi, type KamClients } from '../../api/client';
import { Spinner, PageError } from '../../components/Spinner';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const STATUS_OPTS = ['', 'activo', 'inactivo', 'riesgo'];
const SEG_OPTS    = ['', 'A', 'B', 'C'];

const STATUS_LABEL: Record<string, string> = { activo: 'Activo', inactivo: 'Inactivo', riesgo: 'Riesgo' };

export default function KamClients() {
  const [data, setData]       = useState<KamClients | null>(null);
  const [error, setError]     = useState('');
  const [status, setStatus]   = useState('');
  const [segment, setSegment] = useState('');

  useEffect(() => {
    setData(null);
    kamApi.clients(1, 50, status || undefined, segment || undefined)
      .then(setData)
      .catch(() => setError('Error cargando clientes.'));
  }, [status, segment]);

  return (
    <div className="page">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <h1 className="h1">Mis clientes</h1>
        <div className="flex gap-3">
          <select className="select w-[140px]" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            {STATUS_OPTS.slice(1).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <select className="select w-[130px]" value={segment} onChange={e => setSegment(e.target.value)}>
            <option value="">Todos los seg.</option>
            {SEG_OPTS.slice(1).map(s => <option key={s} value={s}>Segmento {s}</option>)}
          </select>
        </div>
      </div>

      {error && <PageError message={error} />}
      {!data && !error && <Spinner />}

      {data && (
        <>
          <p className="text-[12px] text-ink-mute mb-3">{data.meta.total} clientes</p>
          <div className="card p-0 overflow-hidden overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-rule bg-ivory">
                  {['Cliente', 'Ciudad', 'Seg.', 'Compras YTD', 'Cupo usado', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-display font-semibold text-[11px] text-ink-mute uppercase tracking-[0.08em]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((c, idx) => (
                  <tr key={c.id} className={`border-b border-rule last:border-0 ${idx % 2 === 0 ? '' : 'bg-cream'}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{c.name}</p>
                      <p className="mono">{c.code}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{c.city}</td>
                    <td className="px-4 py-3">
                      <span className={`seg-dot seg-dot-${c.segment}`}>{c.segment}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-ink">{cop(c.ytd)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="progress-track w-16">
                          <div
                            className={`progress-bar ${c.creditUsedPct >= 80 ? 'bg-risk' : 'bg-green'}`}
                            style={{ width: `${Math.min(c.creditUsedPct, 100)}%` }}
                          />
                        </div>
                        <span className={`font-mono text-[12px] ${c.creditUsedPct >= 80 ? 'text-risk font-bold' : 'text-ink-soft'}`}>
                          {c.creditUsedPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`pill ${c.status === 'activo' ? 'pill-ok' : c.status === 'riesgo' ? 'pill-risk' : 'pill-proc'}`}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.data.length === 0 && (
              <p className="text-center text-ink-mute py-10">Sin resultados con estos filtros.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
