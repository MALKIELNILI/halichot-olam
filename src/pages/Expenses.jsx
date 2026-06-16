import React, { useState } from 'react';
import { useExpenses, useScholars } from '../hooks/useFirestore';
import { formatILS, todayISO, EXPENSE_CATEGORIES, monthKey, heMonthYear } from '../utils/helpers';

const EMPTY = {
  date: todayISO(), category: 'מלגות אברכים',
  description: '', amount: '', reference: '',
  payee: '', notes: '', scholarId: '',
};

export default function Expenses() {
  const { data: expenses, loading, add, update, remove } = useExpenses();
  const { data: scholars } = useScholars();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');
  const [scholarSearch, setScholarSearch] = useState('');

  const openAdd = () => { setForm(EMPTY); setEditId(null); setScholarSearch(''); setModal(true); };
  const openEdit = (e) => { setForm({ ...EMPTY, ...e }); setEditId(e.id); setScholarSearch(''); setModal(true); };
  const close = () => { setModal(false); setScholarSearch(''); };

  const save = async () => {
    if (!form.description.trim()) return alert('יש להזין תיאור');
    if (!form.amount) return alert('יש להזין סכום');
    // auto description for stipend
    let desc = form.description;
    if (form.category === 'מלגות אברכים' && form.scholarId) {
      const s = scholars.find(x => x.id === form.scholarId);
      if (s) desc = `מלגה – ${s.name}`;
    }
    await (editId ? update(editId, { ...form, description: desc }) : add({ ...form, description: desc }));
    close();
  };

  const del = async (id) => { if (window.confirm('למחוק הוצאה זו?')) await remove(id); };

  const months = [...new Set(expenses.map(e => monthKey(e.date)).filter(Boolean))].sort().reverse();
  const filtered = expenses.filter(e => {
    const matchMonth  = !filterMonth || monthKey(e.date) === filterMonth;
    const matchCat    = !filterCat   || e.category === filterCat;
    const matchSearch = !search || e.description?.includes(search) || e.payee?.includes(search) || e.notes?.includes(search);
    return matchMonth && matchCat && matchSearch;
  });

  const total = filtered.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>הוצאות</h1>
          <div className="subtitle">{expenses.length} רשומות</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ הוצאה חדשה</button>
      </div>

      <div className="page-body">
        <div className="filter-bar">
          <input
            className="form-control"
            placeholder="חיפוש לפי תיאור / מוטב / הערות..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 250 }}
          />
          <select className="form-control" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">כל החודשים</option>
            {months.map(m => <option key={m} value={m}>{heMonthYear(m)}</option>)}
          </select>
          <select className="form-control" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="">כל הקטגוריות</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          {(filterMonth || filterCat || search) && (
            <div style={{ marginRight: 'auto', fontWeight: 600, color: 'var(--red)' }}>
              סה"כ: {formatILS(total)}
            </div>
          )}
        </div>

        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>קטגוריה</th>
                  <th>תיאור</th>
                  <th>מוטב</th>
                  <th>סכום</th>
                  <th>אסמכתא</th>
                  <th>הערות</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30 }}>טוען...</td></tr>}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={8}>
                    <div className="empty-state"><div className="icon">📤</div><p>אין הוצאות להצגה</p></div>
                  </td></tr>
                )}
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{e.date}</td>
                    <td><span className="badge badge-blue">{e.category}</span></td>
                    <td style={{ fontWeight: 600 }}>{e.description}</td>
                    <td>{e.payee || '—'}</td>
                    <td className="amount-negative">{formatILS(e.amount)}</td>
                    <td style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>{e.bankRef || e.reference || '—'}</td>
                    <td style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>{e.notes}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(e)}>עריכה</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(e.id)}>מחק</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    <td colSpan={4} style={{ fontWeight: 700, padding: '12px 16px' }}>סה"כ</td>
                    <td className="amount-negative" style={{ fontWeight: 700 }}>{formatILS(total)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editId ? 'עריכת הוצאה' : 'הוצאה חדשה'}</h2>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid form-grid-2" style={{ gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">תאריך *</label>
                  <input className="form-control" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">קטגוריה</label>
                  <select className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                {/* If stipend category, show scholar selector */}
                {form.category === 'מלגות אברכים' && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">בחר אברך</label>
                    <input
                      className="form-control"
                      placeholder="הקש שם לחיפוש..."
                      value={scholarSearch}
                      onChange={e => setScholarSearch(e.target.value)}
                      style={{ marginBottom: 6 }}
                    />
                    <select
                      className="form-control"
                      value={form.scholarId}
                      size={Math.min(6, scholars.filter(s => s.active !== false && (!scholarSearch || s.name.includes(scholarSearch))).length + 1)}
                      onChange={e => {
                        const s = scholars.find(x => x.id === e.target.value);
                        setForm(f => ({
                          ...f, scholarId: e.target.value,
                          description: s ? `מלגה – ${s.name}` : f.description,
                          amount: s ? s.stipendAmount : f.amount,
                          payee: s ? s.name : f.payee,
                        }));
                      }}
                    >
                      <option value="">— בחר אברך —</option>
                      {scholars
                        .filter(s => s.active !== false && (!scholarSearch || s.name.includes(scholarSearch)))
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({formatILS(s.stipendAmount)})</option>
                        ))}
                    </select>
                    <div className="form-hint">הקש שם לסינון, בחר מהרשימה — יתמלא אוטומטית</div>
                  </div>
                )}

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">תיאור *</label>
                  <input className="form-control" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">סכום (₪) *</label>
                  <input className="form-control" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">מוטב / ספק</label>
                  <input className="form-control" value={form.payee} onChange={e => setForm(f => ({ ...f, payee: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">מספר אסמכתא</label>
                  <input className="form-control" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">הערות</label>
                  <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>ביטול</button>
              <button className="btn btn-primary" onClick={save}>{editId ? 'שמור שינויים' : 'הוסף הוצאה'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
