// Mesin partikel semprotan parfum + gambar droplet (murni JavaScript, tanpa React).
import { TAU, clamp, mulberry32 } from './math.js'

// Timeline (detik sejak tombol spray ditekan)
export const T_TRACK = 0.05 // kamera mulai zoom pelan sedetik setelah spray keluar
export const T_ZOOM = 1.2 // fase zoom dalam
export const T_FADE = 2.7 // overlay pink mulai muncul (masuk ke droplet)
export const T_LOGIN = 3.6 // login tampil

export const TARGET_R = 1.1 // radius target di koordinat dunia (diameter 2.2px pada zoom 1)

let spriteCache = null
export function getSprite() {
  if (spriteCache) return spriteCache
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, 'rgba(255,232,240,1)')
  gr.addColorStop(0.35, 'rgba(250,214,226,0.55)')
  gr.addColorStop(1, 'rgba(246,200,215,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 64, 64)
  spriteCache = c
  return c
}

/* ------------------------- particle system ------------------------- */
/*
  Layout indeks:
    0                 : TARGET (droplet yang akan diikuti kamera)
    [1, h1)           : haze  (fine mist sangat kecil, banyak)
    [h1, m1)          : mist  (fine mist agak besar, blur)
    [m1, n)           : droplet (tiny 0 / big 1 / streak 2)
  Posisi dihitung analitis dari umur partikel -> deterministik & ringan.
*/
export function createSpray({ S, small, seed }) {
  const rng = mulberry32(seed)
  const gauss = () => {
    let u = 0
    while (u === 0) u = rng()
    const v = rng()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v)
  }

  const cHaze = small ? 300 : 450
  const cMist = 150
  const cTiny = 1275
  const cBig = 60
  const cStreak = 15
  const n = 1 + cHaze + cMist + cTiny + cBig + cStreak

  const f = () => new Float32Array(n)
  const sp = {
    n,
    s: f(), D: f(), tau: f(), th: f(), amp: f(), f1: f(), p1: f(), f2: f(), p2: f(),
    vd: f(), g: f(), size: f(), alpha: f(), life: f(),
    kind: new Uint8Array(n),
    h1: 1 + cHaze,
    m1: 1 + cHaze + cMist,
  }

  const sizeScale = 0.8 + 0.2 * clamp(S, 0.3, 1)
  const emission = () => (-Math.log(1 - rng() * (1 - Math.exp(-2.8))) / 2.8) * 1.05

  const set = (i, kind, o) => {
    sp.kind[i] = kind
    sp.s[i] = 0.02 + emission()
    sp.D[i] = o.D
    sp.tau[i] = o.tau * 1.5 // ekspansi lebih bertahap
    sp.th[i] = o.th
    sp.amp[i] = o.amp
    sp.f1[i] = 1.5 + rng() * 4
    sp.p1[i] = rng() * TAU
    sp.f2[i] = 4 + rng() * 7
    sp.p2[i] = rng() * TAU
    sp.vd[i] = o.vd
    sp.g[i] = o.g
    sp.size[i] = o.size
    sp.alpha[i] = o.alpha
    sp.life[i] = o.life
  }

  // Target (indeks 0): droplet normal & kecil, DEKAT botol (~150px dari nozzle) agar tetap di dalam frame, sedikit di atas sumbu
  set(0, 0, {
    D: 150 * S, tau: 1.25, th: -0.04, amp: 1.5, vd: 0, g: 0.6,
    size: TARGET_R * 2, alpha: 0.95, life: 1e9,
  })
  sp.s[0] = 0.03
  sp.f1[0] = 1.1
  sp.f2[0] = 2.3

  let i = 1
  // haze: kabut halus sangat kecil, banyak, menyebar lebar
  for (let k = 0; k < cHaze; k++, i++) {
    set(i, 4, {
      D: S * (200 + 450 * rng()), tau: 1.0 + rng(), th: clamp(gauss() * 0.11, -0.32, 0.32),
      amp: 3 + rng() * 9, vd: gauss() * 9, g: 0.3,
      size: 2.5 + rng() * 3.5, alpha: 0.05 + rng() * 0.07, life: 5 + rng() * 4,
    })
  }
  // mist: kabut sedikit lebih besar, blur, lebih lambat
  for (let k = 0; k < cMist; k++, i++) {
    set(i, 3, {
      D: S * (150 + 400 * rng()), tau: 1.2 + rng(), th: clamp(gauss() * 0.13, -0.34, 0.34),
      amp: 6 + rng() * 12, vd: gauss() * 12, g: 0.2,
      size: 6 + rng() * 8, alpha: 0.035 + rng() * 0.05, life: 6 + rng() * 4,
    })
  }
  // tiny droplet (85%)
  for (let k = 0; k < cTiny; k++, i++) {
    set(i, 0, {
      D: S * (240 + 520 * Math.pow(rng(), 0.85)), tau: 0.7 + rng() * 0.9,
      th: clamp(gauss() * 0.085, -0.3, 0.3), amp: 2 + rng() * 7, vd: gauss() * 5,
      g: 0.8 + rng() * 1.4, size: (0.5 + Math.pow(rng(), 2.2) * 1.3) * sizeScale,
      alpha: 0.45 + rng() * 0.5, life: 4.2 + rng() * 3.5,
    })
  }
  // droplet lebih besar (4%) — jarang yang 3–5px
  for (let k = 0; k < cBig; k++, i++) {
    const huge = rng() < 0.2
    set(i, 1, {
      D: S * (170 + 360 * rng()), tau: 0.5 + rng() * 0.5,
      th: clamp(gauss() * 0.08, -0.3, 0.3), amp: 2 + rng() * 5, vd: gauss() * 4,
      g: 3 + rng() * 2, size: (huge ? 3.2 + rng() * 1.8 : 1.9 + rng() * 1.3) * sizeScale,
      alpha: 0.55 + rng() * 0.3, life: 3.5 + rng() * 2.5,
    })
  }
  // streak tipis (1%) — pendek, hanya di awal semprotan
  for (let k = 0; k < cStreak; k++, i++) {
    set(i, 2, {
      D: S * (300 + 400 * rng()), tau: 0.5 + rng() * 0.4,
      th: clamp(gauss() * 0.06, -0.2, 0.2), amp: 1.5, vd: gauss() * 3, g: 1,
      size: 1.0 + rng() * 0.6, alpha: 0.35 + rng() * 0.25, life: 1.0 + rng() * 1.2,
    })
  }
  return sp
}

