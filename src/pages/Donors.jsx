import React, { useState, useRef } from 'react';
import { useDonors } from '../hooks/useFirestore';
import { todayISO, CURRENCIES } from '../utils/helpers';

const EMPTY_DONOR = {
  name: '', phone: '', email: '', country: 'ישראל',
  address: '', notes: '', isRecurring: false,
  recurringAmount: '', recurringCurrency: '₪', recurringDay: '1',
};

export default function Donors() {
  const { data: donors, loading, add, update, remove } = useDonors();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_DONOR);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');

  const openAdd = () => { setForm(EMPTY_DONOR); setEditId(null); setModal(true); };
  const openEdit = (d) => { setForm({ ...EMPTY_DONOR, ...d }); setEditId(d.id); setModal(true); };
  const close = () => setModal(false);

  const save = async () => {
    if (!form.name.trim()) return alert('יש להזין שם תורם');
    if (editId) await update(editId, form);
    else await add(form);
    close();
  };

  const del = async (id) => {
    if (window.confirm('למחוק תורם זה?')) await remove(id);
  };

  const filtered = donors.filter(d =>
    d.name?.includes(search) || d.phone?.includes(search) || d.country?.includes(search)
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>תורמים</h1>
          <div className="subtitle">{donors.length} תורמים רשומים</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ תורם חדש</button>
      </div>

      <div className="page-body">
        <div className="filter-bar">
          <input
            className="form-control"
            placeholder="חיפוש לפי שם / טלפון / מדינה..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
        </div>

        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>שם התורם</th>
                  <th>טלפון</th>
                  <th>מדינה</th>
                  <th>קבוע</th>
                  <th>סכום קבוע</th>
                  <th>הערות</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>טוען...</td></tr>}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={7}>
                    <div className="empty-state"><div className="icon">👥</div><p>אין תורמים עדיין</p></div>
                  </td></tr>
                )}
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td>{d.phone}</td>
                    <td>{d.country}</td>
                    <td>{d.isRecurring ? <span className="badge badge-green">קבוע</span> : <span className="badge badge-blue">חד פעמי</span>}</td>
                    <td>{d.isRecurring ? `${d.recurringAmount} ${d.recurringCurrency}` : '—'}</td>
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
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editId ? 'עריכת תורם' : 'תורם חדש'}</h2>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid form-grid-2" style={{ gap: 14 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">שם מלא *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">טלפון</label>
                  <input className="form-control" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">אימייל</label>
                  <input className="form-control" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">מדינה</label>
                  <input className="form-control" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">כתובת</label>
                  <input className="form-control" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.isRecurring} onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))} />
                    <span className="form-label" style={{ margin: 0 }}>תורם קבוע (חוזר חודשי)</span>
                  </label>
                </div>

                {form.isRecurring && <>
                  <div className="form-group">
                    <label className="form-label">סכום חודשי קבוע</label>
                    <input className="form-control" type="number" value={form.recurringAmount} onChange={e => setForm(f => ({ ...f, recurringAmount: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">מטבע</label>
                    <select className="form-control" value={form.recurringCurrency} onChange={e => setForm(f => ({ ...f, recurringCurrency: e.target.value }))}>
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">יום החיוב בחודש</label>
                    <input className="form-control" type="number" min="1" max="28" value={form.recurringDay} onChange={e => setForm(f => ({ ...f, recurringDay: e.target.value }))} />
                  </div>
                </>}

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">הערות</label>
                  <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>ביטול</button>
              <button className="btn btn-primary" onClick={save}>{editId ? 'שמור שינויים' : 'הוסף תורם'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
