/**
 * Handshape table for the one-handed manual alphabet (ASL-based, which SASL, NSL and KSL
 * fingerspelling largely share; regional variants differ). Right hand, palm facing the viewer.
 *
 * Finger bend is given per joint in degrees (0 = straight up, 90 = pointing at the viewer,
 * 180 = folded down onto the palm). `spread` tilts a finger sideways in degrees
 * (positive = towards the thumb side). Thumb angles are 2D screen angles (0 = up, 90 = right).
 */

export type FingerName = "index" | "middle" | "ring" | "pinky";

export interface FingerPose {
  /** Relative bend at the knuckle, middle and tip joints. */
  bend: [number, number, number];
  spread: number;
}

export interface HandPose {
  fingers: Record<FingerName, FingerPose>;
  thumb: { a1: number; a2: number; front: boolean };
  /** Whole-hand rotation in degrees (for G/H sideways, P/Q downwards). */
  rotate: number;
  motion?: "j" | "z";
}

const curl = (c: number, spread = 0): FingerPose => ({ bend: [90 * c, 100 * c, 70 * c], spread });
const straight = (spread = 0): FingerPose => curl(0, spread);
const fist = (): FingerPose => curl(1);

type ThumbPreset = HandPose["thumb"];
const THUMB = {
  side: { a1: -4, a2: -8, front: true }, // A: up along the side of the index
  out: { a1: 60, a2: 82, front: false }, // L, Y: pointing out sideways
  acrossLow: { a1: -62, a2: -96, front: true }, // B, 4: folded across the palm
  acrossMid: { a1: -28, a2: -86, front: true }, // S: across the front of the fingers
  tipTouch: { a1: -22, a2: -62, front: true }, // O, F, D: thumb tip meets a fingertip
  between: { a1: -14, a2: -26, front: true }, // K, P: thumb up between index and middle
  tucked: { a1: -32, a2: -118, front: false }, // M, N, T, E: hidden under the fingers
  curve: { a1: 38, a2: -10, front: false }, // C: thumb out and curving up, leaving a gap
} satisfies Record<string, ThumbPreset>;

function pose(
  fingers: [FingerPose, FingerPose, FingerPose, FingerPose],
  thumb: ThumbPreset,
  rotate = 0,
  motion?: HandPose["motion"],
): HandPose {
  const [index, middle, ring, pinky] = fingers;
  return { fingers: { index, middle, ring, pinky }, thumb, rotate, motion };
}

export const NEUTRAL_POSE: HandPose = pose([curl(0.15, 2), curl(0.15), curl(0.15, -2), curl(0.15, -4)], { a1: 30, a2: 20, front: false });

const V = pose([straight(12), straight(-12), fist(), fist()], THUMB.tucked);
const K = pose([straight(12), straight(-12), fist(), fist()], THUMB.between);
const G = pose([straight(), fist(), fist(), fist()], { a1: -40, a2: -10, front: false }, -80);

export const HANDSHAPES: Record<string, HandPose> = {
  A: pose([fist(), fist(), fist(), fist()], THUMB.side),
  B: pose([straight(), straight(), straight(), straight()], THUMB.acrossLow),
  C: pose([curl(0.42), curl(0.42), curl(0.42), curl(0.42)], THUMB.curve),
  D: pose([straight(), curl(0.6), curl(0.6), curl(0.6)], THUMB.tipTouch),
  E: pose([curl(0.8), curl(0.8), curl(0.8), curl(0.8)], THUMB.tucked),
  F: pose([curl(0.62), straight(-4), straight(-6), straight(-10)], THUMB.tipTouch),
  G,
  H: pose([straight(3), straight(-3), fist(), fist()], { a1: -40, a2: -10, front: false }, -80),
  I: pose([fist(), fist(), fist(), straight(-4)], THUMB.acrossMid),
  J: pose([fist(), fist(), fist(), straight(-4)], THUMB.acrossMid, 0, "j"),
  K,
  L: pose([straight(), fist(), fist(), fist()], THUMB.out),
  M: pose([curl(0.88), curl(0.88), curl(0.88), fist()], THUMB.tucked),
  N: pose([curl(0.88), curl(0.88), fist(), fist()], THUMB.tucked),
  O: pose([curl(0.58), curl(0.58), curl(0.58), curl(0.58)], THUMB.tipTouch),
  P: { ...K, rotate: 125 },
  Q: { ...G, rotate: 140 },
  R: pose([straight(-9), straight(9), fist(), fist()], THUMB.acrossMid),
  S: pose([fist(), fist(), fist(), fist()], THUMB.acrossMid),
  T: pose([curl(0.85), fist(), fist(), fist()], THUMB.between),
  U: pose([straight(2), straight(-2), fist(), fist()], THUMB.acrossMid),
  V,
  W: pose([straight(14), straight(), straight(-14), fist()], THUMB.acrossMid),
  X: pose([{ bend: [10, 95, 80], spread: 0 }, fist(), fist(), fist()], THUMB.acrossMid),
  Y: pose([fist(), fist(), fist(), straight(-14)], THUMB.out),
  Z: pose([straight(), fist(), fist(), fist()], THUMB.acrossMid, 0, "z"),
  "0": pose([curl(0.58), curl(0.58), curl(0.58), curl(0.58)], THUMB.tipTouch),
  "1": pose([straight(), fist(), fist(), fist()], THUMB.acrossMid),
  "2": V,
  "3": pose([straight(12), straight(-12), fist(), fist()], THUMB.out),
  "4": pose([straight(10), straight(3), straight(-4), straight(-12)], THUMB.acrossLow),
  "5": pose([straight(12), straight(3), straight(-5), straight(-14)], THUMB.out),
};

/** Letters to fingerspell for a gloss word: accents stripped, unsupported characters dropped. */
export function spellable(word: string): string[] {
  return [...word.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()].filter((ch) => ch in HANDSHAPES);
}
