import { useMemo } from 'react'

// angka acak berbiji (seed) supaya letak bunga selalu sama setiap kali dimuat
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}


/* --------------------------- floral background --------------------------- */
// palet mengikuti warna cairan parfum (krem -> persik -> koral), dibuat sedikit "dusty" agar elegan
const FLOWER_COLORS = [
  { p1: '#f9d3c3', p2: '#eba58f', p3: '#fdebe2', pd: '#c2573f' },
  { p1: '#f2b09a', p2: '#e0806a', p3: '#fad2c3', pd: '#b04630' },
  { p1: '#fbe0d4', p2: '#f0b8a4', p3: '#fff4ee', pd: '#d27a62' },
  { p1: '#eb9a82', p2: '#d96a50', p3: '#f5bba6', pd: '#a63d29' },
]
const LEAF_COLORS = ['#9fb894', '#86a584', '#b3c9a3']

function makeFlora() {
  const rng = mulberry32(77)
  const items = []
  const pos = () => {
    const u = rng() * 2 - 1
    const v = rng() * 2 - 1
    return [
      50 + 55 * Math.sign(u) * Math.pow(Math.abs(u), 0.7), // condong ke tepi layar
      50 + 55 * Math.sign(v) * Math.pow(Math.abs(v), 0.7),
    ]
  }
  const add = (kind, types, count, smin, smax, opacity, blurMax) => {
    for (let k = 0; k < count; k++) {
      let x, y
      for (let tries = 0; tries < 8; tries++) {
        ;[x, y] = pos()
        const inside = ((x - 50) / 22) ** 2 + ((y - 50) / 32) ** 2 < 1
        if (!inside || rng() < 0.2) break // area tengah (di balik kartu) dibuat lebih jarang
      }
      const c = FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)]
      items.push({
        kind,
        type: types[Math.floor(rng() * types.length)],
        x, y,
        s: smin + rng() * (smax - smin),
        rot: Math.round(rng() * 360),
        // datang dari sisi kiri (seperti arah semprotan), menyebar ke seluruh layar
        fx: -(x + 25),
        fy: (62 - y) * 0.5,
        delay: 0.05 + Math.min(1, Math.max(0, x / 100)) * 1.1 + rng() * 0.25,
        sway: 5 + rng() * 5,
        swayDir: rng() < 0.5 ? 1 : -1,
        blur: rng() < 0.3 ? (rng() * blurMax).toFixed(1) : 0,
        o: opacity,
        lf: LEAF_COLORS[Math.floor(rng() * LEAF_COLORS.length)],
        ...c,
      })
    }
  }
  add('leaf', ['leaf'], 22, 9, 17, 0.85, 1.5)
  add('flower', ['rose', 'rose', 'rosebud'], 16, 24, 34, 0.97, 2.5)
  add('flower', ['rose', 'rosebud', 'rose'], 26, 14, 22, 0.97, 2)
  add('flower', ['rosebud', 'rose'], 24, 8, 12, 0.97, 1.5)
  add('flower', ['petal'], 14, 8, 14, 0.9, 1.5)
  return items
}

// kelopak mawar: lebar, tepi atas sedikit bergelombang/berlekuk seperti mawar semprot asli
const PETAL = 'M0 0 C-24 -4 -31 -28 -17 -42 C-12 -48 -5 -46 0 -43 C5 -46 12 -48 17 -42 C31 -28 24 -4 0 0 Z'

function Petal({ fill, rot = 0, k = 1 }) {
  return (
    <g transform={`rotate(${rot}) scale(${k})`}>
      <path d={PETAL} fill={fill} />
      <path d={PETAL} fill="url(#rs-shade)" />
      <path d={PETAL} fill="url(#rs-lite)" />
      <path d={PETAL} fill="none" stroke="var(--pd)" strokeWidth={0.7 / k} strokeOpacity="0.35" />
      <path d="M-15 -40 C-9 -45 -4 -44 0 -42 C4 -44 9 -45 15 -40" fill="none" stroke="var(--p3)" strokeWidth={1.1 / k} strokeOpacity="0.75" strokeLinecap="round" />
    </g>
  )
}

