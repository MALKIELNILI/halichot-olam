import React, { useState } from 'react';
import { useScholars } from '../hooks/useFirestore';
import { formatILS, todayISO } from '../utils/helpers';

const EMPTY = {
  name: '', phone: '', idNumber: '', stipendAmount: '',
  startDate: todayISO(), active: true, notes: '', track: 'רגיל',
};

const TRACKS = ['רגיל', 'מיוחד', 'מצטיין'];

export default function Scholars() {
  const { data: scholars, loading, add, update, remove } = useScholars();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (s) => { setForm({ ...EMPTY, ...s }); setEditId(s.id); setModal(true); };
  const close = () => setModal(false);

  const save = async () => {
    if (!form.name.trim()) return alert('יש להזין שם אברך');
    if (!form.stipendAmount) return alert('יש להזין סכום מלגה');
    if (editId) await update(editId, form);
    else await add(form);
    close();
  };

  const del = async (id) => { if (window.confirm('למחוק אברך זה?')) await remove(id); };
  const toggleActive = async (s) => await update(s.id, { active: !s.active });

  const filtered = scholars.filter(s => {
    const matchSearch = !search || s.name?.includes(search) || s.idNumber?.includes(search);
    const matchActive = showInactive ? true : s.active !== false;
    return matchSearch && matchActive;
  });

  const totalMonthly = scholars
    .filter(s => s.active !== false)
    .reduce((sum, s) => sum + parseFloat(s.stipendAmount || 0), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>אברכים</h1>
          <div className="subtitle">{scholars.filter(s => s.active !== false).length} אברכים פעילים</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--green)', fontWeight: 600 }}>
            סה"כ חודשי: {formatILS(totalMonthly)}
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ אברך חדש</button>
        </div>
      </div>

      <div className="page-body">
        <div className="filter-bar">
          <input
            className="form-control"
            placeholder="חיפוש לפי שם / ת.ז..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 250 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            הצג לא פעילים
          </label>
        </div>

        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>שם האברך</th>
                  <th>ת.ז.</th>
                  <th>טלפון</th>
                  <th>מסלול</th>
                  <th>מלגה חודשית</th>
                  <th>תאריך תחילה</th>
                  <th>סטטוס</th>
                  <th>הערות</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30 }}>טוען...</td></tr>}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={9}>
                    <div className="empty-state"><div className="icon">📚</div><p>אין אברכים להצגה</p></div>
                  </td></tr>
                )}
                {filtered.map(s => (
                  <tr key={s.id} style={{ opacity: s.active === false ? 0.5 : 1 }}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.idNumber || '—'}</td>
                    <td>{s.phone || '—'}</td>
                    <td><span className="badge badge-gold">{s.track || 'רגיל'}</span></td>
                    <td className="amount-positive">{formatILS(s.stipendAmount)}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>{s.startDate}</td>
                    <td>
                      <span className={`badge ${s.active !== false ? 'badge-green' : 'badge-red'}`}>
                        {s.active !== false ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>{s.notes}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>עריכה</button>
                        <button className="btn btn-outline btn-sm" onClick={() => toggleActive(s)}>
                          {s.active !== false ? 'השהה' : 'הפעל'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(s.id)}>מחק</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    <td colSpan={4} style={{ fontWeight: 700, padding: '12px 16px' }}>
                      סה"כ מלגות חודשיות (פעילים)
                    </td>
                    <td className="amount-positive" style={{ fontWeight: 700 }}>{formatILS(totalMonthly)}</td>
                    <td colSpan={4}></td>
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
              <h2>{editId ? 'עריכת אברך' : 'אברך חדש'}</h2>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid form-grid-2" style={{ gap: 14 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">שם מלא *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">מספר ת.ז.</label>
                  <input className="form-control" value={form.idNumber} onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">טלפון</label>
                  <input className="form-control" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">מלגה חודשית (₪) *</label>
                  <input className="form-control" type="number" value={form.stipendAmount} onChange={e => setForm(f => ({ ...f, stipendAmount: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">מסלול</label>
                  <select className="form-control" value={form.track} onChange={e => setForm(f => ({ ...f, track: e.target.value }))}>
                    {TRACKS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">תאריך תחילה</label>
                  <input className="form-control" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                    <span className="form-label" style={{ margin: 0 }}>פעיל</span>
                  </label>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">הערות</label>
                  <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>ביטול</button>
              <button className="btn btn-primary" onClick={save}>{editId ? 'שמור שינויים' : 'הוסף אברך'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
