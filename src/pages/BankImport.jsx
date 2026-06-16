import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useDonations, useExpenses, useDonors, useScholars } from '../hooks/useFirestore';
import { todayISO } from '../utils/helpers';

// חילוץ שם מתיאור בנק
function extractName(desc, isIncome) {
  if (isIncome) {
    const m = desc.match(/מ(?:עו"ד\s+|עו״ד\s+)?(.+?)\s+חשבון/);
    if (m) return m[1].trim();
  } else {
    const m1 = desc.match(/ל(.+?)\s+בנק/);
    if (m1) return m1[1].trim();
    const m2 = desc.match(/הו["״]ק\s+ל(.+?)(?:\s+לסניף|,)/);
    if (m2) return m2[1].trim();
    const m3 = desc.match(/ל(.+?),/);
    if (m3) return m3[1].trim();
    const m4 = desc.match(/ל(.+)$/);
    if (m4) return m4[1].trim();
  }
  return desc;
}

// התאמה חלקית — מחפש מילה משותפת
function fuzzyMatch(bankName, candidates) {
  if (!bankName || !candidates.length) return null;
  const words = bankName.split(/[\s,]+/).filter(w => w.length > 2);
  for (const cand of candidates) {
    for (const w of words) {
      if (cand.includes(w)) return cand;
    }
    // גם הפוך — מילה מהשם הקיים בשם הבנק
    for (const cw of cand.split(/\s+/).filter(w => w.length > 2)) {
      if (bankName.includes(cw)) return cand;
    }
  }
  return null;
}

function parseDate(raw) {
  if (!raw) return todayISO();
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  return String(raw).slice(0, 10).replace(/T.*/, '');
}

const SKIP_WORDS = ['עמלת', 'עמלה', 'חליפין', 'מתפארת מישאל', 'מסלול מורחב'];

export default function BankImport() {
  const fileRef = useRef();
  const [txs, setTxs] = useState(null);
  const [selected, setSelected] = useState({});
  const [msg, setMsg] = useState('');
  const [importing, setImporting] = useState(false);

  const { data: donors } = useDonors();
  const { data: scholars } = useScholars();
  const { add: addDonation } = useDonations();
  const { add: addExpense } = useExpenses();

  const donorNames  = donors.map(d => d.name);
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
          const name = extractName(desc, isIncome);
          const matched = isIncome
            ? fuzzyMatch(name, donorNames)
            : fuzzyMatch(name, scholarNames);

          result.push({
            id: i,
            date: parseDate(row[0]),
            desc,
            amount: Math.abs(amount),
            isIncome,
            name,
            matched,
          });
        }

        if (result.length === 0) {
          setMsg('לא נמצאו תנועות בקובץ — בדוק שזה קובץ הנכון מלאומי');
          return;
        }

        setTxs(result);
        const sel = {};
        result.forEach(t => { sel[t.id] = true; });
        setSelected(sel);
      } catch (err) {
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
    setSelected(s => { const n={...s}; group.forEach(t => { n[t.id] = !anyOn; }); return n; });
  };

  const doImport = async () => {
    setImporting(true);
    const list = txs.filter(t => selected[t.id]);
    let donated = 0, expensed = 0;

    for (const t of list) {
      if (t.isIncome) {
        await addDonation({
          donorName: t.matched || t.name,
          amountILS: t.amount,
          currency: '₪',
          date: t.date,
          notes: t.desc,
        });
        donated++;
      } else {
        await addExpense({
          description: t.matched || t.name,
          amount: t.amount,
          category: 'מלגות אברכים',
          date: t.date,
          notes: t.desc,
          payee: t.matched || t.name,
        });
        expensed++;
      }
    }

    setMsg(`יובאו בהצלחה: ${donated} תרומות + ${expensed} הוצאות`);
    setTxs(null); setSelected({});
    setImporting(false);
  };

  const income   = txs?.filter(t => t.isIncome)  || [];
  const expenses = txs?.filter(t => !t.isIncome) || [];
  const selCount = Object.values(selected).filter(Boolean).length;

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
            background: msg.includes('שגיאה') || msg.includes('לא נמצאו') ? 'var(--red-light)' : 'var(--green-light)',
            color:      msg.includes('שגיאה') || msg.includes('לא נמצאו') ? 'var(--red)' : 'var(--green)',
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
                הקובץ יכיל הכנסות <em>וגם</em> הוצאות — האפליקציה תפריד אוטומטית.
              </p>
              <input type="file" accept=".xlsx,.xls" ref={fileRef} style={{ display: 'none' }} onChange={parseFile} />
              <button className="btn btn-primary" onClick={() => fileRef.current.click()}>
                בחר קובץ Excel מהבנק
              </button>
            </div>
          </div>
        )}

        {txs && (
          <>
            <div style={{ marginBottom: 12, fontSize: '0.88rem', color: 'var(--gray-600)' }}>
              ✓ = שם הותאם לרשימה קיימת | בחר/בטל שורות לפני הייבוא
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>

              {/* הכנסות */}
              <div className="card">
                <div className="card-header">
                  <h2>תרומות ({income.length})</h2>
                  <button className="btn btn-outline btn-sm" onClick={() => toggleAll(true)}>
                    {income.some(t => selected[t.id]) ? 'בטל הכל' : 'בחר הכל'}
                  </button>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th></th><th>תאריך</th><th>שם</th><th>סכום</th></tr></thead>
                    <tbody>
                      {income.length === 0 && (
                        <tr><td colSpan={4} className="empty-state"><p>אין הכנסות</p></td></tr>
                      )}
                      {income.map(t => (
                        <tr key={t.id} style={{ opacity: selected[t.id] ? 1 : 0.35 }}>
                          <td><input type="checkbox" checked={!!selected[t.id]} onChange={() => toggle(t.id)} /></td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{t.date}</td>
                          <td style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                            {t.matched
                              ? <>{t.matched} <span style={{ color: 'var(--green)', fontSize: '0.72rem' }}>✓</span></>
                              : <span style={{ color: 'var(--gray-400)' }}>{t.name}</span>}
                          </td>
                          <td className="amount-positive">₪{t.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* הוצאות */}
              <div className="card">
                <div className="card-header">
                  <h2>הוצאות / מלגות ({expenses.length})</h2>
                  <button className="btn btn-outline btn-sm" onClick={() => toggleAll(false)}>
                    {expenses.some(t => selected[t.id]) ? 'בטל הכל' : 'בחר הכל'}
                  </button>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th></th><th>תאריך</th><th>שם</th><th>סכום</th></tr></thead>
                    <tbody>
                      {expenses.length === 0 && (
                        <tr><td colSpan={4} className="empty-state"><p>אין הוצאות</p></td></tr>
                      )}
                      {expenses.map(t => (
                        <tr key={t.id} style={{ opacity: selected[t.id] ? 1 : 0.35 }}>
                          <td><input type="checkbox" checked={!!selected[t.id]} onChange={() => toggle(t.id)} /></td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{t.date}</td>
                          <td style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                            {t.matched
                              ? <>{t.matched} <span style={{ color: 'var(--green)', fontSize: '0.72rem' }}>✓</span></>
                              : <span style={{ color: 'var(--gray-400)' }}>{t.name}</span>}
                          </td>
                          <td className="amount-negative">₪{t.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={doImport} disabled={selCount === 0 || importing}>
                {importing ? 'מייבא...' : `ייבא ${selCount} תנועות נבחרות`}
              </button>
              <button className="btn btn-outline" onClick={() => { setTxs(null); setSelected({}); setMsg(''); }}>
                ביטול
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
