"use client";

import { useEffect, useRef, useState } from "react";
import { HANDSHAPES, NEUTRAL_POSE, type FingerName, type HandPose } from "@/lib/signbridge/handshapes";

/**
 * SVG hand that animates between fingerspelling handshapes.
 * Fingers are projected from a palm-facing-viewer frontal view: bending a joint towards the
 * viewer foreshortens the segment, and bending past 90° folds it back down over the palm.
 */

const SKIN = "#e8b48a";
const SKIN_SHADE = "#d49a6e";
const OUTLINE = "#7a4a2c";
const TWEEN_MS = 130;

interface FingerGeometry {
  base: [number, number];
  lengths: [number, number, number];
  width: number;
}

const FINGERS: Record<FingerName, FingerGeometry> = {
  pinky: { base: [66, 132], lengths: [24, 17, 14], width: 13 },
  ring: { base: [87, 123], lengths: [31, 21, 16], width: 15 },
  middle: { base: [108, 120], lengths: [34, 22, 17], width: 16 },
  index: { base: [129, 124], lengths: [31, 20, 16], width: 15 },
};
const DRAW_ORDER: FingerName[] = ["pinky", "ring", "middle", "index"];
const THUMB_BASE: [number, number] = [142, 192];
const THUMB_LENGTHS: [number, number] = [28, 24];
const PIVOT = "100px 170px";

type Vec = number[];

function toVector(p: HandPose): Vec {
  const v: Vec = [];
  for (const f of DRAW_ORDER) v.push(...p.fingers[f].bend, p.fingers[f].spread);
  v.push(p.thumb.a1, p.thumb.a2, p.rotate);
  return v;
}

function fromVector(v: Vec, template: HandPose): HandPose {
  const fingers = {} as HandPose["fingers"];
  DRAW_ORDER.forEach((f, i) => {
    const o = i * 4;
    fingers[f] = { bend: [v[o], v[o + 1], v[o + 2]], spread: v[o + 3] };
  });
  return { fingers, thumb: { a1: v[16], a2: v[17], front: template.thumb.front }, rotate: v[18], motion: template.motion };
}

function fingerPoints(g: FingerGeometry, bend: [number, number, number], spread: number): [number, number][] {
  const rad = Math.PI / 180;
  const dir: [number, number] = [Math.sin(spread * rad), -Math.cos(spread * rad)];
  const pts: [number, number][] = [g.base];
  let theta = 0;
  let [x, y] = g.base;
  for (let i = 0; i < 3; i++) {
    theta += bend[i];
    const proj = g.lengths[i] * Math.cos(theta * rad);
    x += dir[0] * proj;
    y += dir[1] * proj;
    pts.push([x, y]);
  }
  return pts;
}

function thumbPoints(a1: number, a2: number): [number, number][] {
  const rad = Math.PI / 180;
  const [bx, by] = THUMB_BASE;
  const x1 = bx + THUMB_LENGTHS[0] * Math.sin(a1 * rad);
  const y1 = by - THUMB_LENGTHS[0] * Math.cos(a1 * rad);
  const x2 = x1 + THUMB_LENGTHS[1] * Math.sin(a2 * rad);
  const y2 = y1 - THUMB_LENGTHS[1] * Math.cos(a2 * rad);
  return [
    [bx, by],
    [x1, y1],
    [x2, y2],
  ];
}

function Digit({ points, width, folded }: { points: [number, number][]; width: number; folded: boolean }) {
  const d = `M${points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")}`;
  return (
    <g>
      <path d={d} fill="none" stroke={OUTLINE} strokeWidth={width + 3} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={folded ? SKIN_SHADE : SKIN} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** Animates smoothly to the handshape for `letter` (or a relaxed hand when null). */
export function HandAvatar({ letter, className }: { letter: string | null; className?: string }) {
  const target = (letter && HANDSHAPES[letter]) || NEUTRAL_POSE;
  const [current, setCurrent] = useState<HandPose>(target);
  const currentRef = useRef(toVector(target));

  useEffect(() => {
    const from = currentRef.current;
    const to = toVector(target);
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / TWEEN_MS);
      const e = 1 - (1 - t) ** 3; // ease-out cubic
      const v = from.map((a, i) => a + (to[i] - a) * e);
      currentRef.current = v;
      setCurrent(fromVector(v, target));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const thumb = <Digit points={thumbPoints(current.thumb.a1, current.thumb.a2)} width={17} folded={current.thumb.front} />;

  return (
    <svg viewBox="0 0 200 260" className={className} role="img" aria-label={letter ? `Handshape ${letter}` : "Relaxed hand"}>
      <style>{`
        @keyframes sb-j { 0% { transform: rotate(0deg); } 60% { transform: rotate(35deg) translateY(10px); } 100% { transform: rotate(80deg) translateY(14px); } }
        @keyframes sb-z { 0% { transform: translate(0,0); } 33% { transform: translate(-22px,0); } 66% { transform: translate(0,18px); } 100% { transform: translate(-22px,18px); } }
      `}</style>
      <g style={{ transformOrigin: PIVOT, transform: `rotate(${current.rotate}deg)` }}>
        <g
          key={letter ?? "rest"}
          style={{
            transformOrigin: PIVOT,
            animation: current.motion ? `sb-${current.motion} 0.5s ease-in-out forwards` : undefined,
          }}
        >
          {/* forearm + palm */}
          <path d="M70 255 L74 205 L130 205 L136 255 Z" fill={SKIN} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
          {!current.thumb.front && thumb}
          <rect x={54} y={116} width={92} height={96} rx={26} fill={SKIN} stroke={OUTLINE} strokeWidth={3} />
          {DRAW_ORDER.map((f) => {
            const fp = current.fingers[f];
            return <Digit key={f} points={fingerPoints(FINGERS[f], fp.bend, fp.spread)} width={FINGERS[f].width} folded={fp.bend[0] + fp.bend[1] > 90} />;
          })}
          {current.thumb.front && thumb}
        </g>
      </g>
    </svg>
  );
}
