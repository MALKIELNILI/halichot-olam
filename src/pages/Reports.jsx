import React, { useState, useMemo } from 'react';
import { useDonations, useExpenses, useScholars } from '../hooks/useFirestore';
import { formatILS, sumField, monthKey, heMonthYear, heMonth } from '../utils/helpers';

export default function Reports() {
  const { data: donations } = useDonations();
  const { data: expenses }  = useExpenses();
  const { data: scholars }  = useScholars();
  const [tab, setTab]       = useState('monthly');
  const [year, setYear]     = useState(new Date().getFullYear().toString());
  const [month, setMonth]   = useState('');

  const years = useMemo(() => {
    const all = [...donations, ...expenses].map(x => x.date?.slice(0, 4)).filter(Boolean);
    return [...new Set(all)].sort().reverse();
  }, [donations, expenses]);

  const months = useMemo(() => {
    const keys = [...donations, ...expenses]
      .map(x => monthKey(x.date))
      .filter(k => k && k.startsWith(year));
    return [...new Set(keys)].sort().reverse();
  }, [donations, expenses, year]);

  // ── All transactions (detailed) ──
  const allTxs = useMemo(() => {
    const filtDon = donations.filter(d => (!year || d.date?.startsWith(year)) && (!month || monthKey(d.date) === month));
    const filtExp = expenses.filter(e => (!year || e.date?.startsWith(year)) && (!month || monthKey(e.date) === month));
    return [
      ...filtDon.map(d => ({ date: d.date, type: 'הכנסה', desc: d.donorName, ref: d.bankRef || d.reference || '', amount: parseFloat(d.amountILS || 0) })),
      ...filtExp.map(e => ({ date: e.date, type: 'הוצאה', desc: e.description, ref: e.bankRef || e.reference || '', amount: parseFloat(e.amount || 0) })),
    ].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [donations, expenses, year, month]);

  // ── Monthly breakdown ──
  const monthlyData = useMemo(() => {
    return months.map(mk => {
      const inc = sumField(donations.filter(d => monthKey(d.date) === mk), 'amountILS');
      const exp = sumField(expenses.filter(e => monthKey(e.date) === mk), 'amount');
      return { month: mk, inc, exp, net: inc - exp };
    });
  }, [months, donations, expenses]);

  // ── Donors summary ──
  const donorSummary = useMemo(() => {
    const map = {};
    donations
      .filter(d => !year || d.date?.startsWith(year))
      .forEach(d => {
        const key = d.donorName || 'לא ידוע';
        if (!map[key]) map[key] = { name: key, total: 0, count: 0 };
        map[key].total += parseFloat(d.amountILS || 0);
        map[key].count++;
      });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [donations, year]);

  // ── Category breakdown ──
  const catSummary = useMemo(() => {
    const map = {};
    expenses
      .filter(e => !year || e.date?.startsWith(year))
      .forEach(e => {
        const key = e.category || 'אחר';
        if (!map[key]) map[key] = { cat: key, total: 0 };
        map[key].total += parseFloat(e.amount || 0);
      });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [expenses, year]);

  // ── WhatsApp report ──
  const sendWhatsAppReport = () => {
    const filtDon = donations.filter(d => (!month || monthKey(d.date) === month) && (!year || d.date?.startsWith(year)));
    const filtExp = expenses.filter(e => (!month || monthKey(e.date) === month) && (!year || e.date?.startsWith(year)));
    const totalDon = sumField(filtDon, 'amountILS');
    const totalExp = sumField(filtExp, 'amount');
    const net = totalDon - totalExp;
    const periodLabel = month ? heMonthYear(month) : `שנת ${year}`;

    const fmt = (n) => parseFloat(n || 0).toLocaleString('he-IL');

    let text = `📊 דוח כספי – תפארת מישאל\nתקופה: ${periodLabel}\n`;
    text += `─────────────────\n`;

    text += `\n📥 הכנסות (${filtDon.length}):\n`;
    [...filtDon].sort((a,b) => (a.date||'').localeCompare(b.date||'')).forEach(d => {
      const ref = d.bankRef || d.reference;
      text += `• ${d.date} | ${d.donorName}${ref ? ' | ' + ref : ''} | +${fmt(d.amountILS)} ₪\n`;
    });
    text += `סך הכנסות: *${fmt(totalDon)} ₪*\n`;

    text += `\n📤 הוצאות (${filtExp.length}):\n`;
    [...filtExp].sort((a,b) => (a.date||'').localeCompare(b.date||'')).forEach(e => {
      const ref = e.bankRef || e.reference;
      text += `• ${e.date} | ${e.description}${ref ? ' | ' + ref : ''} | -${fmt(e.amount)} ₪\n`;
    });
    text += `סך הוצאות: *${fmt(totalExp)} ₪*\n`;

    text += `\n─────────────────\n`;
    text += `מאזן: *${net >= 0 ? '+' : ''}${fmt(net)} ₪*\n`;
    text += `הופק: ${new Date().toLocaleDateString('he-IL')}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ── Accountant report (period) ──
  const printAccountantReport = () => {
    const filtDon = donations.filter(d => (!year || d.date?.startsWith(year)) && (!month || monthKey(d.date) === month));
    const filtExp = expenses.filter(e => (!year || e.date?.startsWith(year)) && (!month || monthKey(e.date) === month));
    const totalDon = sumField(filtDon, 'amountILS');
    const totalExp = sumField(filtExp, 'amount');
    const periodLabel = month ? heMonthYear(month) : `שנת ${year}`;

    const rows = [
      ...filtDon.map(d => ({
        date: d.date, type: 'הכנסה', category: 'תרומה',
        desc: d.donorName, ref: d.bankRef || d.reference || '', amount: `+${parseFloat(d.amountILS || 0).toLocaleString('he-IL')}`,
      })),
      ...filtExp.map(e => ({
        date: e.date, type: 'הוצאה', category: e.category,
        desc: e.description, ref: e.bankRef || e.reference || '', amount: `-${parseFloat(e.amount || 0).toLocaleString('he-IL')}`,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    const STYLES = `
      @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700&display=swap');
      body { font-family: 'Heebo', sans-serif; direction: rtl; padding: 40px; color: #1a2744; font-size: 13px; }
      .header { border-bottom: 3px solid #b8973a; padding-bottom: 16px; margin-bottom: 24px; }
      .org-name { font-size: 22px; font-weight: 700; }
      .org-sub  { font-size: 14px; color: #6b6762; }
      .report-title { font-size: 16px; font-weight: 700; margin: 16px 0 4px; }
      .period { color: #6b6762; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th { background: #1a2744; color: white; padding: 9px 12px; text-align: right; font-size: 11px; }
      td { padding: 8px 12px; border-bottom: 1px solid #e2e0dc; }
      tr:nth-child(even) { background: #f8f5ef; }
      .income  { color: #2a6b4a; font-weight: 600; }
      .expense { color: #8b2020; font-weight: 600; }
      .summary { margin-top: 24px; border: 1px solid #e2e0dc; border-radius: 8px; padding: 16px; }
      .summary-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0ee; }
      .summary-row:last-child { border-bottom: none; font-weight: 700; font-size: 15px; }
      .footer { margin-top: 32px; font-size: 11px; color: #9e9b95; border-top: 1px solid #e2e0dc; padding-top: 12px; }
      @media print { body { padding: 20px; } }`;

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><title>דוח כספי – תפארת מישאל</title><style>${STYLES}</style></head><body>
      <div class="header">
        <div class="org-name">תפארת מישאל – הליכות עולם</div>
        <div class="org-sub">צונץ 11, תל אביב</div>
        <div class="report-title">דוח כספי</div>
        <div class="period">תקופה: ${periodLabel} | הופק: ${new Date().toLocaleDateString('he-IL')}</div>
      </div>
      <table><thead><tr><th>תאריך</th><th>סוג</th><th>קטגוריה</th><th>תיאור</th><th>אסמכתא</th><th>סכום (₪)</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${r.date}</td><td class="${r.type==='הכנסה'?'income':'expense'}">${r.type}</td><td>${r.category}</td><td>${r.desc}</td><td>${r.ref}</td><td class="${r.type==='הכנסה'?'income':'expense'}">${r.amount}</td></tr>`).join('')}</tbody></table>
      <div class="summary">
        <div class="summary-row"><span>סך הכנסות</span><span class="income">+ ${totalDon.toLocaleString('he-IL')} ₪</span></div>
        <div class="summary-row"><span>סך הוצאות</span><span class="expense">- ${totalExp.toLocaleString('he-IL')} ₪</span></div>
        <div class="summary-row"><span>מאזן תקופה</span><span class="${totalDon-totalExp>=0?'income':'expense'}">${(totalDon-totalExp).toLocaleString('he-IL')} ₪</span></div>
      </div>
      <div class="footer">הופק: ${new Date().toLocaleDateString('he-IL',{hour:'2-digit',minute:'2-digit'})} · תפארת מישאל – הליכות עולם</div>
      <script>window.onload=()=>window.print();<\/script></body></html>`);
    win.document.close();
  };

  // ── Annual report for "ניהול תקין" ──
  const printAnnualReport = () => {
    const filtDon = donations.filter(d => d.date?.startsWith(year));
    const filtExp = expenses.filter(e => e.date?.startsWith(year));
    const totalDon = sumField(filtDon, 'amountILS');
    const totalExp = sumField(filtExp, 'amount');
    const net = totalDon - totalExp;
    const fmt = n => parseFloat(n||0).toLocaleString('he-IL');

    // Monthly breakdown
    const mKeys = [...new Set([...filtDon.map(d=>monthKey(d.date)), ...filtExp.map(e=>monthKey(e.date))].filter(Boolean))].sort();
    const monthlyRows = mKeys.map(mk => {
      const inc = sumField(filtDon.filter(d=>monthKey(d.date)===mk), 'amountILS');
      const exp = sumField(filtExp.filter(e=>monthKey(e.date)===mk), 'amount');
      return { mk, inc, exp, net: inc-exp };
    });

    // Donor summary
    const donorMap = {};
    filtDon.forEach(d => {
      const k = d.donorName || 'לא ידוע';
      if (!donorMap[k]) donorMap[k] = { name: k, total: 0, count: 0 };
      donorMap[k].total += parseFloat(d.amountILS||0);
      donorMap[k].count++;
    });
    const donorRows = Object.values(donorMap).sort((a,b)=>b.total-a.total);

    // Category summary
    const catMap = {};
    filtExp.forEach(e => {
      const k = e.category||'אחר';
      if (!catMap[k]) catMap[k] = { cat: k, total: 0 };
      catMap[k].total += parseFloat(e.amount||0);
    });
    const catRows = Object.values(catMap).sort((a,b)=>b.total-a.total);

    const STYLES = `
      @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Heebo',sans-serif;direction:rtl;color:#1a2744;background:#fff;font-size:13px}
      .cover{min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:#1a2744;color:#fff;padding:60px 40px;page-break-after:always}
      .cover-logo{width:110px;height:110px;object-fit:contain;border-radius:50%;background:#fff;padding:10px;margin-bottom:20px}
      .cover-org{font-size:32px;font-weight:800;margin-bottom:6px}
      .cover-reg{font-size:13px;opacity:0.55;margin-bottom:4px;letter-spacing:0.5px}
      .cover-sub{font-size:15px;opacity:0.65;margin-bottom:40px}
      .cover-title{font-size:22px;font-weight:700;background:#b8973a;padding:16px 40px;border-radius:8px;margin-bottom:24px}
      .cover-year{font-size:48px;font-weight:800;letter-spacing:4px;margin-bottom:8px}
      .cover-period{font-size:14px;opacity:0.6}
      .cover-date{margin-top:40px;font-size:13px;opacity:0.5}
      .section{padding:40px;page-break-inside:avoid}
      .section-title{font-size:18px;font-weight:700;border-bottom:3px solid #b8973a;padding-bottom:10px;margin-bottom:20px}
      .summary-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px}
      .summary-card{border:1px solid #e2e0dc;border-radius:10px;padding:20px;text-align:center}
      .summary-label{font-size:12px;color:#6b6762;margin-bottom:6px}
      .summary-val{font-size:24px;font-weight:700}
      .income{color:#2a6b4a}.expense{color:#8b2020}.neutral{color:#1a2744}
      table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
      th{background:#1a2744;color:#fff;padding:8px 10px;text-align:right;font-size:11px}
      td{padding:7px 10px;border-bottom:1px solid #e8e6e0}
      tr:nth-child(even){background:#f8f5ef}
      tfoot td{font-weight:700;background:#f0ece3;padding:9px 10px}
      .footer{text-align:center;padding:20px;font-size:11px;color:#9e9b95;border-top:1px solid #e2e0dc;margin-top:20px}
      @media print{.section{padding:20px}.cover{page-break-after:always}}`;

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><title>דוח שנתי ${year} – תפארת מישאל</title><style>${STYLES}</style></head><body>

    <div class="cover">
      <img class="cover-logo" src="https://malkielnili.github.io/halichot-olam/logo.jpg" onerror="this.style.display='none'" alt="לוגו" />
      <div class="cover-org">תפארת מישאל</div>
      <div class="cover-reg">עמותה מס׳ 580676807</div>
      <div class="cover-sub">הליכות עולם · צונץ 11, תל אביב</div>
      <div class="cover-title">דוח כספי שנתי</div>
      <div class="cover-year">${year}</div>
      <div class="cover-period">1 בינואר ${year} – 31 בדצמבר ${year}</div>
      <div class="cover-date">הופק: ${new Date().toLocaleDateString('he-IL')}</div>
    </div>

    <div class="section">
      <div class="section-title">סיכום שנתי</div>
      <div class="summary-grid">
        <div class="summary-card"><div class="summary-label">סך הכנסות</div><div class="summary-val income">${fmt(totalDon)} ₪</div></div>
        <div class="summary-card"><div class="summary-label">סך הוצאות</div><div class="summary-val expense">${fmt(totalExp)} ₪</div></div>
        <div class="summary-card"><div class="summary-label">מאזן שנתי</div><div class="summary-val ${net>=0?'income':'expense'}">${net>=0?'+':''}${fmt(net)} ₪</div></div>
      </div>
      <table><thead><tr><th>חודש</th><th>הכנסות (₪)</th><th>הוצאות (₪)</th><th>מאזן (₪)</th></tr></thead>
      <tbody>${monthlyRows.map(r=>`<tr><td>${heMonthYear(r.mk)}</td><td class="income">${fmt(r.inc)}</td><td class="expense">${fmt(r.exp)}</td><td class="${r.net>=0?'income':'expense'}">${r.net>=0?'+':''}${fmt(r.net)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>סה"כ</td><td class="income">${fmt(totalDon)}</td><td class="expense">${fmt(totalExp)}</td><td class="${net>=0?'income':'expense'}">${net>=0?'+':''}${fmt(net)}</td></tr></tfoot>
      </table>
    </div>

    <div class="section" style="page-break-before:always">
      <div class="section-title">פירוט תורמים – ${year} (${donorRows.length} תורמים)</div>
      <table><thead><tr><th>#</th><th>שם התורם</th><th>מספר תרומות</th><th>סך תרומות (₪)</th></tr></thead>
      <tbody>${donorRows.map((d,i)=>`<tr><td>${i+1}</td><td style="font-weight:600">${d.name}</td><td>${d.count}</td><td class="income">${fmt(d.total)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2">סה"כ</td><td>${filtDon.length}</td><td class="income">${fmt(totalDon)}</td></tr></tfoot>
      </table>
    </div>

    <div class="section" style="page-break-before:always">
      <div class="section-title">פירוט הוצאות לפי קטגוריה – ${year}</div>
      <table><thead><tr><th>קטגוריה</th><th>סך הוצאות (₪)</th><th>אחוז</th></tr></thead>
      <tbody>${catRows.map(c=>`<tr><td>${c.cat}</td><td class="expense">${fmt(c.total)}</td><td>${totalExp>0?(c.total/totalExp*100).toFixed(1)+'%':'—'}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>סה"כ</td><td class="expense">${fmt(totalExp)}</td><td>100%</td></tr></tfoot>
      </table>
    </div>

    <div class="section" style="page-break-before:always">
      <div class="section-title">פירוט כל ההוצאות – ${year} (${filtExp.length} רשומות)</div>
      <table><thead><tr><th>תאריך</th><th>קטגוריה</th><th>תיאור</th><th>אסמכתא</th><th>סכום (₪)</th></tr></thead>
      <tbody>${[...filtExp].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(e=>`<tr><td>${e.date}</td><td>${e.category||'—'}</td><td>${e.description||e.payee||'—'}</td><td style="font-size:11px;color:#888">${e.bankRef||e.reference||'—'}</td><td class="expense">${fmt(e.amount)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="4">סה"כ</td><td class="expense">${fmt(totalExp)}</td></tr></tfoot>
      </table>
    </div>

    <div class="footer">דוח שנתי ${year} · תפארת מישאל – הליכות עולם · הופק: ${new Date().toLocaleDateString('he-IL')}</div>
    <script>window.onload=()=>window.print();<\/script></body></html>`);
    win.document.close();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>דוחות</h1>
          <div className="subtitle">ניתוח ודוחות כספיים</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="form-control" value={year} onChange={e => setYear(e.target.value)} style={{ maxWidth: 100 }}>
            {years.map(y => <option key={y}>{y}</option>)}
            <option value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</option>
          </select>
          <select className="form-control" value={month} onChange={e => setMonth(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">כל השנה</option>
            {months.map(m => <option key={m} value={m}>{heMonthYear(m)}</option>)}
          </select>
          <button className="btn btn-outline" onClick={sendWhatsAppReport}>📱 שלח וואטסאפ לרו"ח</button>
          <button className="btn btn-gold" onClick={printAccountantReport}>🖨️ הדפס לרו"ח</button>
          <button className="btn btn-primary" onClick={printAnnualReport} title={`דוח שנתי מלא לניהול תקין – ${year}`}>📋 דוח שנתי {year}</button>
        </div>
      </div>

      <div className="page-body">
        <div className="tabs">
          {[['monthly','סיכום חודשי'],['donors','תורמים'],['categories','קטגוריות הוצאה'],['transactions','פירוט תנועות']].map(([v,l]) => (
            <button key={v} className={`tab ${tab === v ? 'active' : ''}`} onClick={() => setTab(v)}>{l}</button>
          ))}
        </div>

        {tab === 'monthly' && (
          <div className="card">
            <div className="card-header"><h2>סיכום חודשי – {year}</h2></div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>חודש</th>
                    <th>הכנסות</th>
                    <th>הוצאות</th>
                    <th>מאזן חודשי</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.length === 0 && (
                    <tr><td colSpan={4}><div className="empty-state"><p>אין נתונים לשנה זו</p></div></td></tr>
                  )}
                  {monthlyData.map(r => (
                    <tr key={r.month}>
                      <td style={{ fontWeight: 600 }}>{heMonthYear(r.month)}</td>
                      <td className="amount-positive">{formatILS(r.inc)}</td>
                      <td className="amount-negative">{formatILS(r.exp)}</td>
                      <td className={r.net >= 0 ? 'amount-positive' : 'amount-negative'}>{formatILS(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
                {monthlyData.length > 0 && (
                  <tfoot>
                    <tr style={{ background: 'var(--gray-50)', fontWeight: 700 }}>
                      <td style={{ padding: '12px 16px' }}>סה"כ {year}</td>
                      <td className="amount-positive">{formatILS(monthlyData.reduce((s,r) => s+r.inc, 0))}</td>
                      <td className="amount-negative">{formatILS(monthlyData.reduce((s,r) => s+r.exp, 0))}</td>
                      <td className={monthlyData.reduce((s,r) => s+r.net, 0) >= 0 ? 'amount-positive' : 'amount-negative'}>
                        {formatILS(monthlyData.reduce((s,r) => s+r.net, 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {tab === 'donors' && (
          <div className="card">
            <div className="card-header"><h2>תורמים – {year}</h2></div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>שם תורם</th><th>מספר תרומות</th><th>סך תרומות</th></tr>
                </thead>
                <tbody>
                  {donorSummary.map((d, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td>{d.count}</td>
                      <td className="amount-positive">{formatILS(d.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'categories' && (
          <div className="card">
            <div className="card-header"><h2>קטגוריות הוצאה – {year}</h2></div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>קטגוריה</th><th>סך הוצאות</th></tr>
                </thead>
                <tbody>
                  {catSummary.map((c, i) => (
                    <tr key={i}>
                      <td><span className="badge badge-blue">{c.cat}</span></td>
                      <td className="amount-negative">{formatILS(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'transactions' && (
          <div className="card">
            <div className="card-header">
              <h2>פירוט תנועות – {month ? heMonthYear(month) : year} ({allTxs.length})</h2>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>תאריך</th>
                    <th>סוג</th>
                    <th>תיאור</th>
                    <th>אסמכתה</th>
                    <th>סכום</th>
                  </tr>
                </thead>
                <tbody>
                  {allTxs.length === 0 && (
                    <tr><td colSpan={5}><div className="empty-state"><p>אין תנועות לתקופה זו</p></div></td></tr>
                  )}
                  {allTxs.map((r, i) => (
                    <tr key={i}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.88rem' }}>{r.date}</td>
                      <td style={{ color: r.type === 'הכנסה' ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: '0.82rem' }}>{r.type}</td>
                      <td style={{ fontWeight: 600 }}>{r.desc}</td>
                      <td style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>{r.ref || '—'}</td>
                      <td className={r.type === 'הכנסה' ? 'amount-positive' : 'amount-negative'}>
                        {r.type === 'הכנסה' ? '+' : '-'}{formatILS(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {allTxs.length > 0 && (
                  <tfoot>
                    <tr style={{ background: 'var(--gray-50)', fontWeight: 700 }}>
                      <td colSpan={4} style={{ padding: '12px 16px' }}>
                        סה"כ הכנסות: <span className="amount-positive">{formatILS(allTxs.filter(r => r.type === 'הכנסה').reduce((s,r) => s+r.amount, 0))}</span>
                        &nbsp;|&nbsp;
                        סה"כ הוצאות: <span className="amount-negative">{formatILS(allTxs.filter(r => r.type === 'הוצאה').reduce((s,r) => s+r.amount, 0))}</span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
