"use client";

import { useEffect } from "react";
import { motion, useSpring } from "framer-motion";

interface TachometerProps {
  score: number;
  maxScore: number;
  size?: number;
  instanceId?: string;
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

export function Tachometer({ score, maxScore, size = 260, instanceId = "default" }: TachometerProps) {
  const id = instanceId;
  const pct = Math.min(score / maxScore, 1);
  const needleAngle = START_ANGLE + pct * SWEEP;

  const springAngle = useSpring(START_ANGLE, { stiffness: 60, damping: 18 });

  useEffect(() => {
    springAngle.set(needleAngle);
  }, [needleAngle, springAngle]);

  const ticks = Array.from({ length: 11 }, (_, i) => i);
  const minorTicks = Array.from({ length: 51 }, (_, i) => i);

  return (
    <div style={{ width: size, height: size }} className="relative select-none">
      <svg viewBox="0 0 200 200" width={size} height={size} overflow="visible">
        <defs>
          <radialGradient id={`gaugeGlow-${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#111" />
            <stop offset="100%" stopColor="#000" />
          </radialGradient>
          <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`needleGlow-${id}`}>
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
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
        <circle cx={CX} cy={CY} r={OUTER_R + 6} fill="#1a1a1a" stroke="#333" strokeWidth="1.5" />
        <circle cx={CX} cy={CY} r={OUTER_R + 4} fill="none" stroke="#444" strokeWidth="0.5" />

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
          const label = polarToCartesian(CX, CY, OUTER_R - 26, angle);
          const val = Math.round((i / 10) * maxScore / 1000);
          return (
            <g key={i}>
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#666" strokeWidth="1.2" />
              <text
                x={label.x} y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="8"
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
        <motion.g style={{ rotate: springAngle, originX: "100px", originY: "100px" }}>
          <line x1={CX} y1={CY - 8} x2={CX} y2={CY - 65} stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" filter={`url(#needleGlow-${id})`} />
          <line x1={CX} y1={CY - 55} x2={CX} y2={CY - 65} stroke="#ff6b6b" strokeWidth="1.2" strokeLinecap="round" />
          <line x1={CX} y1={CY - 8} x2={CX} y2={CY + 14} stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
        </motion.g>

        {/* Center cap */}
        <circle cx={CX} cy={CY} r="8" fill="#111" stroke="#444" strokeWidth="1" />
        <circle cx={CX} cy={CY} r="4" fill="#ef4444" />
        <circle cx={CX} cy={CY} r="2" fill="#ff6b6b" />

        {/* Score label */}
        <text x={CX} y={CY + 26} textAnchor="middle" fontSize="18" fill="white" fontFamily="'Outfit', sans-serif" fontWeight="900" letterSpacing="-0.5">
          {score.toLocaleString()}
        </text>
        <text x={CX} y={CY + 37} textAnchor="middle" fontSize="6" fill="#666" fontFamily="monospace" letterSpacing="2">
          POINTS
        </text>
        <text x={CX} y={CY + 48} textAnchor="middle" fontSize="5.5" fill="#444" fontFamily="monospace" letterSpacing="1">
          ×1000 RPT
        </text>
        <text x={CX} y={CY - 36} textAnchor="middle" fontSize="5.5" fill="#333" fontFamily="'Outfit', sans-serif" letterSpacing="3" fontWeight="700">
          AUTOGUESSR
        </text>
      </svg>
    </div>
  );
}
