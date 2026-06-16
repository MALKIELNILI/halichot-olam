import React, { useMemo } from 'react';
import { useDonations, useExpenses, useScholars } from '../hooks/useFirestore';
import { formatILS, sumField, monthKey, heMonthYear } from '../utils/helpers';

export default function Dashboard() {
  const { data: donations } = useDonations();
  const { data: expenses } = useExpenses();
  const { data: scholars } = useScholars();

  const thisMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  const openingBalance = parseFloat(localStorage.getItem('halichot_olam_opening_balance') || '0');
  const totalDonations = useMemo(() => sumField(donations, 'amountILS'), [donations]);
  const totalExpenses  = useMemo(() => sumField(expenses, 'amount'), [expenses]);
  const balance        = openingBalance + totalDonations - totalExpenses;

  const monthDonations = useMemo(() =>
    sumField(donations.filter(d => monthKey(d.date) === thisMonth), 'amountILS'), [donations, thisMonth]);
  const monthExpenses  = useMemo(() =>
    sumField(expenses.filter(e => monthKey(e.date) === thisMonth), 'amount'), [expenses, thisMonth]);

  const activeScholars = scholars.filter(s => s.active !== false).length;

  // Last 6 months summary
  const last6 = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const inc = sumField(donations.filter(x => monthKey(x.date) === key), 'amountILS');
      const exp = sumField(expenses.filter(x => monthKey(x.date) === key), 'amount');
      months.push({ key, inc, exp, net: inc - exp });
    }
    return months;
  }, [donations, expenses]);


  return (
    <>
      <div className="page-header">
        <div>
          <h1>לוח בקרה</h1>
          <div className="subtitle">סיכום מצב העמותה</div>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card highlight">
            <div className="label">יתרה כוללת</div>
            <div className={`value ${balance >= 0 ? 'positive' : 'negative'}`}>{formatILS(balance)}</div>
            <div className="trend">
              {openingBalance !== 0
                ? `פתיחה ${formatILS(openingBalance)} + הכנסות − הוצאות`
                : 'הכנסות פחות הוצאות מסך הכל'}
            </div>
          </div>
          <div className="stat-card">
            <div className="label">תרומות החודש</div>
            <div className="value positive">{formatILS(monthDonations)}</div>
            <div className="trend">{heMonthYear(thisMonth)}</div>
          </div>
          <div className="stat-card">
            <div className="label">הוצאות החודש</div>
            <div className="value negative">{formatILS(monthExpenses)}</div>
            <div className="trend">{heMonthYear(thisMonth)}</div>
          </div>
          <div className="stat-card">
            <div className="label">אברכים פעילים</div>
            <div className="value">{activeScholars}</div>
            <div className="trend">מקבלי מלגה</div>
          </div>
        </div>

        {/* Monthly summary table */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h2>סיכום 6 חודשים אחרונים</h2>
          </div>
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
                {last6.map(row => (
                  <tr key={row.key}>
                    <td style={{ fontWeight: 600 }}>{heMonthYear(row.key)}</td>
                    <td className="amount-positive">{formatILS(row.inc)}</td>
                    <td className="amount-negative">{formatILS(row.exp)}</td>
                    <td className={row.net >= 0 ? 'amount-positive' : 'amount-negative'}>
                      {formatILS(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent activity */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <h2>תרומות ({donations.length})</h2>
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>תורם</th><th>סכום</th><th>תאריך</th><th>אסמכתה</th></tr></thead>
                <tbody>
                  {donations.length === 0 && (
                    <tr><td colSpan={4} className="empty-state"><p>אין תרומות עדיין</p></td></tr>
                  )}
                  {donations.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{d.donorName}</td>
                      <td className="amount-positive">{formatILS(d.amountILS)}</td>
                      <td style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>{d.date}</td>
                      <td style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>{d.bankRef || d.reference || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>הוצאות ({expenses.length})</h2>
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>תיאור</th><th>סכום</th><th>תאריך</th><th>אסמכתה</th></tr></thead>
                <tbody>
                  {expenses.length === 0 && (
                    <tr><td colSpan={4} className="empty-state"><p>אין הוצאות עדיין</p></td></tr>
                  )}
                  {expenses.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.description}</td>
                      <td className="amount-negative">{formatILS(e.amount)}</td>
                      <td style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>{e.date}</td>
                      <td style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>{e.bankRef || e.reference || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
