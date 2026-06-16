import React from 'react';

export default function Settings() {
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
            <div style={{ marginTop: 16, padding: 14, background: 'var(--blue-light)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--navy)' }}>
              לעדכון פרטי העמותה יש לפנות למפתח המערכת.
            </div>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 600, marginTop: 20 }}>
          <div className="card-header"><h2>חיבור Firebase</h2></div>
          <div className="card-body">
            <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              המערכת מחוברת ל-Firebase לסנכרון נתונים בזמן אמת בין מחשב וטלפון.
              לעדכון פרטי החיבור יש לערוך את קובץ <code>src/firebase/config.js</code>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
