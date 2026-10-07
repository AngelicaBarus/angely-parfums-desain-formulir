// Fungsi bantu matematika murni (bukan bagian React).
export const TAU = Math.PI * 2

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const smooth = (a, b, v) => {
  const x = clamp((v - a) / (b - a), 0, 1)
  return x * x * (3 - 2 * x)
}

export function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}