export function particlePos(sp, i, t, axis, out) {
  const a = Math.max(0, t - sp.s[i])
  const D = sp.D[i]
  const tau = sp.tau[i]
  // jarak sepanjang sumbu: cepat di awal lalu melambat (drag) -> menjauh dari nozzle
  const d = D * (1 - Math.exp(-a / tau))
  let lat = d * sp.th[i] // sudut Gaussian -> cone, melebar seiring jarak
  lat +=
    sp.amp[i] *
    (0.25 + d / 500) *
    (Math.sin(a * sp.f1[i] + sp.p1[i]) + 0.55 * Math.sin(a * sp.f2[i] + sp.p2[i])) *
    Math.min(1, a * 1.5) // turbulence halus
  lat += sp.vd[i] * (1 - Math.exp(-a / 1.4)) * 1.4 // drift acak
  const fall = sp.g[i] * Math.pow(a, 1.6) // sedikit turun karena gravitasi
  out.x = axis.cx * d + axis.px * lat
  out.y = axis.sy * d + axis.py * lat + fall
}

export function drawTarget(ctx, x, y, R) {
  ctx.save()
  if (R < 1.6) {
    ctx.globalAlpha = 0.95
    ctx.fillStyle = '#fff0f5'
    ctx.beginPath()
    ctx.arc(x, y, Math.max(R, 0.8), 0, TAU)
    ctx.fill()
    ctx.restore()
    return
  }
  ctx.globalAlpha = 1
  if (R > 4) {
    const g = ctx.createRadialGradient(x, y, R * 0.85, x, y, R * 1.5)
    g.addColorStop(0, 'rgba(246,217,226,0.28)')
    g.addColorStop(1, 'rgba(246,217,226,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, R * 1.5, 0, TAU)
    ctx.fill()
  }
  // badan droplet
  const g2 = ctx.createRadialGradient(x - R * 0.32, y - R * 0.36, R * 0.02, x, y, R)
  g2.addColorStop(0, 'rgba(255,247,240,0.8)')
  g2.addColorStop(0.28, 'rgba(246,217,226,0.58)')
  g2.addColorStop(0.7, 'rgba(229,164,183,0.52)')
  g2.addColorStop(0.92, 'rgba(214,126,156,0.72)')
  g2.addColorStop(1, 'rgba(255,230,238,0.88)')
  ctx.fillStyle = g2
  ctx.beginPath()
  ctx.arc(x, y, R, 0, TAU)
  ctx.fill()

  if (R > 3) {
    // caustic terang di sisi bawah-kanan (cahaya terbias)
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, R, 0, TAU)
    ctx.clip()
    const g3 = ctx.createRadialGradient(x + R * 0.28, y + R * 0.4, 0, x + R * 0.28, y + R * 0.4, R * 0.55)
    g3.addColorStop(0, 'rgba(255,247,240,0.4)')
    g3.addColorStop(1, 'rgba(255,247,240,0)')
    ctx.fillStyle = g3
    ctx.fillRect(x - R, y - R, R * 2, R * 2)
    ctx.restore()

    // rim
    ctx.lineWidth = Math.max(0.8, R * 0.025)
    ctx.strokeStyle = 'rgba(255,247,240,0.6)'
    ctx.beginPath()
    ctx.arc(x, y, R, 0, TAU)
    ctx.stroke()

    // specular highlight
    ctx.save()
    ctx.translate(x - R * 0.38, y - R * 0.42)
    ctx.rotate(-0.7)
    ctx.scale(1, 0.6)
    const g4 = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.17)
    g4.addColorStop(0, 'rgba(255,255,255,0.9)')
    g4.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g4
    ctx.beginPath()
    ctx.arc(0, 0, R * 0.17, 0, TAU)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}