import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import {
  ref, push, set, remove, onValue, get,
  update as fbUpdate
} from 'firebase/database';

const FB_ROOT = 'halichot-olam';
const LS_PREFIX = 'halichot_olam_';

// One-time migration: push localStorage items to Firebase then clear
async function migrateIfNeeded(collName) {
  const lsKey = LS_PREFIX + collName;
  const raw = localStorage.getItem(lsKey);
  if (!raw) return;
  try {
    const items = JSON.parse(raw);
    if (!Array.isArray(items) || items.length === 0) {
      localStorage.removeItem(lsKey);
      return;
    }
    // Don't overwrite if Firebase already has data
    const snap = await get(ref(db, `${FB_ROOT}/${collName}`));
    if (snap.exists()) { localStorage.removeItem(lsKey); return; }

    const updates = {};
    items.forEach(item => {
      const id = item.id || (Date.now().toString(36) + Math.random().toString(36).slice(2));
      updates[`${FB_ROOT}/${collName}/${id}`] = { ...item, id };
    });
    await fbUpdate(ref(db), updates);
    localStorage.removeItem(lsKey);
    console.log(`[migrate] ${items.length} ${collName} → Firebase`);
  } catch (e) {
    console.error('[migrate] error:', e);
  }
}

export function useCollection(collName, order = 'createdAt') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    migrateIfNeeded(collName);

    const colRef = ref(db, `${FB_ROOT}/${collName}`);
    const unsub = onValue(colRef, (snap) => {
      const val = snap.val();
      const items = val
        ? Object.entries(val).map(([id, item]) => ({ ...item, id }))
        : [];
      items.sort((a, b) => {
        const av = a[order] || '';
        const bv = b[order] || '';
        return bv > av ? 1 : bv < av ? -1 : 0;
      });
      setData(items);
      setLoading(false);
    });
    return () => unsub();
  }, [collName, order]);

  const add = useCallback(async (item) => {
    const colRef = ref(db, `${FB_ROOT}/${collName}`);
    const newRef = push(colRef);
    const newItem = { ...item, id: newRef.key, createdAt: new Date().toISOString() };
    await set(newRef, newItem);
    return newItem;
  }, [collName]);

  const update = useCallback(async (id, item) => {
    await set(ref(db, `${FB_ROOT}/${collName}/${id}`), { ...item, id });
  }, [collName]);

  const remove_ = useCallback(async (id) => {
    await remove(ref(db, `${FB_ROOT}/${collName}/${id}`));
  }, [collName]);

  return { data, loading, add, update, remove: remove_ };
}

export function useDonations() { return useCollection('donations', 'date'); }
export function useDonors()    { return useCollection('donors', 'name'); }
export function useExpenses()  { return useCollection('expenses', 'date'); }
export function useScholars()  { return useCollection('scholars', 'name'); }

export function useAccountantPhone() {
  const [phone, setPhone_] = useState('');
  useEffect(() => {
    const r = ref(db, `${FB_ROOT}/meta/accountantPhone`);
    const unsub = onValue(r, snap => setPhone_(snap.val() || ''));
    return () => unsub();
  }, []);
  const setPhone = useCallback(async (val) => {
    await set(ref(db, `${FB_ROOT}/meta/accountantPhone`), val || '');
  }, []);
  return { phone, setPhone };
}

export function useOpeningBalance() {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const lsVal = localStorage.getItem('halichot_olam_opening_balance');
    const metaRef = ref(db, `${FB_ROOT}/meta/openingBalance`);
    if (lsVal) {
      get(metaRef).then(snap => {
        if (!snap.exists()) set(metaRef, parseFloat(lsVal) || 0);
        localStorage.removeItem('halichot_olam_opening_balance');
      });
    }
    const unsub = onValue(metaRef, snap => setValue(snap.val() || 0));
    return () => unsub();
  }, []);

  const setOpeningBalance = useCallback(async (val) => {
    await set(ref(db, `${FB_ROOT}/meta/openingBalance`), parseFloat(val) || 0);
  }, []);

  return { value, setOpeningBalance };
}
