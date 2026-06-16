import React, { useState, useRef, useEffect } from 'react';
import { useDonations, useDonors } from '../hooks/useFirestore';
import { formatILS, formatDate, todayISO, CURRENCIES, monthKey, heMonthYear } from '../utils/helpers';

const EMPTY = {
  donorName: '', donorId: '', date: todayISO(),
  amount: '', currency: '₪', amountILS: '',
  reference: '', paymentMethod: 'העברה בנקאית', notes: '',
};

const PAYMENT_METHODS = ['העברה בנקאית', 'מזומן', 'צ׳ק', 'כרטיס אשראי', 'PayPal', 'Zelle', 'Wire Transfer', 'אחר'];

export default function Donations() {
  const { data: donations, loading, add, update, remove } = useDonations();
  const { data: donors } = useDonors();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [acOpen, setAcOpen] = useState(false);
  const [acQuery, setAcQuery] = useState('');
  const acRef = useRef(null);

  // Close autocomplete on outside click
  useEffect(() => {
    const handler = e => { if (acRef.current && !acRef.current.contains(e.target)) setAcOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openAdd = () => { setForm(EMPTY); setEditId(null); setAcQuery(''); setModal(true); };
  const openEdit = (d) => {
    setForm({ ...EMPTY, ...d });
    setAcQuery(d.donorName || '');
    setEditId(d.id);
    setModal(true);
  };
  const close = () => setModal(false);

  // Autocomplete suggestions
  const acSuggestions = donors.filter(d =>
    acQuery.length > 0 &&
    (d.name?.includes(acQuery) || d.phone?.includes(acQuery))
  ).slice(0, 8);

  const selectDonor = (donor) => {
    setForm(f => ({
      ...f,
      donorName: donor.name,
      donorId: donor.id,
      // If recurring donor, pre-fill amount
      ...(donor.isRecurring ? {
        amount: donor.recurringAmount || '',
        currency: donor.recurringCurrency || '₪',
        amountILS: donor.recurringCurrency === '₪' ? donor.recurringAmount : '',
      } : {}),
    }));
    setAcQuery(donor.name);
    setAcOpen(false);
  };

  const save = async () => {
    if (!form.donorName.trim()) return alert('יש להזין שם תורם');
    if (!form.amount) return alert('יש להזין סכום');
    if (!form.date) return alert('יש להזין תאריך');
    const amountILS = form.currency === '₪' ? form.amount : (form.amountILS || form.amount);
    await (editId ? update(editId, { ...form, amountILS }) : add({ ...form, amountILS }));
    close();
  };

  const del = async (id) => { if (window.confirm('למחוק תרומה זו?')) await remove(id); };

  // Filters
  const months = [...new Set(donations.map(d => monthKey(d.date)).filter(Boolean))].sort().reverse();
  const filtered = donations.filter(d => {
    const matchSearch = !search || d.donorName?.includes(search);
    const matchMonth  = !filterMonth || monthKey(d.date) === filterMonth;
    return matchSearch && matchMonth;
  });

  const totalFiltered = filtered.reduce((s, d) => s + parseFloat(d.amountILS || 0), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>תרומות</h1>
          <div className="subtitle">{donations.length} רשומות</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ תרומה חדשה</button>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="filter-bar">
          <input
            className="form-control"
            placeholder="חיפוש לפי שם..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          <select className="form-control" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="">כל החודשים</option>
            {months.map(m => <option key={m} value={m}>{heMonthYear(m)}</option>)}
          </select>
          {filterMonth && (
            <div style={{ marginRight: 'auto', fontWeight: 600, color: 'var(--green)' }}>
              סה"כ: {formatILS(totalFiltered)}
            </div>
          )}
        </div>

        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>שם תורם</th>
                  <th>סכום מקורי</th>
                  <th>סכום בש"ח</th>
                  <th>אסמכתא</th>
                  <th>אמצעי תשלום</th>
                  <th>הערות</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30 }}>טוען...</td></tr>}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={8}>
                    <div className="empty-state"><div className="icon">💰</div><p>אין תרומות להצגה</p></div>
                  </td></tr>
                )}
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{d.date}</td>
                    <td style={{ fontWeight: 600 }}>{d.donorName}</td>
                    <td className="amount-positive">{d.amount} {d.currency}</td>
                    <td className="amount-positive">{formatILS(d.amountILS)}</td>
                    <td style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>{d.reference || '—'}</td>
                    <td><span className="badge badge-blue">{d.paymentMethod}</span></td>
                    <td style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>{d.notes}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(d)}>עריכה</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(d.id)}>מחק</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    <td colSpan={3} style={{ fontWeight: 700, padding: '12px 16px' }}>סה"כ</td>
                    <td className="amount-positive" style={{ fontWeight: 700 }}>{formatILS(totalFiltered)}</td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editId ? 'עריכת תרומה' : 'תרומה חדשה'}</h2>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid" style={{ gap: 14 }}>

                {/* Autocomplete donor */}
                <div className="form-group" ref={acRef}>
                  <label className="form-label">שם תורם *</label>
                  <div className="autocomplete-wrapper">
                    <input
                      className="form-control"
                      value={acQuery}
                      onChange={e => { setAcQuery(e.target.value); setForm(f => ({ ...f, donorName: e.target.value, donorId: '' })); setAcOpen(true); }}
                      onDoubleClick={() => setAcOpen(true)}
                      placeholder="הקש שם או לחץ פעמיים לרשימה..."
                    />
                    {acOpen && acSuggestions.length > 0 && (
                      <div className="autocomplete-list">
                        {acSuggestions.map(d => (
                          <div key={d.id} className="autocomplete-item" onClick={() => selectDonor(d)}>
                            <span className="donor-name">{d.name}</span>
                            <span className="donor-details">
                              {d.country}{d.phone ? ` · ${d.phone}` : ''}
                              {d.isRecurring ? ` · קבוע: ${d.recurringAmount} ${d.recurringCurrency}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-hint">הקש שם לחיפוש, או לחץ פעמיים לבחירה מהרשימה</div>
                </div>

                {/* Date */}
                <div className="form-group">
                  <label className="form-label">תאריך *</label>
                  <input className="form-control" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>

                {/* Amount + currency */}
                <div className="form-grid form-grid-2" style={{ gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">סכום *</label>
                    <input className="form-control" type="number" value={form.amount} onChange={e => {
                      const v = e.target.value;
                      setForm(f => ({ ...f, amount: v, amountILS: f.currency === '₪' ? v : f.amountILS }));
                    }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">מטבע</label>
                    <select className="form-control" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* If non-ILS, show ILS equivalent field */}
                {form.currency !== '₪' && (
                  <div className="form-group">
                    <label className="form-label">סכום לאחר המרה לש"ח *</label>
                    <input
                      className="form-control"
                      type="number"
                      value={form.amountILS}
                      onChange={e => setForm(f => ({ ...f, amountILS: e.target.value }))}
                      placeholder="הזן את הסכום שהבנק זיכה בשח"
                    />
                    <div className="form-hint">הזן את הסכום שהבנק זיכה בשח (לפי אסמכתא ההמרה)</div>
                  </div>
                )}

                {/* Reference */}
                <div className="form-group">
                  <label className="form-label">מספר אסמכתא</label>
                  <input className="form-control" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="מספר אסמכתא / אישור" />
                </div>

                {/* Payment method */}
                <div className="form-group">
                  <label className="form-label">אמצעי תשלום</label>
                  <select className="form-control" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">הערות</label>
                  <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>ביטול</button>
              <button className="btn btn-primary" onClick={save}>{editId ? 'שמור שינויים' : 'הוסף תרומה'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
