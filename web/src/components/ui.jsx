import { Link } from 'react-router-dom';
import { RACES, pct } from '../lib/data.js';

export function RaceTag({ race, size = 'sm' }) {
  const r = RACES[race];
  if (!r) return <span className="text-mute text-xs">?</span>;
  const cls = size === 'sm' ? 'w-5 h-5 text-[11px] rounded-md' : 'w-6.5 h-6.5 text-sm rounded-lg';
  return (
    <span
      className={`num inline-flex items-center justify-center font-bold shrink-0 ${cls}`}
      style={{ color: r.color, background: `color-mix(in srgb, ${r.color} 10%, transparent)` }}
      title={r.label}
    >
      {race}
    </span>
  );
}

export function PlayerLink({ id, name, race, className = '' }) {
  return (
    <Link to={`/p/${id}`} className={`inline-flex items-center gap-1.5 hover:text-accent-dark transition-colors ${className}`}>
      {race ? <RaceTag race={race} /> : null}
      <span className="font-medium">{name}</span>
    </Link>
  );
}

// Thin win-rate bar: entity-colored fill on a hairline track, label outside.
export function WinBar({ w, l, color = 'var(--color-accent)', className = '' }) {
  const p = pct(w, l);
  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      <div className="h-1.5 rounded-full bg-raised flex-1 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${p}%`, background: color }} />
      </div>
      <span className="num text-xs text-ink2 w-10 text-right shrink-0">{p}%</span>
    </div>
  );
}

// Two-sided split bar (H2H, matchups) with a 2px surface gap between fills.
export function SplitBar({ a, b, colorA, colorB, labelA, labelB }) {
  const total = a + b;
  const pa = total ? (a / total) * 100 : 50;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="num text-sm" style={{ color: colorA }}>{labelA ?? a}</span>
        <span className="num text-sm" style={{ color: colorB }}>{labelB ?? b}</span>
      </div>
      <div className="flex h-1.5 gap-[2px]">
        <div className="rounded-l-full" style={{ width: `${pa}%`, background: colorA }} />
        <div className="rounded-r-full flex-1" style={{ background: colorB }} />
      </div>
    </div>
  );
}

export function ResultPill({ win }) {
  return (
    <span
      className="num inline-flex w-6 h-6 items-center justify-center rounded-md text-xs font-bold"
      style={{
        color: win ? 'var(--color-win)' : 'var(--color-loss)',
        background: `color-mix(in srgb, ${win ? 'var(--color-win)' : 'var(--color-loss)'} 9%, transparent)`,
      }}
    >
      {win ? '승' : '패'}
    </span>
  );
}

export function Section({ title, aside, children, className = '' }) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      <header className="flex items-center justify-between px-5 pt-4 pb-2.5">
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Spinner() {
  return <div className="p-10 text-center text-mute text-sm animate-pulse">불러오는 중…</div>;
}
