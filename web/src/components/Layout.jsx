import { useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { playerIndex, useData } from '../lib/data.js';
import { RaceTag } from './ui.jsx';

function Search() {
  const { data: idx } = useData(playerIndex, []);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const nav = useNavigate();
  const boxRef = useRef(null);

  const hits = useMemo(() => {
    if (!idx || !q.trim()) return [];
    const t = q.trim().toLowerCase();
    return idx.all.filter((p) => p.name.toLowerCase().includes(t)).slice(0, 8);
  }, [idx, q]);

  const go = (p) => {
    setQ(''); setOpen(false);
    nav(`/p/${p.id}`);
  };

  return (
    <div className="relative" ref={boxRef}>
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setSel(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
          if (e.key === 'Enter' && hits[sel]) go(hits[sel]);
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="선수 검색"
        className="w-36 sm:w-48 bg-raised border border-hairline rounded-md px-3 py-1.5 text-sm placeholder:text-mute focus:outline-none focus:border-gold/60 transition-colors"
      />
      {open && hits.length > 0 && (
        <ul className="absolute right-0 top-full mt-1.5 w-56 bg-raised border border-hairline rounded-md overflow-hidden shadow-xl shadow-black/40 z-50">
          {hits.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); go(p); }}
                onMouseEnter={() => setSel(i)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${i === sel ? 'bg-gold/10 text-goldhi' : ''}`}
              >
                <RaceTag race={p.race} />
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const tabs = [
  { to: '/', label: '랭킹' },
  { to: '/vs', label: '상대전적' },
  { to: '/maps', label: '맵' },
];

export default function Layout() {
  return (
    <div className="max-w-6xl mx-auto px-4 pb-20">
      <header className="flex items-center gap-5 sm:gap-8 py-5 mb-6 border-b border-hairline">
        <Link to="/" className="flex items-baseline gap-2 shrink-0">
          <span className="num text-2xl font-bold tracking-tight text-goldhi">ELO<span className="text-mute">/</span>W</span>
          <span className="hidden sm:inline text-[11px] text-mute tracking-[0.2em] uppercase">StarCraft Women's Ladder</span>
        </Link>
        <nav className="flex items-center gap-1 flex-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `num px-3 py-1.5 rounded-md text-sm font-semibold tracking-wide transition-colors ${
                  isActive ? 'text-goldhi bg-gold/10' : 'text-ink2 hover:text-ink'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <Search />
      </header>
      <Outlet />
      <footer className="mt-16 pt-4 border-t border-hairline text-xs text-mute leading-relaxed">
        데이터 출처: <a href="https://eloboard.com/women" target="_blank" rel="noreferrer" className="underline hover:text-ink2">eloboard.com/women</a> — 비공식 읽기 전용 뷰어입니다. 전적 등록·수정은 원본 사이트에서 해주세요.
      </footer>
    </div>
  );
}
