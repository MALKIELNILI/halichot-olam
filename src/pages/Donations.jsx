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

const LOGO_URL = 'https://malkielnili.github.io/halichot-olam/logo.jpg';

const RECEIPT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@700;900&family=Heebo:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Heebo', sans-serif; direction: rtl; background: #fff; }
  .receipt { max-width: 480px; margin: 30px auto; background: white; overflow: hidden; border-top: 8px solid #1a2744; box-shadow: 0 6px 30px rgba(0,0,0,0.2); }
  .bsd-top { text-align: right; font-family: 'Frank Ruhl Libre', serif; font-size: 13px; font-weight: 700; color: #1a2744; padding: 8px 16px 0; }
  .header { display: flex; align-items: center; border-bottom: 3px solid #b8973a; }
  .logo-block { background: #1a2744; padding: 16px 14px; display: flex; align-items: center; justify-content: center; min-width: 108px; }
  .logo-block img { width: 76px; height: 76px; object-fit: contain; }
  .text-block { padding: 12px 18px; flex: 1; }
  .org { font-family: 'Frank Ruhl Libre', serif; font-size: 26px; font-weight: 900; color: #1a2744; }
  .org-sub { font-size: 12px; color: #b8973a; font-weight: 600; margin-top: 3px; }
  .org-reg { font-size: 10px; color: #ccc; margin-top: 5px; }
  .receipt-title { background: #1a2744; color: #f0d060; text-align: center; padding: 9px; font-size: 16px; font-weight: 700; letter-spacing: 3px; }
  .receipt-num { text-align: center; padding: 5px; font-size: 12px; color: #888; background: #f8f8f8; border-bottom: 1px solid #eee; }
  .receipt-num strong { color: #1a2744; font-size: 14px; }
  .body { padding: 18px 24px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 9px 6px; border-bottom: 1px solid #eee; font-size: 14px; color: #222; }
  td:first-child { color: #888; width: 42%; font-size: 13px; }
  td:last-child { font-weight: 700; color: #1a2744; }
  .amount-row td:last-child { font-size: 22px; color: #2a6b4a; }
  .mosad-row td { color: #2a6b4a; font-size: 12px; background: #f0faf4; }
  .copy-btn { font-size: 10px; background: #1a2744; color: white; border: none; border-radius: 3px; padding: 2px 7px; cursor: pointer; margin-right: 8px; vertical-align: middle; }
  .copy-btn:hover { background: #b8973a; }
  .thankyou { text-align: center; padding: 14px 24px 6px; font-size: 13px; color: #888; line-height: 1.7; }
  .footer { text-align: center; padding: 10px; font-size: 11px; color: #bbb; border-top: 3px solid #1a2744; }
  @media print { .copy-btn { display: none; } .receipt { margin: 0 auto; page-break-after: always; } .receipt:last-child { page-break-after: avoid; } }
`;

function receiptHTML(d) {
  const amt = parseFloat(d.amountILS || d.amount || 0).toLocaleString('he-IL');
  const refDisplay = d.reference || d.bankRef || '';
  const ref = refDisplay ? `<tr><td>מס׳ אסמכתא</td><td>${refDisplay}</td></tr>` : '';
  const numBadge = d.receiptNumber
    ? `<div class="receipt-num">מספר קבלה: <strong>${formatReceiptNum(d.receiptNumber)}</strong></div>`
    : '';
  return `
  <div class="receipt">
    <div class="bsd-top">בס"ד</div>
    <div class="header">
      <div class="logo-block">
        <img src="${LOGO_URL}" onerror="this.style.display='none'" alt="לוגו"/>
      </div>
      <div class="text-block">
        <div class="org">תפארת מישאל</div>
        <div class="org-sub">הליכות עולם · צונץ 11, תל אביב</div>
        <div class="org-reg">עמותה מס׳ 580676807 · קוד מוסד 26542</div>
      </div>
    </div>
    <div class="receipt-title">קבלה על תרומה</div>
    ${numBadge}
    <div class="body">
      <table>
        <tr><td>שם התורם</td><td>${d.donorName}</td></tr>
        <tr class="amount-row"><td>סכום התרומה</td><td>₪${amt}</td></tr>
        <tr><td>תאריך תרומה</td><td>${d.date}</td></tr>
        <tr><td>אמצעי תשלום</td><td>${d.paymentMethod || '—'}</td></tr>
        ${ref}
        ${d.notes ? `<tr><td>הערות</td><td>${d.notes}</td></tr>` : ''}
        <tr class="mosad-row">
          <td>קוד מוסד (סעיף 46)</td>
          <td>
            <button class="copy-btn" onclick="navigator.clipboard.writeText('26542').then(()=>{this.textContent='✓ הועתק!';setTimeout(()=>this.textContent='העתק',2000)})">העתק</button>
            26542
          </td>
        </tr>
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

function DonorReceiptsModal({ donations, onClose, onRenumber, renumbering }) {
  const [issued, setIssued] = React.useState(getIssuedDonors);

  React.useEffect(() => {
    const refresh = () => setIssued(getIssuedDonors());
    window.addEventListener('issued-update', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('issued-update', refresh); window.removeEventListener('storage', refresh); };
  }, []);

  const noNum = donations.filter(d => !d.receiptNumber).length;
  const grouped = {};
  donations.forEach(d => {
    const name = d.donorName || 'ללא שם';
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push(d);
  });
  const donors = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0], 'he'));
  const pendingDonors = donors.filter(([name]) => !issued.has(name));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>📄 ייצוא PDF לפי תורם</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '0 24px' }}>
          {/* Renumber banner */}
          <div style={{ background: noNum > 0 ? '#fff8e1' : '#f0faf4', border: `1px solid ${noNum > 0 ? '#f0c040' : '#b8e0c8'}`, borderRadius: 8, padding: '10px 14px', margin: '14px 0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: '0.83rem' }}>
              {noNum > 0
                ? <><strong style={{ color: '#b45309' }}>{noNum} תרומות ללא מספר קבלה</strong> — מספר תחילה לפי תאריך</>
                : <span style={{ color: '#2a6b4a' }}>✓ כל התרומות ממוספרות</span>}
            </div>
            <button
              className="btn btn-sm"
              style={{ background: '#1a2744', color: 'white', whiteSpace: 'nowrap', opacity: renumbering ? 0.6 : 1 }}
              onClick={onRenumber}
              disabled={renumbering}
            >
              {renumbering ? 'ממספר...' : '🔢 מספר לפי תאריך'}
            </button>
          </div>

          {/* Donor list */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-600)', paddingBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span>{donors.length} תורמים · <span style={{ color: 'var(--green)', fontWeight: 600 }}>{issued.size} הופקו</span> · <span style={{ color: '#b45309', fontWeight: 600 }}>{pendingDonors.length} ממתינים</span></span>
              {issued.size > 0 && <button className="btn btn-sm" style={{ fontSize: '0.75rem', padding: '2px 8px' }} onClick={() => { localStorage.removeItem(ISSUED_KEY); setIssued(new Set()); }}>↩️ אפס</button>}
            </div>
            {donors.map(([name, dons]) => {
              const total = dons.reduce((s, d) => s + parseFloat(d.amountILS || d.amount || 0), 0);
              const sorted = [...dons].sort((a, b) => (a.date || '') > (b.date || '') ? 1 : -1);
              const nums = sorted.filter(d => d.receiptNumber).map(d => formatReceiptNum(d.receiptNumber));
              const isIssued = issued.has(name);
              return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--gray-200)', gap: 8, opacity: isIssued ? 0.5 : 1 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isIssued && <span style={{ color: 'var(--green)', fontSize: '0.85rem' }}>✓</span>}
                      {name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-600)', marginTop: 2 }}>
                      {dons.length} תרומות · {formatILS(total)}
                      {nums.length > 0 && <span style={{ color: 'var(--navy)', marginRight: 6 }}>· קבלות: {nums[0]}{nums.length > 1 ? `–${nums[nums.length-1]}` : ''}</span>}
                    </div>
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                    onClick={() => { printAllReceipts(sorted); markDonorIssued(name); setIssued(getIssuedDonors()); }}
                  >
                    🖨️ PDF
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>סגור</button>
          <button
            className="btn btn-primary"
            disabled={pendingDonors.length === 0}
            onClick={() => {
              const allDonors = pendingDonors.map(([name, dons]) => ({
                name,
                dons: [...dons].sort((a,b) => (a.date||'')>(b.date||'')?1:-1)
              }));
              printDonorsSequential(allDonors);
            }}
          >
            🖨️ הדפס ממתינים ({pendingDonors.length})
          </button>
        </div>
      </div>
    </div>
  );
}

const ISSUED_KEY = 'halichot_olam_issued_donors';
function getIssuedDonors() {
  try { return new Set(JSON.parse(localStorage.getItem(ISSUED_KEY) || '[]')); } catch { return new Set(); }
}
function markDonorIssued(name) {
  const s = getIssuedDonors(); s.add(name);
  localStorage.setItem(ISSUED_KEY, JSON.stringify([...s]));
}

function printDonorsSequential(allDonors) {
  if (!allDonors.length) return alert('אין תורמים חדשים להדפסה');
  let idx = 0;

  function openCurrent(win) {
    const { name, dons } = allDonors[idx];
    const isLast = idx === allDonors.length - 1;
    const navBar = `
      <div style="position:fixed;bottom:0;left:0;right:0;background:#1a2744;color:#f0d060;
        display:flex;align-items:center;justify-content:space-between;padding:10px 20px;
        font-family:Heebo,sans-serif;z-index:9999;direction:rtl;font-size:14px;">
        <span style="font-weight:700;">${name} (${idx+1}/${allDonors.length})</span>
        <div style="display:flex;gap:10px;">
          <button onclick="window.print()"
            style="background:#b8973a;color:#fff;border:none;border-radius:6px;padding:7px 16px;cursor:pointer;font-weight:700;font-size:13px;">
            🖨️ שמור PDF
          </button>
          ${!isLast ? `<button id="next-btn"
            style="background:#22c55e;color:#fff;border:none;border-radius:6px;padding:7px 16px;cursor:pointer;font-weight:700;font-size:13px;">
            הבא ← ${allDonors[idx+1].name}
          </button>` : `<span style="color:#6db86d;font-weight:700;">✓ אחרון</span>`}
        </div>
      </div>
      <div style="height:52px;"></div>`;

    win.document.open();
    win.document.write(`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
      <title>קבלות — ${name}</title><style>${RECEIPT_STYLES}
      body { padding-bottom: 60px; }
      @media print { #nav-bar { display:none!important; } body { padding-bottom:0; } }
      </style></head><body>
      <div id="nav-bar">${navBar}</div>
      ${dons.map(receiptHTML).join('')}
      <script>window.onload=()=>{
        var nb=document.getElementById('next-btn');
        if(nb) nb.onclick=function(){window.__goNext&&window.__goNext();};
        window.addEventListener('afterprint',function(){
          try{ if(window.opener&&window.opener.__markDonorIssued) window.opener.__markDonorIssued('${name.replace(/'/g,"\\'")}'); }catch(e){}
          ${!isLast ? `setTimeout(function(){window.__goNext&&window.__goNext();},400);` : ''}
        });
      };<\/script>
      </body></html>`);
    win.document.close();

    if (!isLast) {
      win.__goNext = () => { idx++; openCurrent(win); };
    }
  }

  window.__markDonorIssued = (name) => {
    markDonorIssued(name);
    window.dispatchEvent(new CustomEvent('issued-update'));
  };

  const win = window.open('', '_blank');
  openCurrent(win);
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
  const [donorReceiptsOpen, setDonorReceiptsOpen] = useState(false);
  const [renumbering, setRenumbering] = useState(false);
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

  const renumberByDate = async () => {
    if (!window.confirm(`ממספר ${donations.length} תרומות לפי תאריך (יחליף מספרים קיימים). להמשיך?`)) return;
    setRenumbering(true);
    const byDate = [...donations].sort((a, b) => (a.date || '') > (b.date || '') ? 1 : -1);
    for (let i = 0; i < byDate.length; i++) {
      await update(byDate[i].id, { ...byDate[i], receiptNumber: i + 1 });
    }
    localStorage.setItem(SEQ_KEY, String(byDate.length));
    setRenumbering(false);
    alert(`✓ מוספרו ${byDate.length} קבלות לפי תאריך`);
  };

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
          <div style={{ marginRight: 'auto', display: 'flex', gap: 8 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => printAllReceipts(sorted)}
              title={`הדפס ${sorted.length} קבלות`}
            >
              🖨️ הדפס הכל ({sorted.length})
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setDonorReceiptsOpen(true)}
              title="ייצוא PDF לפי תורם"
            >
              📄 לפי תורם
            </button>
          </div>
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

      {/* Donor receipts export modal */}
      {donorReceiptsOpen && (
        <DonorReceiptsModal
          donations={donations}
          onClose={() => setDonorReceiptsOpen(false)}
          onRenumber={renumberByDate}
          renumbering={renumbering}
        />
      )}
    </>
  );
}
