"use client";

import { Tachometer } from "@/app/components/ui/Tachometer";

const CX = 100;
const CY = 100;
const OUTER_R = 88;
const TRACK_R = 76;
const START_ANGLE = 140;
const END_ANGLE = 400;
const SWEEP = END_ANGLE - START_ANGLE;
const GAUGE_SIZE = 300;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

interface Props {
  score: number;
  grade: string;
  gradeColor: string;
  approxMax: number;
  personalBest: number | null;
}

export function ScorePanel({
  score,
  grade,
  gradeColor,
  approxMax,
  personalBest,
}: Props) {
  return (
    <div className="grid grid-cols-2 border-t border-white/10">
      <div className="flex flex-col items-center justify-center py-4 sm:py-8 px-2 border-r border-white/10">
        <div
          className="relative mb-3 w-full"
          style={{ maxWidth: GAUGE_SIZE, aspectRatio: "1" }}
        >
          <svg viewBox="0 0 200 200" width="100%" height="100%">
            <defs>
              <radialGradient id="scoreGaugeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#111" />
                <stop offset="100%" stopColor="#000" />
              </radialGradient>
            </defs>

            {/* Outer bezel ring */}
            <circle
              cx={CX}
              cy={CY}
              r={OUTER_R + 6}
              fill="#1a1a1a"
              stroke="#666"
              strokeWidth="1.5"
            />
            <circle
              cx={CX}
              cy={CY}
              r={OUTER_R + 4}
              fill="none"
              stroke="#777"
              strokeWidth="0.5"
            />

            {/* Background disc */}
            <circle cx={CX} cy={CY} r={OUTER_R} fill="url(#scoreGaugeGlow)" />

            {/* Track background */}
            <path
              d={describeArc(CX, CY, TRACK_R, START_ANGLE, END_ANGLE)}
              fill="none"
              stroke="#1f1f1f"
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* Minor tick marks */}
            {Array.from({ length: 51 }, (_, i) => {
              const angle = START_ANGLE + (i / 50) * SWEEP;
              const inner = polarToCartesian(CX, CY, OUTER_R - 6, angle);
              const outer = polarToCartesian(CX, CY, OUTER_R - 2, angle);
              return (
                <line
                  key={i}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="#333"
                  strokeWidth="0.5"
                />
              );
            })}

            {/* Major tick marks */}
            {Array.from({ length: 11 }, (_, i) => {
              const angle = START_ANGLE + (i / 10) * SWEEP;
              const inner = polarToCartesian(CX, CY, OUTER_R - 10, angle);
              const outer = polarToCartesian(CX, CY, OUTER_R - 2, angle);
              return (
                <line
                  key={i}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="#666"
                  strokeWidth="1.2"
                />
              );
            })}

            {/* Grade */}
            <text
              x={CX}
              y={CY - 10}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="62"
              fontFamily="'Outfit', sans-serif"
              fontWeight="900"
              fill="currentColor"
              className={gradeColor}
            >
              {grade}
            </text>

            {/* Score */}
            <text
              x={CX}
              y={CY + 33}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="20"
              fontFamily="'Outfit', sans-serif"
              fontWeight="900"
              fill="white"
            >
              {score.toLocaleString()}
            </text>

            {/* Points label */}
            <text
              x={CX}
              y={CY + 48}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="7"
              fontFamily="monospace"
              letterSpacing="2"
              fill="#666"
            >
              POINTS
            </text>
          </svg>
        </div>
        <p className="text-xs text-muted-foreground font-mono tracking-widest mt-3 uppercase">
          Driver Rating
        </p>
        {personalBest !== null && personalBest <= score && score > 0 && (
          <p className="text-xs text-green-400 font-bold tracking-widest uppercase">
            New PB!
          </p>
        )}
        {personalBest !== null && personalBest > score && (
          <p className="text-xs text-muted-foreground">
            PB: {personalBest.toLocaleString()}
          </p>
        )}
      </div>
      <div className="flex flex-col items-center justify-center pt-4 pb-2 sm:py-6 px-2">
        <Tachometer
          score={score}
          maxScore={approxMax}
          size={300}
          instanceId="results"
          variant="results"
        />
        <p className="text-xs text-muted-foreground font-mono tracking-widest mt-3 uppercase">
          Scored {approxMax > 0 ? Math.round(Math.min(score / approxMax, 1) * 100) : 0}% Overall
        </p>
      </div>
    </div>
  );
}
