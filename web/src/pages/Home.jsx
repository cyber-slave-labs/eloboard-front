import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getMonth, getSummary, playerIndex, pct, fmtElo, useData, RACES } from '../lib/data.js';
import { PlayerLink, RecentFeed, Section, SplitBar, Spinner, WinBar } from '../components/ui.jsx';
import BarChart from '../components/BarChart.jsx';

const MIN_WINRATE_GAMES = 20;

function Tile({ label, value, sub }) {
  return (
    <div className="card px-5 py-4 reveal">
      <div className="text-xs text-mute font-medium mb-1">{label}</div>
      <div className="num text-[22px] font-extrabold leading-tight truncate">{value}</div>
      {sub && <div className="text-xs text-ink2 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function RankList({ rows, right }) {
  return (
    <ol className="divide-y divide-hairline">
      {rows.map((r, i) => (
        <li key={r.name} className="px-5 py-2 flex items-center gap-3">
          <span className={`num text-sm font-bold w-5 text-center ${i < 3 ? 'text-accent' : 'text-mute'}`}>{i + 1}</span>
          <span className="flex-1 min-w-0 truncate">
            {r.p ? <PlayerLink id={r.p.id} name={r.name} race={r.race} /> : r.name}
          </span>
          {right(r)}
        </li>
      ))}
    </ol>
  );
}

export default function Home() {
  const { data: summary } = useData(getSummary, []);
  const { data: idx } = useData(playerIndex, []);
  const months = summary?.months ?? [];
  const ym = months.at(-1);
  const prevYm = months.at(-2);
  const { data: month } = useData(() => (ym ? getMonth(ym) : Promise.resolve(null)), [ym]);
  const { data: prev } = useData(() => (prevYm ? getMonth(prevYm) : Promise.resolve(null)), [prevYm]);

  const d = useMemo(() => {
    if (!month || !idx) return null;
    const rows = month.rows.map((r) => ({ ...r, games: r.w + r.l, p: idx.byName.get(r.name) }));
    const totalGames = rows.reduce((s, r) => s + r.w, 0);
    const byGames = [...rows].sort((a, b) => b.games - a.games);
    const byWinrate = rows
      .filter((r) => r.games >= MIN_WINRATE_GAMES)
      .sort((a, b) => pct(b.w, b.l) - pct(a.w, a.l) || b.games - a.games)
      .slice(0, 10);
    const prevElo = new Map((prev?.rows ?? []).map((r) => [r.name, r.elo]));
    const surge = rows
      .filter((r) => prevElo.has(r.name))
      .map((r) => ({ ...r, delta: Math.round((r.elo - prevElo.get(r.name)) * 10) / 10 }))
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 5);
    // One side of each matchup carries the pair once: P rows' vsT = all PvT.
    const mu = (race, key) => rows.filter((r) => r.race === race)
      .reduce((s, r) => [s[0] + r[key][0], s[1] + r[key][1]], [0, 0]);
    const matchups = [
      { label: 'PvT', a: 'P', b: 'T', wl: mu('P', 'vsT') },
      { label: 'PvZ', a: 'P', b: 'Z', wl: mu('P', 'vsZ') },
      { label: 'TvZ', a: 'T', b: 'Z', wl: mu('T', 'vsZ') },
    ];
    return { rows, totalGames, byGames, byWinrate, surge, matchups, top: rows.find((r) => r.rank === 1) };
  }, [month, prev, idx]);

  if (!summary || !idx || !d) return <Spinner />;

  const most = d.byGames[0];

  return (
    <div className="grid lg:grid-cols-[1fr_330px] gap-6 items-start">
      <div className="flex flex-col gap-6 min-w-0">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Tile label={`${ym?.slice(5)}월 경기 수`} value={d.totalGames.toLocaleString()} sub={`활동 ${d.rows.length}명`} />
          <Tile label="ELO 1위" value={d.top?.name ?? '—'} sub={fmtElo(d.top?.elo)} />
          <Tile label="최다 판수" value={most?.name ?? '—'} sub={`${most?.games}판 (${most?.w}승 ${most?.l}패)`} />
          <Tile label="이달의 급상승" value={d.surge[0]?.name ?? '—'} sub={d.surge[0] ? `ELO +${d.surge[0].delta}` : null} />
        </div>

        <div className="grid sm:grid-cols-2 gap-6 items-start">
          <Section title="월간 판수 TOP 10" aside={<MonthChip ym={ym} />}>
            <RankList
              rows={d.byGames.slice(0, 10)}
              right={(r) => (
                <>
                  <span className="num text-sm font-bold w-14 text-right">{r.games}판</span>
                  <span className="num text-xs text-mute w-16 text-right">{r.w}–{r.l}</span>
                </>
              )}
            />
          </Section>

          <Section title="월간 승률 TOP 10" aside={<span className="text-[11px] text-mute">{MIN_WINRATE_GAMES}판 이상</span>}>
            <RankList
              rows={d.byWinrate}
              right={(r) => (
                <>
                  <span className="num text-xs text-mute w-14 text-right">{r.w}–{r.l}</span>
                  <WinBar w={r.w} l={r.l} color={RACES[r.race]?.color} className="w-28" />
                </>
              )}
            />
          </Section>

          <Section title="이달의 급상승 TOP 5" aside={<span className="text-[11px] text-mute">전월 ELO 대비</span>}>
            <RankList
              rows={d.surge}
              right={(r) => (
                <>
                  <span className="num text-sm font-bold w-16 text-right" style={{ color: r.delta >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {r.delta >= 0 ? '▲' : '▼'} {Math.abs(r.delta)}
                  </span>
                  <span className="num text-xs text-mute w-14 text-right">{fmtElo(r.elo)}</span>
                </>
              )}
            />
          </Section>

          <Section title="이번 달 종족전 밸런스">
            <div className="px-5 py-4 flex flex-col gap-5">
              {d.matchups.map((m) => {
                const [aw, bw] = m.wl;
                return (
                  <div key={m.label}>
                    <div className="flex justify-between text-[11px] text-mute mb-1">
                      <span style={{ color: RACES[m.a].color }}>{m.a} {pct(aw, bw)}%</span>
                      <span className="num">{aw + bw}전</span>
                      <span style={{ color: RACES[m.b].color }}>{m.b} {pct(bw, aw)}%</span>
                    </div>
                    <SplitBar a={aw} b={bw} colorA={RACES[m.a].color} colorB={RACES[m.b].color} labelA={aw} labelB={bw} />
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        <Section title="일별 경기 수" aside={<span className="text-[11px] text-mute">최근 30일</span>}>
          <div className="p-3">
            <BarChart data={(summary.daily ?? []).map(([x, y]) => ({ x, y }))} />
          </div>
        </Section>
      </div>

      <div className="flex flex-col gap-4">
        <Section title="최근 경기">
          <RecentFeed recent={summary.recent} byName={idx.byName} />
        </Section>
        <Link to="/rankings" className="card px-5 py-3.5 text-sm font-semibold text-accent-dark text-center hover:bg-accent-soft transition-colors">
          전체 월간 랭킹 보기
        </Link>
        <div className="text-[11px] text-mute px-1">
          총 {Object.keys(summary.totals).length}명 · 경기 데이터 기준 {new Date(summary.generated).toLocaleDateString('ko-KR')}
        </div>
      </div>
    </div>
  );
}

function MonthChip({ ym }) {
  return <span className="num text-[11px] text-mute">{ym?.replace('-', '.')}</span>;
}
