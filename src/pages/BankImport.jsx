import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useDonations, useExpenses, useDonors, useScholars } from '../hooks/useFirestore';
import { todayISO } from '../utils/helpers';

// תאריך מקומי (ללא UTC shift)
function parseDate(raw) {
  if (!raw) return todayISO();
  if (raw instanceof Date) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(raw).slice(0, 10).replace(/T.*/, '');
}

function extractName(desc, isIncome) {
  if (isIncome) {
    const m = desc.match(/מ(?:עו"ד\s+|עו״ד\s+)?(.+?)\s+חשבון/);
    if (m) return m[1].trim();
    // "מתפארת מישאל" ← נשאיר כמו שהוא
  } else {
    const m1 = desc.match(/ל(.+?)\s+בנק/);
    if (m1) return m1[1].trim();
    const m2 = desc.match(/הו["״ו]ק\s+ל(.+?)(?:\s+לסניף|,)/);
    if (m2) return m2[1].trim();
    const m3 = desc.match(/ל(.+?),/);
    if (m3) return m3[1].trim();
    const m4 = desc.match(/ל(.+)$/);
    if (m4) return m4[1].trim();
  }
  return desc;
}

function fuzzyMatch(bankName, candidates) {
  if (!bankName || !candidates.length) return null;
  const words = bankName.split(/[\s,]+/).filter(w => w.length > 2);
  for (const cand of candidates) {
    for (const w of words) {
      if (cand.includes(w)) return cand;
    }
    for (const cw of cand.split(/\s+/).filter(w => w.length > 2)) {
      if (bankName.includes(cw)) return cand;
    }
  }
  return null;
}

const SKIP_WORDS = ['עמלת', 'עמלה', 'חליפין', 'מסלול מורחב'];

function TxTable({ rows, selected, toggle, toggleAll, isIncome }) {
  const known   = rows.filter(t => t.matched);
  const unknown = rows.filter(t => !t.matched);
  const anyOn   = rows.some(t => selected[t.id]);

  const Row = ({ t }) => (
    <tr style={{ opacity: selected[t.id] ? 1 : 0.35 }}>
      <td><input type="checkbox" checked={!!selected[t.id]} onChange={() => toggle(t.id)} /></td>
      <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>{t.date}</td>
      <td style={{ fontWeight: 600, fontSize: '0.88rem' }}>
        {t.matched
          ? <>{t.matched} <span style={{ color: 'var(--green)', fontSize: '0.72rem' }}>✓</span></>
          : <span style={{ color: 'var(--navy)' }}>{t.name}</span>}
      </td>
      <td style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>{t.ref}</td>
      <td className={isIncome ? 'amount-positive' : 'amount-negative'} style={{ whiteSpace: 'nowrap' }}>
        ₪{t.amount.toLocaleString()}
      </td>
    </tr>
  );

  return (
    <div className="card">
      <div className="card-header">
        <h2>{isIncome ? 'תרומות' : 'הוצאות / מלגות'} ({rows.length})</h2>
        <button className="btn btn-outline btn-sm" onClick={() => toggleAll(isIncome)}>
          {anyOn ? 'בטל הכל' : 'בחר הכל'}
        </button>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th></th><th>תאריך</th><th>שם</th><th>אסמכתה</th><th>סכום</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="empty-state"><p>אין תנועות</p></td></tr>
            )}

            {/* מוכרים */}
            {known.length > 0 && (
              <tr><td colSpan={5} style={{ background: 'var(--green-light)', padding: '6px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--green)' }}>
                ✓ מוכרים ({known.length})
              </td></tr>
            )}
            {known.map(t => <Row key={t.id} t={t} />)}

            {/* לא מוכרים */}
            {unknown.length > 0 && (
              <tr><td colSpan={5} style={{ background: '#fff8e1', padding: '6px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#8a6a1a' }}>
                ⚠ לא מוכרים — {isIncome ? 'תורמים חדשים' : 'ספקים/לא ידועים'} ({unknown.length})
              </td></tr>
            )}
            {unknown.map(t => <Row key={t.id} t={t} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BankImport() {
  const fileRef = useRef();
  const [txs, setTxs] = useState(null);
  const [selected, setSelected] = useState({});
  const [msg, setMsg] = useState('');
  const [importing, setImporting] = useState(false);

  const { data: donors,  add: addDonor  } = useDonors();
  const { data: scholars }                 = useScholars();
  const { add: addDonation }               = useDonations();
  const { add: addExpense  }               = useExpenses();

  const donorNames   = donors.map(d => d.name);
  const scholarNames = scholars.map(s => s.name);

  const parseFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMsg(''); setTxs(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const result = [];
        for (let i = 9; i < rows.length; i++) {
          const row = rows[i];
          const desc   = String(row[2] || '').trim();
          const amount = parseFloat(row[3] || 0);
          if (!desc || !amount) continue;
          if (SKIP_WORDS.some(w => desc.includes(w))) continue;

          const isIncome = amount > 0;
          const name     = extractName(desc, isIncome);
          const matched  = isIncome
            ? fuzzyMatch(name, donorNames)
            : fuzzyMatch(name, scholarNames);
          const ref      = String(row[5] || '').trim();

          result.push({ id: i, date: parseDate(row[0]), desc, amount: Math.abs(amount), isIncome, name, matched, ref });
        }

        if (result.length === 0) { setMsg('לא נמצאו תנועות — בדוק שזה קובץ לאומי'); return; }

        setTxs(result);
        const sel = {};
        result.forEach(t => { sel[t.id] = true; });
        setSelected(sel);
      } catch {
        setMsg('שגיאה בקריאת הקובץ. ודא שזה Excel מלאומי.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const toggle    = (id) => setSelected(s => ({ ...s, [id]: !s[id] }));
  const toggleAll = (isIncome) => {
    const group = txs.filter(t => t.isIncome === isIncome);
    const anyOn = group.some(t => selected[t.id]);
    setSelected(s => { const n = {...s}; group.forEach(t => { n[t.id] = !anyOn; }); return n; });
  };

  // הוספת תורמים חדשים שלא מוכרים לפני ייבוא
  const addNewDonors = async (list) => {
    const unknown = list.filter(t => t.isIncome && !t.matched);
    const seen = new Set(donorNames);
    for (const t of unknown) {
      if (!seen.has(t.name)) {
        await addDonor({ name: t.name, phone: '', email: '', country: 'ישראל', address: '', notes: '', isRecurring: false, recurringAmount: '', recurringCurrency: '₪', recurringDay: '1' });
        seen.add(t.name);
      }
    }
  };

  const doImport = async () => {
    setImporting(true);
    const list = txs.filter(t => selected[t.id]);

    // הוסף תורמים חדשים תחילה
    await addNewDonors(list);

    let donated = 0, expensed = 0;
    for (const t of list) {
      const noteStr = `אסמכתה: ${t.ref} | ${t.desc}`;
      if (t.isIncome) {
        await addDonation({ donorName: t.matched || t.name, amountILS: t.amount, currency: '₪', date: t.date, notes: noteStr });
        donated++;
      } else {
        await addExpense({ description: t.matched || t.name, amount: t.amount, category: 'מלגות אברכים', date: t.date, payee: t.matched || t.name, notes: noteStr });
        expensed++;
      }
    }

    const newDonorsCount = list.filter(t => t.isIncome && !t.matched).length;
    setMsg(`יובאו: ${donated} תרומות + ${expensed} הוצאות${newDonorsCount ? ` | נוספו ${newDonorsCount} תורמים חדשים` : ''}`);
    setTxs(null); setSelected({});
    setImporting(false);
  };

  const income   = txs?.filter(t => t.isIncome)  || [];
  const expenses = txs?.filter(t => !t.isIncome) || [];
  const selCount = Object.values(selected).filter(Boolean).length;
  const newDonors = income.filter(t => !t.matched);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>ייבוא מבנק</h1>
          <div className="subtitle">ייבוא תנועות מאקסל לאומי — קובץ אחד לכל</div>
        </div>
        {txs && (
          <button className="btn btn-primary" onClick={doImport} disabled={selCount === 0 || importing}>
            {importing ? 'מייבא...' : `ייבא ${selCount} תנועות`}
          </button>
        )}
      </div>

      <div className="page-body">
        {msg && (
          <div style={{
            marginBottom: 20, padding: '12px 16px', borderRadius: 8, fontWeight: 600,
            background: msg.includes('שגיאה') ? 'var(--red-light)' : 'var(--green-light)',
            color:      msg.includes('שגיאה') ? 'var(--red)' : 'var(--green)',
          }}>
            {msg}
          </div>
        )}

        {!txs && (
          <div className="card" style={{ maxWidth: 520 }}>
            <div className="card-header"><h2>העלאת קובץ</h2></div>
            <div className="card-body">
              <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem', lineHeight: 1.8, marginBottom: 20 }}>
                בלאומי: <strong>חשבון עובר ושב ← תנועות ← ייצוא Excel</strong><br/>
                הורד קובץ אחד לכל התקופה — האפליקציה תפריד הכנסות מהוצאות אוטומטית.
              </p>
              <input type="file" accept=".xlsx,.xls" ref={fileRef} style={{ display: 'none' }} onChange={parseFile} />
              <button className="btn btn-primary" onClick={() => fileRef.current.click()}>בחר קובץ Excel מהבנק</button>
            </div>
          </div>
        )}

        {txs && (
          <>
            {newDonors.length > 0 && (
              <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fff8e1', borderRadius: 8, fontSize: '0.88rem', color: '#8a6a1a', fontWeight: 600 }}>
                ⚠ {newDonors.length} תורמים חדשים שלא ברשימה — יתווספו אוטומטית לרשימת התורמים בעת הייבוא
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
              <TxTable rows={income}   selected={selected} toggle={toggle} toggleAll={toggleAll} isIncome={true}  />
              <TxTable rows={expenses} selected={selected} toggle={toggle} toggleAll={toggleAll} isIncome={false} />
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={doImport} disabled={selCount === 0 || importing}>
                {importing ? 'מייבא...' : `ייבא ${selCount} תנועות נבחרות`}
              </button>
              <button className="btn btn-outline" onClick={() => { setTxs(null); setSelected({}); setMsg(''); }}>ביטול</button>
              <span style={{ fontSize: '0.82rem', color: 'var(--gray-400)' }}>
                ✓ מוכרים | ⚠ לא מוכרים (יתווספו לרשימה)
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
