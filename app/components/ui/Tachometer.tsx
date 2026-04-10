"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface TachometerProps {
  score: number;
  maxScore: number;
  size?: number;
  instanceId?: string;
  variant?: "game" | "results";
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

const CX = 100;
const CY = 100;
const OUTER_R = 88;
const TRACK_R = 76;
const START_ANGLE = 140;
const END_ANGLE = 400;
const SWEEP = END_ANGLE - START_ANGLE;

export function Tachometer({ score, maxScore, size = 260, instanceId = "default", variant = "game" }: TachometerProps) {
  const id = instanceId;
  const isGame = variant === "game";
  const pct = Math.min(score / maxScore, 1);
  const needleAngle = START_ANGLE + pct * SWEEP;

  const springAngle = useSpring(START_ANGLE, { stiffness: 60, damping: 18 });

  useEffect(() => {
    springAngle.set(needleAngle);
  }, [needleAngle, springAngle]);

  const toRad = (a: number) => ((a - 90) * Math.PI) / 180;
  const needleX1 = useTransform(springAngle, (a) => CX + 8 * Math.cos(toRad(a)));
  const needleY1 = useTransform(springAngle, (a) => CY + 8 * Math.sin(toRad(a)));
  const needleX2 = useTransform(springAngle, (a) => CX + 65 * Math.cos(toRad(a)));
  const needleY2 = useTransform(springAngle, (a) => CY + 65 * Math.sin(toRad(a)));
  const needleTailX = useTransform(springAngle, (a) => CX - 14 * Math.cos(toRad(a)));
  const needleTailY = useTransform(springAngle, (a) => CY - 14 * Math.sin(toRad(a)));
  const tipCx = useTransform(springAngle, (a) => CX + TRACK_R * Math.cos(toRad(a)));
  const tipCy = useTransform(springAngle, (a) => CY + TRACK_R * Math.sin(toRad(a)));

  const ticks = Array.from({ length: 11 }, (_, i) => i);
  const minorTicks = Array.from({ length: 51 }, (_, i) => i);

  return (
    <div style={{ width: size, maxWidth: "100%", aspectRatio: "1" }} className="relative select-none">
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        <defs>
          <radialGradient id={`gaugeGlow-${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#111" />
            <stop offset="100%" stopColor="#000" />
          </radialGradient>
          <filter id={`glow-${id}`} filterUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id={`arcGradient-${id}`} gradientUnits="userSpaceOnUse" x1="20" y1="100" x2="180" y2="100">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="45%" stopColor="#eab308" />
            <stop offset="80%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>

        {/* Outer bezel ring */}
        <circle cx={CX} cy={CY} r={OUTER_R + 6} fill="#1a1a1a" stroke="#666" strokeWidth="1.5" />
        <circle cx={CX} cy={CY} r={OUTER_R + 4} fill="none" stroke="#777" strokeWidth="0.5" />

        {/* Background disc */}
        <circle cx={CX} cy={CY} r={OUTER_R} fill={`url(#gaugeGlow-${id})`} />

        {/* Track background */}
        <path
          d={describeArc(CX, CY, TRACK_R, START_ANGLE, END_ANGLE)}
          fill="none"
          stroke="#1f1f1f"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* Coloured arc filled to score */}
        {pct > 0 && (
          <path
            d={describeArc(CX, CY, TRACK_R, START_ANGLE, START_ANGLE + pct * SWEEP)}
            fill="none"
            stroke={`url(#arcGradient-${id})`}
            strokeWidth="10"
            strokeLinecap="round"
            filter={`url(#glow-${id})`}
          />
        )}

        {/* Arc tip indicator — moves to end of coloured arc */}
        {pct > 0 && (
          <>
            <motion.circle cx={tipCx} cy={tipCy} r="6" fill="white" opacity="0.9" filter={`url(#glow-${id})`} />
            <motion.circle cx={tipCx} cy={tipCy} r="3" fill="white" />
          </>
        )}

        {/* Minor tick marks */}
        {minorTicks.map((i) => {
          const angle = START_ANGLE + (i / 50) * SWEEP;
          const inner = polarToCartesian(CX, CY, OUTER_R - 6, angle);
          const outer = polarToCartesian(CX, CY, OUTER_R - 2, angle);
          return (
            <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#333" strokeWidth="0.5" />
          );
        })}

        {/* Major tick marks + labels */}
        {ticks.map((i) => {
          const angle = START_ANGLE + (i / 10) * SWEEP;
          const inner = polarToCartesian(CX, CY, OUTER_R - 10, angle);
          const outer = polarToCartesian(CX, CY, OUTER_R - 2, angle);
          const label = polarToCartesian(CX, CY, OUTER_R - 28, angle);
          const val = i * 10;
          return (
            <g key={i}>
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#666" strokeWidth="1.2" />
              <text
                x={label.x} y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fill="#666"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Needle */}
        <motion.line x1={needleX1} y1={needleY1} x2={needleX2} y2={needleY2} stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        <motion.line x1={needleTailX} y1={needleTailY} x2={needleX1} y2={needleY1} stroke="#555" strokeWidth="1.5" strokeLinecap="round" />

        {/* Center cap */}
        <circle cx={CX} cy={CY} r="8" fill="#111" stroke="#444" strokeWidth="1" />
        <circle cx={CX} cy={CY} r="4" fill="#ef4444" />
        <circle cx={CX} cy={CY} r="2" fill="#ff6b6b" />

        {/* Score label */}
        {isGame && (
          <>
            <text x={CX} y={CY + 26} textAnchor="middle" fontSize="14" fill="white" fontFamily="'Outfit', sans-serif" fontWeight="900" letterSpacing="-0.5">
              {score.toLocaleString()}
            </text>
            <text x={CX} y={CY + 38} textAnchor="middle" fontSize="8" fill="#aaa" fontFamily="monospace" letterSpacing="2">
              POINTS
            </text>
          </>
        )}
        <text x={CX} y={CY - 28} textAnchor="middle" fontSize="7.5" fill="#aaa" fontFamily="'Outfit', sans-serif" letterSpacing="3" fontWeight="700">
          AUTOGUESSR
        </text>
      </svg>
    </div>
  );
}
