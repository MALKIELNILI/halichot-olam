import React, { useState, useRef, useEffect } from 'react';
import { useDonations, useDonors } from '../hooks/useFirestore';
import { formatILS, formatDate, todayISO, CURRENCIES, monthKey, heMonthYear } from '../utils/helpers';

const EMPTY = {
  donorName: '', donorId: '', date: todayISO(),
  amount: '', currency: '₪', amountILS: '',
  reference: '', paymentMethod: 'העברה בנקאית', notes: '',
};

const PAYMENT_METHODS = ['העברה בנקאית', 'מזומן', 'צ׳ק', 'כרטיס אשראי', 'PayPal', 'Zelle', 'Wire Transfer', 'אחר'];

const DEFAULT_KEY = 'halichot_receipt_default';
const SEQ_KEY     = 'halichot_receipt_seq';
const getDefault  = () => localStorage.getItem(DEFAULT_KEY) || 'whatsapp';
const setDefault  = (v) => localStorage.setItem(DEFAULT_KEY, v);
const nextReceiptNum = () => {
  const n = parseInt(localStorage.getItem(SEQ_KEY) || '0') + 1;
  localStorage.setItem(SEQ_KEY, String(n));
  return n;
};
const formatReceiptNum = (n) => n ? String(n).padStart(4, '0') : '';

function receiptText(d) {
  const amt = parseFloat(d.amountILS || d.amount || 0).toLocaleString('he-IL');
  const ref = d.reference ? `\nאסמכתא: ${d.reference}` : '';
  const num = d.receiptNumber ? `\nמספר קבלה: ${formatReceiptNum(d.receiptNumber)}` : '';
  return `שלום ${d.donorName},\n\nתודה רבה על תרומתכם הנדיבה לעמותת *תפארת מישאל – הליכות עולם*.\n\n💰 סכום: ₪${amt}\n📅 תאריך: ${d.date}${ref}${num}\n💳 אמצעי תשלום: ${d.paymentMethod || ''}\n\nיהי רצון שתזכו לראות פרי ברכה מתרומתכם.\n\nבברכה,\nתפארת מישאל – הליכות עולם`;
}

