import { useEffect, useState } from 'react';
import { kamApi, type KamCommissions } from '../../api/client';
import { Spinner, PageError } from '../../components/Spinner';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

export default function KamCommissions() {
  const [data, setData]   = useState<KamCommissions | null>(null);
  const [error, setError] = useState('');
  const [year, setYear]   = useState(new Date().getFullYear());
  const [month, setMonth] = useState(0); // 0 = todos

  useEffect(() => {
    setData(null);
    kamApi.commissions(year, month || undefined)
      .then(setData)
      .catch(() => setError('Error cargando comisiones.'));
  }, [year, month]);

  const years  = [2025, 2026, 2027];
  const months = [
    { v: 0,  l: 'Todo el año' },
    { v: 1,  l: 'Enero' }, { v: 2,  l: 'Febrero' }, { v: 3,  l: 'Marzo' },
    { v: 4,  l: 'Abril' }, { v: 5,  l: 'Mayo' },    { v: 6,  l: 'Junio' },
    { v: 7,  l: 'Julio' }, { v: 8,  l: 'Agosto' },  { v: 9,  l: 'Septiembre' },
    { v: 10, l: 'Octubre' }, { v: 11, l: 'Noviembre' }, { v: 12, l: 'Diciembre' },
  ];

  return (
    <div className="page">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <h1 className="h1">Comisiones</h1>
        <div className="flex gap-3">
          <select className="select w-[100px]" value={year} onChange={e => setYear(+e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="select w-[150px]" value={month} onChange={e => setMonth(+e.target.value)}>
            {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
        </div>
      </div>

      {error && <PageError message={error} />}
      {!data && !error && <Spinner />}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="card text-center py-6">
              <p className="font-display font-bold text-[28px] text-green mb-0.5">
                {cop(data.totalCommission)}
              </p>
              <p className="text-[11px] text-ink-mute">Comisión {data.period}</p>
            </div>
            <div className="card text-center py-6">
              <p className="font-display font-bold text-[28px] text-ink mb-0.5">
                {cop(data.totalVolume)}
              </p>
              <p className="text-[11px] text-ink-mute">Volumen recaudado</p>
            </div>
            <div className="card text-center py-6">
              <p className="font-display font-bold text-[28px] text-ink mb-0.5">
                {data.totalInvoicesPaid}
              </p>
              <p className="text-[11px] text-ink-mute">Facturas pagadas</p>
            </div>
          </div>

          {/* Tabla */}
          <div className="card p-0 overflow-hidden overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-rule bg-ivory">
                  {['Factura', 'Cliente', 'Volumen', 'Comisión (3%)', 'Fecha pago', 'A tiempo'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-display font-semibold text-[11px] text-ink-mute uppercase tracking-[0.08em]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, idx) => (
                  <tr key={r.invoiceId} className={`border-b border-rule last:border-0 ${idx % 2 === 0 ? '' : 'bg-cream'}`}>
                    <td className="px-4 py-3 font-mono text-[12px] text-ink-soft">
                      {r.invoiceId.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{r.clientName}</td>
                    <td className="px-4 py-3 font-mono">{cop(r.amount)}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-ok">{cop(r.commission)}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {new Date(r.paidAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`pill ${r.onTime ? 'pill-ok' : 'pill-risk'}`}>
                        {r.onTime ? '✓ Sí' : '✗ No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.rows.length === 0 && (
              <p className="text-center text-ink-mute py-10">Sin comisiones para el período seleccionado.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
