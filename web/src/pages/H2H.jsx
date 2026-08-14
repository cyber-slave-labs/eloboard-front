import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getRecord, playerIndex, pct, useData, RACES } from '../lib/data.js';
import { RaceTag, ResultPill, Section, SplitBar, Spinner } from '../components/ui.jsx';

function Picker({ idx, value, onChange, placeholder }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="bg-raised border border-hairline rounded-md px-3 py-2 text-sm flex-1 focus:outline-none focus:border-gold/60"
    >
      <option value="">{placeholder}</option>
      {idx.all.map((p) => (
        <option key={p.id} value={p.id}>{p.name} ({p.race})</option>
      ))}
    </select>
  );
}

export default function H2H() {
  const { data: idx } = useData(playerIndex, []);
  const [params, setParams] = useSearchParams();
  const aId = params.get('a'), bId = params.get('b');
  const a = idx?.byId.get(aId), b = idx?.byId.get(bId);

  const { data: recA } = useData(() => (aId ? getRecord(aId) : Promise.resolve(null)), [aId]);

  const h2h = useMemo(() => {
    if (!recA || !b) return null;
    const ms = recA.women.filter((m) => m.opp === b.name).reverse();
    const w = ms.filter((m) => m.win).length;
    const byMap = new Map();
    for (const m of ms) {
      if (!m.map) continue;
      const e = byMap.get(m.map) ?? [0, 0];
      e[m.win ? 0 : 1]++; byMap.set(m.map, e);
    }
    return { ms, w, l: ms.length - w, byMap: [...byMap.entries()].sort((x, y) => y[1][0] + y[1][1] - (x[1][0] + x[1][1])) };
  }, [recA, b]);

  if (!idx) return <Spinner />;

  const set = (k) => (v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const colorA = a ? RACES[a.race]?.color : 'var(--color-mute)';
  const colorB = b ? RACES[b.race]?.color : 'var(--color-mute)';

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Picker idx={idx} value={aId} onChange={set('a')} placeholder="선수 1 선택" />
        <span className="num text-mute font-bold text-sm shrink-0">VS</span>
        <Picker idx={idx} value={bId} onChange={set('b')} placeholder="선수 2 선택" />
      </div>

      {a && b && h2h && (
        h2h.ms.length === 0 ? (
          <div className="p-10 text-center text-mute text-sm bg-surface border border-hairline rounded-lg">두 선수의 맞대결 기록이 없습니다.</div>
        ) : (
          <>
            <div className="clip-tab bg-surface border border-hairline rounded-lg p-6 reveal">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <RaceTag race={a.race} size="lg" />
                  <span className="text-xl font-bold">{a.name}</span>
                </div>
                <div className="num text-3xl font-bold tracking-wide">
                  <span style={{ color: colorA }}>{h2h.w}</span>
                  <span className="text-mute text-xl mx-2">:</span>
                  <span style={{ color: colorB }}>{h2h.l}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{b.name}</span>
                  <RaceTag race={b.race} size="lg" />
                </div>
              </div>
              <SplitBar a={h2h.w} b={h2h.l} colorA={colorA} colorB={colorB} labelA={`${pct(h2h.w, h2h.l)}%`} labelB={`${pct(h2h.l, h2h.w)}%`} />
              <div className="text-center text-xs text-mute mt-3">{h2h.ms.length}전 · {h2h.ms.at(-1)?.date} ~ {h2h.ms[0]?.date}</div>
            </div>

            <Section title="맵별 맞대결">
              <ul className="divide-y divide-hairline">
                {h2h.byMap.map(([map, [w, l]]) => (
                  <li key={map} className="px-4 py-2.5 flex items-center gap-4">
                    <span className="flex-1 text-sm truncate">{map}</span>
                    <div className="w-44">
                      <SplitBar a={w} b={l} colorA={colorA} colorB={colorB} labelA={w} labelB={l} />
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="전체 경기">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-hairline">
                  {h2h.ms.map((m) => (
                    <tr key={m.id ?? m.date + m.delta}>
                      <td className="num px-4 py-2 text-xs text-mute w-24">{m.date}</td>
                      <td className="py-2 w-24">
                        <span className="text-xs font-medium" style={{ color: m.win ? colorA : colorB }}>
                          {m.win ? a.name : b.name} 승
                        </span>
                      </td>
                      <td className="py-2 text-ink2 text-xs">{m.map}</td>
                      <td className="px-4 py-2 text-right text-[10px] text-mute hidden sm:table-cell">{m.series}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </>
        )
      )}
      {!(a && b) && (
        <div className="p-14 text-center text-mute text-sm bg-surface border border-hairline rounded-lg">
          두 선수를 선택하면 맞대결 전적을 보여드립니다.
        </div>
      )}
    </div>
  );
}
