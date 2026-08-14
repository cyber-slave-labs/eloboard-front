import { useEffect, useState } from 'react';

const BASE = `${import.meta.env.BASE_URL}data/`;
const cache = new Map();

export function getJson(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(BASE + path).then((r) => {
        if (!r.ok) throw new Error(`${path}: ${r.status}`);
        return r.json();
      }),
    );
  }
  return cache.get(path);
}

export const getPlayers = () => getJson('players.json');
export const getSummary = () => getJson('summary.json');
export const getMonth = (ym) => getJson(`months/${ym}.json`);
export const getRecord = (id) => getJson(`records/${id}.json`);
export const getPrizes = () => getJson('prizes.json');

export async function playerIndex() {
  const ps = await getPlayers();
  return {
    all: ps,
    byId: new Map(ps.map((p) => [p.id, p])),
    byName: new Map(ps.map((p) => [p.name, p])),
  };
}

// Tiny async-data hook; deps re-run the fetch.
export function useData(fn, deps) {
  const [state, setState] = useState({ data: null, error: null });
  useEffect(() => {
    let on = true;
    setState({ data: null, error: null });
    fn().then(
      (data) => on && setState({ data, error: null }),
      (error) => on && setState({ data: null, error }),
    );
    return () => { on = false; };
  }, deps);
  return state;
}

export const RACES = {
  P: { label: '프로토스', color: 'var(--color-race-p)' },
  T: { label: '테란', color: 'var(--color-race-t)' },
  Z: { label: '저그', color: 'var(--color-race-z)' },
};

export const pct = (w, l) => (w + l ? Math.round((w / (w + l)) * 1000) / 10 : 0);
export const fmtElo = (v) => (v == null ? '—' : v.toLocaleString('ko-KR', { maximumFractionDigits: 1 }));
