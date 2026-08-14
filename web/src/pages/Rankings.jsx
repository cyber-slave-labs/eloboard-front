import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMonth, getSummary, playerIndex, pct, fmtElo, useData, RACES } from '../lib/data.js';
import { PlayerLink, RaceTag, Section, Spinner, WinBar } from '../components/ui.jsx';

function RankDelta({ cur, prev }) {
  if (!prev) return <span className="text-mute text-[10px]">NEW</span>;
  const d = prev - cur;
  if (!d) return <span className="text-mute text-xs">–</span>;
  return (
    <span className="num text-xs" style={{ color: d > 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
      {d > 0 ? '▲' : '▼'}{Math.abs(d)}
    </span>
  );
}

export default function Rankings() {
  const { data: summary } = useData(getSummary, []);
  const { data: idx } = useData(playerIndex, []);
  const months = summary?.months ?? [];
  const [sel, setSel] = useState(null);
  const ym = sel ?? months.at(-1);
  const prevYm = months[months.indexOf(ym) - 1];

  const { data: month } = useData(() => (ym ? getMonth(ym) : Promise.resolve(null)), [ym]);
  const { data: prev } = useData(() => (prevYm ? getMonth(prevYm) : Promise.resolve(null)), [prevYm]);
  const prevRank = useMemo(() => new Map((prev?.rows ?? []).map((r) => [r.name, r.rank])), [prev]);

  if (!summary || !idx) return <Spinner />;

  return (
    <div className="max-w-4xl mx-auto">
      <Section
        title={`월간 랭킹 — ${ym?.replace('-', '.')}`}
        aside={
          <select
            value={ym ?? ''}
            onChange={(e) => setSel(e.target.value)}
            className="num bg-raised rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink2 focus:outline-none cursor-pointer"
          >
            {[...months].reverse().map((m) => <option key={m} value={m}>{m.replace('-', '.')}</option>)}
          </select>
        }
      >
        {!month ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-mute text-xs font-medium">
                  <th className="px-4 py-2 text-left w-16">순위</th>
                  <th className="py-2 text-left">선수</th>
                  <th className="py-2 text-right hidden md:table-cell">vs Z</th>
                  <th className="py-2 text-right hidden md:table-cell">vs P</th>
                  <th className="py-2 text-right hidden md:table-cell">vs T</th>
                  <th className="py-2 text-right">전적</th>
                  <th className="py-2 pl-4 text-left w-36 hidden sm:table-cell">승률</th>
                  <th className="px-4 py-2 text-right">ELO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {month.rows.map((r, i) => {
                  const p = idx.byName.get(r.name);
                  return (
                    <tr key={r.name} className="hover:bg-raised/60 transition-colors reveal" style={{ animationDelay: `${Math.min(i * 15, 450)}ms` }}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`num text-base font-bold w-7 ${r.rank <= 3 ? 'text-accent' : 'text-ink2'}`}>{r.rank}</span>
                          <RankDelta cur={r.rank} prev={prevRank.get(r.name)} />
                        </div>
                      </td>
                      <td className="py-2">
                        {p ? <PlayerLink id={p.id} name={r.name} race={r.race} /> : <span className="inline-flex items-center gap-1.5"><RaceTag race={r.race} />{r.name}</span>}
                      </td>
                      <td className="num py-2 text-right text-ink2 hidden md:table-cell">{r.vsZ[0]}–{r.vsZ[1]}</td>
                      <td className="num py-2 text-right text-ink2 hidden md:table-cell">{r.vsP[0]}–{r.vsP[1]}</td>
                      <td className="num py-2 text-right text-ink2 hidden md:table-cell">{r.vsT[0]}–{r.vsT[1]}</td>
                      <td className="num py-2 text-right">{r.w}<span className="text-mute">승</span> {r.l}<span className="text-mute">패</span></td>
                      <td className="py-2 pl-4 hidden sm:table-cell">
                        <WinBar w={r.w} l={r.l} color={RACES[r.race]?.color} />
                      </td>
                      <td className="num px-4 py-2 text-right font-semibold text-base">{fmtElo(r.elo)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
