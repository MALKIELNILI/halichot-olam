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

  // ── Accountant report ──
  const printAccountantReport = () => {
    const filtDon = donations.filter(d => !month || monthKey(d.date) === month);
    const filtExp = expenses.filter(e => !month || monthKey(e.date) === month);
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

    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>דוח כספי – תפארת מישאל</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700&display=swap');
          body { font-family: 'Heebo', sans-serif; direction: rtl; padding: 40px; color: #1a2744; font-size: 13px; }
          .header { border-bottom: 3px solid #b8973a; padding-bottom: 16px; margin-bottom: 24px; }
          .org-name { font-size: 22px; font-weight: 700; color: #1a2744; }
          .org-sub { font-size: 14px; color: #6b6762; }
          .report-title { font-size: 16px; font-weight: 700; margin: 16px 0 4px; }
          .period { color: #6b6762; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1a2744; color: white; padding: 9px 12px; text-align: right; font-size: 11px; }
          td { padding: 8px 12px; border-bottom: 1px solid #e2e0dc; }
          tr:nth-child(even) { background: #f8f5ef; }
          .income { color: #2a6b4a; font-weight: 600; }
          .expense { color: #8b2020; font-weight: 600; }
          .summary { margin-top: 24px; border: 1px solid #e2e0dc; border-radius: 8px; padding: 16px; }
          .summary-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0ee; }
          .summary-row:last-child { border-bottom: none; font-weight: 700; font-size: 15px; }
          .footer { margin-top: 32px; font-size: 11px; color: #9e9b95; border-top: 1px solid #e2e0dc; padding-top: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="org-name">תפארת מישאל – הליכות עולם</div>
          <div class="org-sub">צונץ 11, תל אביב</div>
          <div class="report-title">דוח כספי</div>
          <div class="period">תקופה: ${periodLabel} | הופק: ${new Date().toLocaleDateString('he-IL')}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>תאריך</th>
              <th>סוג</th>
              <th>קטגוריה</th>
              <th>תיאור</th>
              <th>אסמכתא</th>
              <th>סכום (₪)</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${r.date}</td>
                <td class="${r.type === 'הכנסה' ? 'income' : 'expense'}">${r.type}</td>
                <td>${r.category}</td>
                <td>${r.desc}</td>
                <td>${r.ref}</td>
                <td class="${r.type === 'הכנסה' ? 'income' : 'expense'}">${r.amount}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>סך הכנסות</span>
            <span class="income">+ ${totalDon.toLocaleString('he-IL')} ₪</span>
          </div>
          <div class="summary-row">
            <span>סך הוצאות</span>
            <span class="expense">- ${totalExp.toLocaleString('he-IL')} ₪</span>
          </div>
          <div class="summary-row">
            <span>מאזן תקופה</span>
            <span class="${totalDon - totalExp >= 0 ? 'income' : 'expense'}">${(totalDon - totalExp).toLocaleString('he-IL')} ₪</span>
          </div>
        </div>

        <div class="footer">
          דוח זה הופק ממערכת ניהול עמותה "הליכות עולם" · ${new Date().toLocaleDateString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        </div>

        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
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
