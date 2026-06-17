import React, { useRef, useState } from 'react';
import { useDonors, useOpeningBalance } from '../hooks/useFirestore';

export default function Settings() {
  const fileRef = useRef();
  const [msg, setMsg] = useState('');
  const { data: donors, add: addDonor } = useDonors();
  const { value: ob, setOpeningBalance } = useOpeningBalance();
  const [obInput, setObInput] = useState('');
  const [obMsg, setObMsg] = useState('');

  React.useEffect(() => { setObInput(String(ob || '')); }, [ob]);

  const saveOb = async () => {
    await setOpeningBalance(obInput);
    setObMsg('נשמר ✓');
    setTimeout(() => setObMsg(''), 2000);
  };

  const importDonors = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const incoming = JSON.parse(ev.target.result);
        if (!Array.isArray(incoming)) throw new Error('פורמט שגוי');

        const existingNames = new Set(donors.map(d => d.name?.trim()));
        const newOnes = incoming.filter(d => d.name && !existingNames.has(d.name.trim()));

        for (const donor of newOnes) {
          await addDonor(donor);
        }

        setMsg(`יובאו ${newOnes.length} תורמים חדשים (${incoming.length - newOnes.length} כבר קיימים)`);
      } catch {
        setMsg('שגיאה: קובץ JSON לא תקין');
      }
      e.target.value = '';
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>הגדרות</h1>
          <div className="subtitle">הגדרות מערכת ופרטי עמותה</div>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="card-header"><h2>פרטי העמותה</h2></div>
          <div className="card-body">
            <div className="form-grid" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">שם העמותה</label>
                <input className="form-control" defaultValue="תפארת מישאל" readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">שם כולל</label>
                <input className="form-control" defaultValue="הליכות עולם" readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">כתובת</label>
                <input className="form-control" defaultValue="צונץ 11, תל אביב" readOnly />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 600, marginTop: 20 }}>
          <div className="card-header"><h2>ייבוא תורמים מ-JSON</h2></div>
          <div className="card-body">
            <p style={{ color: 'var(--gray-600)', fontSize: '0.88rem', marginBottom: 16, lineHeight: 1.7 }}>
              בחר קובץ <code>donors_import.json</code> שנוצר מיש חשבונית.
              תורמים שכבר קיימים לפי שם לא יתווספו פעמיים.
            </p>
            <input
              type="file"
              accept=".json"
              ref={fileRef}
              style={{ display: 'none' }}
              onChange={importDonors}
            />
            <button className="btn btn-primary" onClick={() => fileRef.current.click()}>
              בחר קובץ JSON לייבוא
            </button>
            {msg && (
              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: msg.includes('שגיאה') ? 'var(--red-light)' : 'var(--green-light)',
                color: msg.includes('שגיאה') ? 'var(--red)' : 'var(--green)',
                borderRadius: 8, fontSize: '0.88rem', fontWeight: 600
              }}>
                {msg}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ maxWidth: 600, marginTop: 20 }}>
          <div className="card-header"><h2>יתרת פתיחה</h2></div>
          <div className="card-body">
            <p style={{ color: 'var(--gray-600)', fontSize: '0.88rem', marginBottom: 16, lineHeight: 1.7 }}>
              הזן את יתרת החשבון <strong>לפני</strong> שהתחלת לייבא תנועות. כך לוח הבקרה יציג יתרה נכונה שמתאימה לבנק.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                className="form-control"
                type="number"
                value={obInput}
                onChange={e => setObInput(e.target.value)}
                placeholder="סכום בש״ח"
                style={{ maxWidth: 200 }}
              />
              <button className="btn btn-primary" onClick={saveOb}>שמור</button>
              {obMsg && <span style={{ color: 'var(--green)', fontWeight: 700 }}>{obMsg}</span>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
