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
        className="w-36 sm:w-52 bg-surface rounded-xl px-3.5 py-2 text-sm shadow-[0_1px_3px_rgba(25,31,40,0.06)] placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-accent/30 transition-shadow"
      />
      {open && hits.length > 0 && (
        <ul className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-xl overflow-hidden shadow-[0_8px_24px_rgba(25,31,40,0.12)] z-50">
          {hits.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); go(p); }}
                onMouseEnter={() => setSel(i)}
                className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-left ${i === sel ? 'bg-accent-soft text-accent-dark' : ''}`}
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
      <header className="flex items-center gap-4 sm:gap-8 py-5 mb-4">
        <Link to="/" className="flex items-baseline gap-2.5 shrink-0">
          <span className="text-[22px] font-extrabold tracking-tight text-ink">ELO<span className="text-accent">/W</span></span>
          <span className="hidden sm:inline text-xs text-mute font-medium">스타크래프트 여성부 전적</span>
        </Link>
        <nav className="flex items-center gap-1 flex-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  isActive ? 'text-accent-dark bg-accent-soft' : 'text-ink2 hover:bg-surface'
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
      <footer className="mt-16 pt-4 text-xs text-mute leading-relaxed">
        데이터 출처: <a href="https://eloboard.com/women" target="_blank" rel="noreferrer" className="underline hover:text-ink2">eloboard.com/women</a> — 비공식 읽기 전용 뷰어입니다. 전적 등록·수정은 원본 사이트에서 해주세요.
      </footer>
    </div>
  );
}