function FloraSymbols() {
  const r = (n, off = 0) => Array.from({ length: n }, (_, i) => (i * 360) / n + off)
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {/* bayangan lembut di pangkal kelopak + kilau di ujung (warna tetap, bukan var) */}
        <radialGradient id="rs-shade" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="46">
          <stop offset="0" stopColor="rgb(80,18,8)" stopOpacity="0.6" />
          <stop offset="0.5" stopColor="rgb(80,18,8)" stopOpacity="0.16" />
          <stop offset="1" stopColor="rgb(80,18,8)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rs-lite" gradientUnits="userSpaceOnUse" cx="0" cy="-36" r="18">
          <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>

        {/* mawar mekar penuh: kelopak berlapis + pusaran di tengah */}
        <symbol id="fl-rose" viewBox="-50 -50 100 100">
          {r(7, 0).map((a) => <Petal key={'a' + a} fill="var(--p1)" rot={a} k={1} />)}
          {r(6, 26).map((a) => <Petal key={'b' + a} fill="var(--p2)" rot={a} k={0.8} />)}
          {r(5, 8).map((a) => <Petal key={'c' + a} fill="var(--p1)" rot={a} k={0.6} />)}
          {r(4, 40).map((a) => <Petal key={'d' + a} fill="var(--p3)" rot={a} k={0.42} />)}
          {r(3, 20).map((a) => <Petal key={'e' + a} fill="var(--p2)" rot={a} k={0.28} />)}
          <circle r="3.2" fill="var(--p2)" />
          <circle r="3.2" fill="url(#rs-shade)" opacity="0.8" />
          <path d="M-0.5 -0.5 C-2.6 -0.5 -3 -3.2 -1 -3.8 C1.4 -4.4 3.6 -2.4 3 0" fill="none" stroke="var(--pd)" strokeWidth="0.7" strokeOpacity="0.8" strokeLinecap="round" />
        </symbol>

        {/* kuncup mawar: kelopak rapat dengan kelopak hijau di bawahnya */}
        <symbol id="fl-rosebud" viewBox="-50 -50 100 100">
          {r(5, 18).map((a) => (
            <path key={'s' + a} transform={`rotate(${a})`} d="M0 0 C-6 -12 -5 -32 0 -43 C5 -32 6 -12 0 0 Z" fill="#8fae8a" stroke="#6f8f6c" strokeWidth="0.6" strokeOpacity="0.5" />
          ))}
          {r(5, 0).map((a) => <Petal key={'a' + a} fill="var(--p2)" rot={a} k={0.74} />)}
          {r(4, 34).map((a) => <Petal key={'b' + a} fill="var(--p1)" rot={a} k={0.54} />)}
          {r(3, 12).map((a) => <Petal key={'c' + a} fill="var(--p3)" rot={a} k={0.34} />)}
          <path d="M-0.5 -0.5 C-2.6 -0.5 -3 -3.2 -1 -3.8 C1.4 -4.4 3.6 -2.4 3 0" fill="none" stroke="var(--pd)" strokeWidth="0.7" strokeOpacity="0.8" strokeLinecap="round" />
        </symbol>

        {/* kelopak mawar lepas */}
        <symbol id="fl-petal" viewBox="-50 -50 100 100">
          <g transform="translate(0 22) scale(1.1)">
            <Petal fill="var(--p1)" rot={0} k={1} />
          </g>
        </symbol>

        <symbol id="fl-leaf" viewBox="-50 -50 100 100">
          <path d="M0 40 C-22 20 -22 -20 0 -44 C22 -20 22 20 0 40 Z" fill="var(--lf)" />
          <path d="M0 38 L0 -36" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" fill="none" />
          <path d="M0 40 C-22 20 -22 -20 0 -44 C22 -20 22 20 0 40 Z" fill="url(#rs-shade)" opacity="0.5" />
        </symbol>
      </defs>
    </svg>
  )
}

export default function FloraBackground({ active = true }) {
  const items = useMemo(makeFlora, [])
  return (
    <div className={'flora' + (active ? ' on' : '')} aria-hidden="true">
      <FloraSymbols />
      {items.map((f, i) => (
        <span
          key={i}
          className="fl"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            '--s': f.s.toFixed(1),
            '--r': `${f.rot}deg`,
            '--d': `${f.delay.toFixed(2)}s`,
            '--fx': `${f.fx.toFixed(1)}vw`,
            '--fy': `${f.fy.toFixed(1)}vh`,
            '--o': f.o,
            '--bl': `${f.blur}px`,
            '--p1': f.p1,
            '--p2': f.p2,
            '--p3': f.p3,
            '--pd': f.pd,
            '--lf': f.lf,
          }}
        >
          <svg
            viewBox="-50 -50 100 100"
            className="fl-svg"
            style={{ '--sw': `${f.sway.toFixed(1)}s`, '--dir': f.swayDir }}
          >
            <use href={`#fl-${f.type}`} />
          </svg>
        </span>
      ))}
    </div>
  )
}