import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';

const SEEDED_KEY = 'halichot_olam_seeded_v2';

async function seedCollection(name, file) {
  const key = `halichot_olam_${name}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  if (existing.length > 0) return;
  try {
    const res = await fetch(import.meta.env.BASE_URL + file);
    const data = await res.json();
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('ls-update', { detail: name }));
  } catch {}
}

async function seedAll() {
  if (localStorage.getItem(SEEDED_KEY)) return;
  await seedCollection('donors', 'donors_import.json');
  await seedCollection('scholars', 'scholars_import.json');
  localStorage.setItem(SEEDED_KEY, '1');
}
import Dashboard from './pages/Dashboard';
import Donations from './pages/Donations';
import Expenses from './pages/Expenses';
import Scholars from './pages/Scholars';
import Donors from './pages/Donors';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import BankImport from './pages/BankImport';

const NAV = [
  { section: 'ראשי' },
  { to: '/', icon: '📊', label: 'לוח בקרה' },
  { section: 'הכנסות' },
  { to: '/donations', icon: '💰', label: 'תרומות' },
  { to: '/donors', icon: '👥', label: 'תורמים' },
  { section: 'הוצאות' },
  { to: '/expenses', icon: '📤', label: 'הוצאות' },
  { to: '/scholars', icon: '📚', label: 'אברכים' },
  { section: 'דוחות' },
  { to: '/reports', icon: '📋', label: 'דוחות' },
  { section: 'מערכת' },
  { to: '/import', icon: '🏦', label: 'ייבוא מבנק' },
  { to: '/settings', icon: '⚙️', label: 'הגדרות' },
];

function Sidebar({ mobileOpen, onClose }) {
  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div className="org-name">תפארת מישאל</div>
          <div className="org-sub">הליכות עולם</div>
          <div className="org-addr">צונץ 11, תל אביב</div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item, i) =>
            item.section ? (
              <div key={i} className="nav-section-label">{item.section}</div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
                onClick={onClose}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          )}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
          גרסה 1.0 · {new Date().getFullYear()}
        </div>
      </aside>
    </>
  );
}

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { seedAll(); }, []);

  return (
    <HashRouter>
      <div className="app-shell">
        <header className="mobile-header">
          <span style={{ width: 40 }} />
          <span className="mobile-title">תפארת מישאל</span>
          <button className="hamburger" onClick={() => setMobileOpen(true)} aria-label="תפריט">☰</button>
        </header>
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/donations" element={<Donations />} />
            <Route path="/donors" element={<Donors />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/scholars" element={<Scholars />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/import" element={<BankImport />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
