import { useMemo, useRef, useState } from 'react';

// Hand-rolled ELO trend line: 2px line, dots, hairline grid, crosshair +
// tooltip on hover. data: [{ x: label, y: number, sub: string }]
const W = 640, H = 200, PL = 46, PR = 14, PT = 14, PB = 26;

export default function LineChart({ data, color = 'var(--color-gold)' }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const { pts, ticks } = useMemo(() => {
    const ys = data.map((d) => d.y);
    let min = Math.min(...ys), max = Math.max(...ys);
    if (min === max) { min -= 10; max += 10; }
    const pad = (max - min) * 0.12;
    min -= pad; max += pad;
    const sx = (i) => PL + (i * (W - PL - PR)) / Math.max(data.length - 1, 1);
    const sy = (v) => PT + (H - PT - PB) * (1 - (v - min) / (max - min));
    const pts = data.map((d, i) => ({ ...d, cx: sx(i), cy: sy(d.y) }));
    const step = (max - min) / 3;
    const ticks = [0, 1, 2, 3].map((i) => ({ v: Math.round(min + step * i), cy: sy(min + step * i) }));
    return { pts, ticks };
  }, [data]);

  if (data.length < 2) return <div className="p-6 text-center text-mute text-sm">추이를 그리기엔 데이터가 부족합니다</div>;

  const onMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i].cx - x) < Math.abs(pts[best].cx - x)) best = i;
    setHover(best);
  };

  const hp = hover != null ? pts[hover] : null;
  const tipW = 118, tipX = hp ? Math.min(Math.max(hp.cx - tipW / 2, PL), W - PR - tipW) : 0;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.cx},${p.cy}`).join(' ');

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto block"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      role="img"
      aria-label="ELO 추이"
    >
      {ticks.map((t) => (
        <g key={t.v}>
          <line x1={PL} x2={W - PR} y1={t.cy} y2={t.cy} stroke="var(--color-hairline)" strokeWidth="1" />
          <text x={PL - 8} y={t.cy + 3.5} textAnchor="end" fontSize="10" fill="var(--color-mute)" className="num">{t.v}</text>
        </g>
      ))}
      {pts.map((p, i) => (
        (pts.length <= 14 || i % 2 === 0) && (
          <text key={p.x} x={p.cx} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-mute)" className="num">
            {p.x.slice(2).replace('-', '.')}
          </text>
        )
      ))}
      <path d={`${line} L${pts.at(-1).cx},${H - PB} L${pts[0].cx},${H - PB} Z`} fill={color} opacity="0.07" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={hover === i ? 4.5 : 3} fill={color} stroke="var(--color-surface)" strokeWidth="2" />
      ))}
      {hp && (
        <g pointerEvents="none">
          <line x1={hp.cx} x2={hp.cx} y1={PT} y2={H - PB} stroke="var(--color-ink2)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
          <rect x={tipX} y={PT} width={tipW} height={hp.sub ? 40 : 26} rx="4" fill="var(--color-raised)" stroke="var(--color-hairline)" />
          <text x={tipX + 8} y={PT + 16} fontSize="11" fill="var(--color-ink)" className="num" fontWeight="600">
            {hp.x} · {hp.y}
          </text>
          {hp.sub && (
            <text x={tipX + 8} y={PT + 31} fontSize="10" fill="var(--color-ink2)">{hp.sub}</text>
          )}
        </g>
      )}
    </svg>
  );
}
