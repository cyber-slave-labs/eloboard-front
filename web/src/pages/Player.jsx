import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRecord, getSummary, playerIndex, pct, fmtElo, useData, RACES } from '../lib/data.js';
import { PlayerLink, RaceTag, ResultPill, Section, Spinner, WinBar } from '../components/ui.jsx';
import LineChart from '../components/LineChart.jsx';

function Stat({ label, value, sub }) {
  return (
    <div>
      <div className="text-xs text-mute font-medium mb-1">{label}</div>
      <div className="num text-2xl font-bold leading-none">{value}</div>
      {sub && <div className="text-[11px] text-ink2 mt-1">{sub}</div>}
    </div>
  );
}

export default function Player() {
  const { id } = useParams();
  const { data: rec, error } = useData(() => getRecord(id), [id]);
  const { data: idx } = useData(playerIndex, []);
  const { data: summary } = useData(getSummary, []);
  const [shown, setShown] = useState(30);
  const [filter, setFilter] = useState('');

  const d = useMemo(() => {
    if (!rec) return null;
    const women = [...rec.women].reverse(); // newest first
    const w = rec.women.filter((m) => m.win).length;
    const l = rec.women.length - w;
    const byRace = { Z: [0, 0], P: [0, 0], T: [0, 0] };
    const byOpp = new Map();
    const byMap = new Map();
    for (const m of rec.women) {
      if (byRace[m.oppRace]) byRace[m.oppRace][m.win ? 0 : 1]++;
      const o = byOpp.get(m.opp) ?? [0, 0];
      o[m.win ? 0 : 1]++; byOpp.set(m.opp, o);
      if (m.map) {
        const mp = byMap.get(m.map) ?? [0, 0];
        mp[m.win ? 0 : 1]++; byMap.set(m.map, mp);
      }
    }
    const top = (map) => [...map.entries()].sort((a, b) => b[1][0] + b[1][1] - a[1][0] - a[1][1]).slice(0, 8);
    return { women, w, l, byRace, topOpp: top(byOpp), topMap: top(byMap) };
  }, [rec]);

  if (error) return <div className="p-10 text-center text-mute">전적 데이터가 없는 선수입니다.</div>;
  if (!rec || !d) return <Spinner />;

  const race = RACES[rec.race] ?? { label: '?', color: 'var(--color-mute)' };
  const last = rec.trend?.at(-1);
  const money = summary?.totals?.[rec.id]?.money;
  const filtered = filter
    ? d.women.filter((m) => m.opp.includes(filter) || (m.map ?? '').includes(filter))
    : d.women;

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-6 sm:p-7 reveal">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div className="min-w-40">
            <div className="flex items-center gap-2 mb-1.5">
              <RaceTag race={rec.race} size="lg" />
              <span className="text-xs text-ink2">{race.label}</span>
              {rec.channel && (
                <a href={rec.channel} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-ink2 bg-raised rounded-md px-1.5 py-0.5 hover:text-accent-dark transition-colors">
                  SOOP ↗
                </a>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{rec.name}</h1>
          </div>
          <Stat label="ELO" value={fmtElo(last?.[1])} sub={last ? `${last[0].replace('-', '.')} 기준 · ${last[4]}위` : null} />
          <Stat label="통산" value={`${d.w}–${d.l}`} sub={`${d.w + d.l}전 · 승률 ${pct(d.w, d.l)}%`} />
          {money > 0 && <Stat label="상금" value={`₩${money.toLocaleString('ko-KR')}`} />}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <Section title="ELO 추이 (월별)">
          <div className="p-3">
            <LineChart
              color={race.color}
              data={(rec.trend ?? []).map(([ym, elo, w, l]) => ({ x: ym, y: Math.round(elo), sub: `${w}승 ${l}패` }))}
            />
          </div>
        </Section>

        <Section title="종족전 승률">
          <div className="p-4 flex flex-col gap-3.5">
            {['Z', 'T', 'P'].map((r) => {
              const [w, l] = d.byRace[r];
              return (
                <div key={r} className="flex items-center gap-3">
                  <RaceTag race={r} />
                  <span className="text-xs text-ink2 w-14">{RACES[r].label}</span>
                  <span className="num text-sm w-16 text-right">{w}–{l}</span>
                  <WinBar w={w} l={l} color={RACES[r].color} className="flex-1" />
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="최다 매치 상대">
          <ul className="divide-y divide-hairline">
            {d.topOpp.map(([name, [w, l]]) => {
              const p = idx?.byName.get(name);
              return (
                <li key={name} className="px-4 py-2 flex items-center gap-3">
                  <span className="flex-1 min-w-0 truncate">
                    {p ? <PlayerLink id={p.id} name={name} race={p.race} /> : name}
                  </span>
                  <span className="num text-sm w-16 text-right">{w}–{l}</span>
                  <WinBar w={w} l={l} color={race.color} className="w-32" />
                  {p && (
                    <Link to={`/vs?a=${rec.id}&b=${p.id}`} className="text-[11px] font-semibold text-ink2 hover:text-accent-dark bg-raised rounded-md px-2 py-1 shrink-0">
                      상세
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title="맵별 성적">
          <ul className="divide-y divide-hairline">
            {d.topMap.map(([map, [w, l]]) => (
              <li key={map} className="px-4 py-2 flex items-center gap-3">
                <span className="flex-1 truncate text-sm">{map}</span>
                <span className="num text-sm w-16 text-right">{w}–{l}</span>
                <WinBar w={w} l={l} color={race.color} className="w-32" />
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section
        title={`경기 기록 — ${filtered.length}전`}
        aside={
          <input
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setShown(30); }}
            placeholder="상대·맵 필터"
            className="bg-raised rounded-lg px-2.5 py-1.5 text-xs w-32 placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        }
      >
        <table className="w-full text-sm">
          <tbody className="divide-y divide-hairline">
            {filtered.slice(0, shown).map((m) => {
              const p = idx?.byName.get(m.opp);
              return (
                <tr key={m.id ?? `${m.date}${m.opp}${m.delta}`} className="hover:bg-raised/60 transition-colors">
                  <td className="num px-4 py-2 text-xs text-mute w-24">{m.date}</td>
                  <td className="py-2 w-10"><ResultPill win={m.win} /></td>
                  <td className="py-2">{p ? <PlayerLink id={p.id} name={m.opp} race={m.oppRace} /> : <span className="inline-flex items-center gap-1.5"><RaceTag race={m.oppRace} />{m.opp}</span>}</td>
                  <td className="py-2 text-ink2 text-xs hidden sm:table-cell">{m.map}</td>
                  <td className="num py-2 text-right text-xs" style={{ color: m.win ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {m.delta > 0 ? '+' : ''}{m.delta}
                  </td>
                  <td className="px-4 py-2 text-right text-[10px] text-mute w-20 hidden sm:table-cell">{m.series}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown < filtered.length && (
          <button
            type="button"
            onClick={() => setShown((s) => s + 60)}
            className="w-full py-3 text-xs font-semibold text-ink2 hover:text-accent-dark hover:bg-raised/50 transition-colors border-t border-hairline"
          >
            더 보기 ({filtered.length - shown}건 남음)
          </button>
        )}
      </Section>
    </div>
  );
}