function sendWhatsApp(d, donors) {
  const donor = donors.find(x => x.id === d.donorId);
  const phone = donor?.phone?.replace(/\D/g, '');
  const text = encodeURIComponent(receiptText(d));
  const url = phone ? `https://wa.me/972${phone.replace(/^0/, '')}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, '_blank');
}

const LOGO_URL = 'https://malkielnili.github.io/halichot-olam/logo-tiferet.svg';

const RECEIPT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Heebo', sans-serif; direction: rtl; color: #1a2744; background: #fff; }
  .receipt { max-width: 480px; margin: 40px auto; border: 2px solid #b8973a; border-radius: 12px; overflow: hidden; }
  .bsd { text-align: left; font-size: 13px; font-weight: 600; color: #1a2744; padding: 6px 14px 0; font-family: 'Frank Ruhl Libre', serif; }
  .header { background: #1a2744; color: white; padding: 20px 24px; text-align: center; }
  .header-logo { width: 60px; height: 60px; object-fit: contain; border-radius: 50%; background: #fff; padding: 6px; margin-bottom: 10px; }
  .org { font-size: 20px; font-weight: 700; }
  .org-reg { font-size: 11px; opacity: 0.55; margin-top: 2px; letter-spacing: 0.4px; }
  .org-sub { font-size: 12px; opacity: 0.65; margin-top: 3px; }
  .receipt-title { background: #b8973a; color: white; text-align: center; padding: 10px; font-size: 18px; font-weight: 700; letter-spacing: 2px; }
  .body { padding: 28px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  td { padding: 10px 8px; border-bottom: 1px solid #e2e0dc; font-size: 15px; }
  td:first-child { color: #6b6762; width: 42%; }
  td:last-child { font-weight: 600; }
  .amount-row td:last-child { font-size: 22px; color: #2a6b4a; font-weight: 700; }
  .mosad-row td { font-size: 13px; background: #f0faf4; color: #2a6b4a; }
  .footer { text-align: center; padding: 14px; font-size: 11px; color: #9e9b95; border-top: 1px solid #e2e0dc; }
  .thankyou { text-align: center; padding: 18px 28px 0; font-size: 13px; color: #6b6762; line-height: 1.7; }
  @media print { .receipt { margin: 0 auto; border-radius: 0; page-break-after: always; } .receipt:last-child { page-break-after: avoid; } }
`;

function receiptHTML(d) {
  const amt = parseFloat(d.amountILS || d.amount || 0).toLocaleString('he-IL');
  const refDisplay = d.reference || d.bankRef || '';
  const ref = refDisplay ? `<tr><td>מס׳ אסמכתא</td><td>${refDisplay}</td></tr>` : '';
  const bankRef = '';
  const numBadge = d.receiptNumber
    ? `<div style="text-align:center;padding:6px;background:#f8f5ef;font-size:13px;color:#6b6762;">מספר קבלה: <strong style="color:#1a2744;font-size:15px;">${formatReceiptNum(d.receiptNumber)}</strong></div>`
    : '';
  return `
  <div class="receipt">
    <div class="bsd">בס"ד</div>
    <div class="header">
      <img class="header-logo" src="${LOGO_URL}" onerror="this.style.display='none'" alt="לוגו" />
      <div class="org">תפארת מישאל</div>
      <div class="org-reg">עמותה מס׳ 580676807</div>
      <div class="org-sub">הליכות עולם · צונץ 11, תל אביב</div>
    </div>
    <div class="receipt-title">קבלה על תרומה</div>
    ${numBadge}
    <div class="body">
      <table>
        <tr><td>שם התורם</td><td>${d.donorName}</td></tr>
        <tr class="amount-row"><td>סכום התרומה</td><td>₪${amt}</td></tr>
        <tr><td>תאריך תרומה</td><td>${d.date}</td></tr>
        <tr><td>אמצעי תשלום</td><td>${d.paymentMethod || '—'}</td></tr>
        ${ref}${bankRef}
        ${d.notes ? `<tr><td>הערות</td><td>${d.notes}</td></tr>` : ''}
        <tr class="mosad-row"><td>קוד מוסד (סעיף 46)</td><td>26542</td></tr>
      </table>
    </div>
    <div class="thankyou">יהי רצון שתזכו לראות פרי ברכה מתרומתכם הנדיבה.</div>
    <div class="footer">הופק: ${d.date} · עמותת תפארת מישאל – הליכות עולם · מס׳ 580676807</div>
  </div>`;
}

function printReceipt(d) {
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><title>קבלה – תפארת מישאל</title><style>${RECEIPT_STYLES}</style></head><body>${receiptHTML(d)}<script>window.onload = () => window.print();<\/script></body></html>`);
  win.document.close();
}

function printAllReceipts(donations) {
  if (!donations.length) return alert('אין תרומות להדפסה');
  const win = window.open('', '_blank');
  const sorted = [...donations].sort((a, b) => a.date > b.date ? 1 : -1);
  win.document.write(`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><title>כל הקבלות – תפארת מישאל</title><style>${RECEIPT_STYLES}</style></head><body>${sorted.map(receiptHTML).join('')}<script>window.onload = () => window.print();<\/script></body></html>`);
  win.document.close();
}

function ReceiptModal({ donation, donors, onClose }) {
  const [def, setDef] = useState(getDefault());

  const changeDefault = (v) => { setDefault(v); setDef(v); };

  const primary   = def === 'whatsapp' ? 'whatsapp' : 'print';
  const secondary = def === 'whatsapp' ? 'print'    : 'whatsapp';

  const doWA    = () => sendWhatsApp(donation, donors);
  const doPrint = () => printReceipt(donation);

  const btnLabel = { whatsapp: '📱 שלח בוואטסאפ', print: '🖨️ הדפס קבלה' };
  const btnAction = { whatsapp: doWA, print: doPrint };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2>📋 שלח קבלה לתורם</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '14px 16px', marginBottom: 20, fontSize: '0.92rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 6 }}>{donation.donorName}</div>
            <div style={{ color: 'var(--green)', fontWeight: 600, fontSize: '1.1rem' }}>{formatILS(donation.amountILS || donation.amount)}</div>
            <div style={{ color: 'var(--gray-600)', fontSize: '0.85rem', marginTop: 4 }}>{donation.date} · {donation.paymentMethod}</div>
            {donation.reference && <div style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>אסמכתא: {donation.reference}</div>}
            {donation.receiptNumber && <div style={{ color: 'var(--navy)', fontWeight: 700, fontSize: '0.9rem', marginTop: 4 }}>מספר קבלה: {formatReceiptNum(donation.receiptNumber)}</div>}
          </div>

          {/* Primary button */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '1rem', marginBottom: 10 }}
            onClick={btnAction[primary]}
          >
            {btnLabel[primary]}
            <span style={{ fontSize: '0.75rem', opacity: 0.8, marginRight: 6 }}>(ברירת מחדל)</span>
          </button>

          {/* Secondary button */}
          <button
            className="btn btn-outline"
            style={{ width: '100%', padding: '11px', fontSize: '0.95rem', marginBottom: 18 }}
            onClick={btnAction[secondary]}
          >
            {btnLabel[secondary]}
          </button>

          {/* Default setting */}
          <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-600)', marginBottom: 8 }}>ברירת מחדל:</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {['whatsapp','print'].map(v => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input type="radio" name="def" checked={def === v} onChange={() => changeDefault(v)} />
                  {v === 'whatsapp' ? '📱 וואטסאפ' : '🖨️ הדפסה'}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>סגור</button>
          <button
            className="btn btn-primary"
            onClick={() => { doWA(); doPrint(); }}
            style={{ fontSize: '0.88rem' }}
          >
            שלח גם וגם
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Donations() {
  const { data: donations, loading, add, update, remove } = useDonations();
  const { data: donors } = useDonors();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [acOpen, setAcOpen] = useState(false);
  const [acQuery, setAcQuery] = useState('');
  const [receiptDonation, setReceiptDonation] = useState(null);
  const [expandNote, setExpandNote] = useState(null);
  const acRef = useRef(null);

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

  const acSuggestions = donors.filter(d =>
    acQuery.length > 0 &&
    (d.name?.includes(acQuery) || d.phone?.includes(acQuery))
  ).slice(0, 8);

  const selectDonor = (donor) => {
    setForm(f => ({
      ...f,
      donorName: donor.name,
      donorId: donor.id,
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
    const saved = { ...form, amountILS, ...(!editId && { receiptNumber: nextReceiptNum() }) };
    if (editId) {
      await update(editId, saved);
      close();
    } else {
      await add(saved);
      close();
      setReceiptDonation(saved);
    }
  };

  const del = async (id) => { if (window.confirm('למחוק תרומה זו?')) await remove(id); };

  const years = [...new Set(donations.map(d => (d.date || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  const allMonths = [...new Set(donations.map(d => monthKey(d.date)).filter(Boolean))].sort().reverse();
  const months = filterYear ? allMonths.filter(m => m.startsWith(filterYear)) : allMonths;

  const onYearChange = (y) => { setFilterYear(y); setFilterMonth(''); };

  const filtered = donations.filter(d => {
    const matchSearch = !search || d.donorName?.includes(search);
    const matchYear   = !filterYear  || (d.date || '').startsWith(filterYear);
    const matchMonth  = !filterMonth || monthKey(d.date) === filterMonth;
    return matchSearch && matchYear && matchMonth;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'date-desc') return (b.date || '') > (a.date || '') ? 1 : -1;
    if (sortBy === 'date-asc')  return (a.date || '') > (b.date || '') ? 1 : -1;
    if (sortBy === 'name-asc')  return (a.donorName || '').localeCompare(b.donorName || '', 'he');
    if (sortBy === 'name-desc') return (b.donorName || '').localeCompare(a.donorName || '', 'he');
    if (sortBy === 'amount-desc') return parseFloat(b.amountILS || 0) - parseFloat(a.amountILS || 0);
    if (sortBy === 'amount-asc')  return parseFloat(a.amountILS || 0) - parseFloat(b.amountILS || 0);
    return 0;
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
        <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 8 }}>
          <input
            className="form-control"
            placeholder="חיפוש לפי שם..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 200 }}
          />
          <select className="form-control" value={filterYear} onChange={e => onYearChange(e.target.value)} style={{ maxWidth: 110 }}>
            <option value="">כל השנים</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="form-control" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ maxWidth: 150 }}>
            <option value="">כל החודשים</option>
            {months.map(m => <option key={m} value={m}>{heMonthYear(m)}</option>)}
          </select>
          <select className="form-control" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ maxWidth: 170 }}>
            <option value="date-desc">תאריך — חדש לישן</option>
            <option value="date-asc">תאריך — ישן לחדש</option>
            <option value="name-asc">שם תורם — א׳ עד ת׳</option>
            <option value="name-desc">שם תורם — ת׳ עד א׳</option>
            <option value="amount-desc">סכום — גדול לקטן</option>
            <option value="amount-asc">סכום — קטן לגדול</option>
          </select>
          {(filterYear || filterMonth) && (
            <div style={{ fontWeight: 600, color: 'var(--green)', alignSelf: 'center' }}>
              סה"כ: {formatILS(totalFiltered)}
            </div>
          )}
          <button
            className="btn btn-outline btn-sm"
            style={{ marginRight: 'auto' }}
            onClick={() => printAllReceipts(sorted)}
            title={`הדפס ${sorted.length} קבלות`}
          >
            🖨️ הדפס הכל ({sorted.length})
          </button>
        </div>

        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>קבלה</th>
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
                {!loading && sorted.length === 0 && (
                  <tr><td colSpan={8}>
                    <div className="empty-state"><div className="icon">💰</div><p>אין תרומות להצגה</p></div>
                  </td></tr>
                )}
                {sorted.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>{d.receiptNumber ? formatReceiptNum(d.receiptNumber) : '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{d.date}</td>
                    <td style={{ fontWeight: 600 }}>{d.donorName}</td>
                    <td className="amount-positive">{d.amount} {d.currency}</td>
                    <td className="amount-positive">{formatILS(d.amountILS)}</td>
                    <td style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>{d.bankRef || d.reference || '—'}</td>
                    <td><span className="badge badge-blue">{d.paymentMethod}</span></td>
                    <td style={{ maxWidth: 160 }}>
                      {d.notes
                        ? expandNote === d.id
                          ? <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)', cursor: 'pointer' }} onClick={() => setExpandNote(null)}>
                              {d.notes} <span style={{ color: 'var(--navy)', fontWeight: 700 }}>▲</span>
                            </span>
                          : <span title={d.notes} style={{ cursor: 'pointer', color: 'var(--gray-400)', fontSize: '0.85rem' }} onClick={() => setExpandNote(d.id)}>
                              📝
                            </span>
                        : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setReceiptDonation(d)} title="שלח קבלה">📋</button>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(d)}>עריכה</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(d.id)}>מחק</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {sorted.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    <td colSpan={4} style={{ fontWeight: 700, padding: '12px 16px' }}>סה"כ</td>
                    <td className="amount-positive" style={{ fontWeight: 700 }}>{formatILS(totalFiltered)}</td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editId ? 'עריכת תרומה' : 'תרומה חדשה'}</h2>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid" style={{ gap: 14 }}>
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

                <div className="form-group">
                  <label className="form-label">תאריך *</label>
                  <input className="form-control" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>

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

                <div className="form-group">
                  <label className="form-label">מספר אסמכתא</label>
                  <input className="form-control" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="מספר אסמכתא / אישור" />
                </div>

                <div className="form-group">
                  <label className="form-label">אמצעי תשלום</label>
                  <select className="form-control" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>

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

      {/* Receipt modal */}
      {receiptDonation && (
        <ReceiptModal
          donation={receiptDonation}
          donors={donors}
          onClose={() => setReceiptDonation(null)}
        />
      )}
    </>
  );
}
