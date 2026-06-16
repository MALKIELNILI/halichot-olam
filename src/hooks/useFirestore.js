import { useState, useEffect, useCallback } from 'react';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const KEY = (name) => `halichot_olam_${name}`;

function load(name) {
  try { return JSON.parse(localStorage.getItem(KEY(name)) || '[]'); }
  catch { return []; }
}

function save(name, data) {
  localStorage.setItem(KEY(name), JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('ls-update', { detail: name }));
}

function sortData(arr, order) {
  return [...arr].sort((a, b) => {
    const av = a[order] || '', bv = b[order] || '';
    return bv.localeCompare(av);
  });
}

export function useCollection(collName, order = 'createdAt') {
  const [data, setData] = useState(() => sortData(load(collName), order));
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setData(sortData(load(collName), order));
  }, [collName, order]);

  useEffect(() => {
    const handler = (e) => { if (e.detail === collName) refresh(); };
    window.addEventListener('ls-update', handler);
    const storageHandler = (e) => { if (e.key === KEY(collName)) refresh(); };
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('ls-update', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, [collName, refresh]);

  const add = useCallback((item) => {
    const all = load(collName);
    const newItem = { ...item, id: uid(), createdAt: new Date().toISOString() };
    save(collName, [...all, newItem]);
    return Promise.resolve(newItem);
  }, [collName]);

  const update = useCallback((id, item) => {
    const all = load(collName).map(x => x.id === id ? { ...x, ...item } : x);
    save(collName, all);
    return Promise.resolve();
  }, [collName]);

  const remove = useCallback((id) => {
    save(collName, load(collName).filter(x => x.id !== id));
    return Promise.resolve();
  }, [collName]);

  return { data, loading, add, update, remove };
}

export function useDonations() { return useCollection('donations', 'date'); }
export function useDonors()    { return useCollection('donors', 'name'); }
export function useExpenses()  { return useCollection('expenses', 'date'); }
export function useScholars()  { return useCollection('scholars', 'name'); }
