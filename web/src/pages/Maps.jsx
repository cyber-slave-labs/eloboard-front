import { useMemo, useState } from 'react';
import { getSummary, pct, useData, RACES } from '../lib/data.js';
import { Section, SplitBar, Spinner } from '../components/ui.jsx';

const MATCHUPS = [
  ['PvT', 'P', 'T'],
  ['PvZ', 'P', 'Z'],
  ['TvZ', 'T', 'Z'],
];

export default function Maps() {
  const { data: summary } = useData(getSummary, []);
  const [minGames, setMinGames] = useState(30);

  const maps = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.mapStats)
      .filter(([, s]) => s.games >= minGames)
      .sort((a, b) => b[1].games - a[1].games);
  }, [summary, minGames]);

  if (!summary) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink2">맵별 종족전 밸런스 — 승수 기준, 미러전 제외</p>
        <label className="text-xs text-mute flex items-center gap-2">
          최소 경기수
          <select
            value={minGames}
            onChange={(e) => setMinGames(Number(e.target.value))}
            className="num bg-raised border border-hairline rounded-md px-2 py-1 text-xs text-ink2 focus:outline-none"
          >
            {[10, 30, 100, 300].map((n) => <option key={n} value={n}>{n}+</option>)}
          </select>
        </label>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {maps.map(([name, s], i) => (
          <Section key={name} title={name} className="reveal" aside={<span className="num text-xs text-mute">{s.games.toLocaleString()}경기</span>}>
            <div className="p-4 flex flex-col gap-4" style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
              {MATCHUPS.map(([key, ra, rb]) => {
                const mu = s.matchups[key];
                if (!mu || mu[0] + mu[1] < 5) return null;
                const [aw, bw] = mu;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-[11px] text-mute mb-1">
                      <span style={{ color: RACES[ra].color }}>{ra} {pct(aw, bw)}%</span>
                      <span className="num">{aw + bw}전</span>
                      <span style={{ color: RACES[rb].color }}>{rb} {pct(bw, aw)}%</span>
                    </div>
                    <SplitBar a={aw} b={bw} colorA={RACES[ra].color} colorB={RACES[rb].color} labelA={aw} labelB={bw} />
                  </div>
                );
              })}
            </div>
          </Section>
        ))}
      </div>
    </div>
  );
}
