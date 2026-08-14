import { useState } from 'react';

// Small daily-activity bar chart with per-bar hover tooltip.
// data: [{ x: 'YYYY-MM-DD', y: number }]
const W = 640, H = 150, PL = 34, PR = 8, PT = 12, PB = 22;

export default function BarChart({ data, color = 'var(--color-accent)' }) {
  const [hover, setHover] = useState(null);
  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d.y), 1);
  const innerW = W - PL - PR, innerH = H - PT - PB;
  const bw = innerW / data.length;
  const labelStep = Math.ceil(data.length / 6);
  const hp = hover != null ? data[hover] : null;
  const tipW = 108;
  const tipX = hp ? Math.min(Math.max(PL + hover * bw + bw / 2 - tipW / 2, PL), W - PR - tipW) : 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" onMouseLeave={() => setHover(null)} role="img" aria-label="일별 경기 수">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={PL} x2={W - PR} y1={PT + innerH * (1 - t)} y2={PT + innerH * (1 - t)} stroke="var(--color-hairline)" strokeWidth="1" />
          <text x={PL - 6} y={PT + innerH * (1 - t) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-mute)" className="num">
            {Math.round(max * t)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const h = (d.y / max) * innerH;
        return (
          <g key={d.x}>
            <rect
              x={PL + i * bw + 1}
              y={PT + innerH - h}
              width={Math.max(bw - 2, 2)}
              height={Math.max(h, d.y > 0 ? 2 : 0)}
              rx="2"
              fill={color}
              opacity={hover === null || hover === i ? 1 : 0.35}
              style={{ transition: 'opacity 0.15s' }}
            />
            {/* full-height hit target so thin bars stay hoverable */}
            <rect x={PL + i * bw} y={PT} width={bw} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
            {i % labelStep === 0 && (
              <text x={PL + i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--color-mute)" className="num">
                {d.x.slice(5).replace('-', '.')}
              </text>
            )}
          </g>
        );
      })}
      {hp && (
        <g pointerEvents="none">
          <rect x={tipX} y={PT} width={tipW} height={26} rx="4" fill="var(--color-surface)" stroke="var(--color-hairline)" />
          <text x={tipX + 8} y={PT + 17} fontSize="11" fill="var(--color-ink)" className="num" fontWeight="600">
            {hp.x.slice(5).replace('-', '.')} · {hp.y}경기
          </text>
        </g>
      )}
    </svg>
  );
}
