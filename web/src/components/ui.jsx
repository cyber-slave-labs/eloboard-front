import { Link } from 'react-router-dom';
import { RACES, pct } from '../lib/data.js';

export function RaceTag({ race, size = 'sm' }) {
  const r = RACES[race];
  if (!r) return <span className="text-mute text-xs">?</span>;
  const cls = size === 'sm' ? 'w-4.5 h-4.5 text-[11px]' : 'w-6 h-6 text-sm';
  return (
    <span
      className={`num inline-flex items-center justify-center rounded-[3px] font-bold shrink-0 ${cls}`}
      style={{ color: r.color, background: `color-mix(in srgb, ${r.color} 16%, transparent)`, border: `1px solid color-mix(in srgb, ${r.color} 45%, transparent)` }}
      title={r.label}
    >
      {race}
    </span>
  );
}

export function PlayerLink({ id, name, race, className = '' }) {
  return (
    <Link to={`/p/${id}`} className={`inline-flex items-center gap-1.5 hover:text-goldhi transition-colors ${className}`}>
      {race ? <RaceTag race={race} /> : null}
      <span className="font-medium">{name}</span>
    </Link>
  );
}

// Thin win-rate bar: entity-colored fill on a hairline track, label outside.
export function WinBar({ w, l, color = 'var(--color-gold)', className = '' }) {
  const p = pct(w, l);
  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      <div className="h-1 rounded-full bg-hairline flex-1 overflow-hidden">
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
      className="num inline-flex w-6 h-6 items-center justify-center rounded-[3px] text-xs font-bold"
      style={{
        color: win ? 'var(--color-win)' : 'var(--color-loss)',
        background: `color-mix(in srgb, ${win ? 'var(--color-win)' : 'var(--color-loss)'} 14%, transparent)`,
      }}
    >
      {win ? '승' : '패'}
    </span>
  );
}

export function Section({ title, aside, children, className = '' }) {
  return (
    <section className={`bg-surface border border-hairline rounded-lg ${className}`}>
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-hairline">
        <h2 className="num text-[13px] font-semibold tracking-[0.14em] text-ink2 uppercase">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Spinner() {
  return <div className="p-10 text-center text-mute text-sm animate-pulse">불러오는 중…</div>;
}
