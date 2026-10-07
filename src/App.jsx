import { useCallback, useEffect, useRef, useState } from 'react'
import PerfumeDisplay from './components/PerfumeDisplay.jsx'
import LoginPage from './components/LoginPage.jsx'
import { TAU, clamp, smooth } from './utils/math.js'
import {
  T_TRACK, T_ZOOM, T_FADE, T_LOGIN, TARGET_R,
  getSprite, createSpray, particlePos, drawTarget,
} from './utils/spray.js'


/* =====================================================================
   Angély Parfums — Cinematic perfume intro → login
   Seluruh partikel digambar di SATU canvas. Kamera virtual (camX, camY,
   zoom) yang bergerak; partikel tidak pernah bergerak ke arah kamera.
   React hanya menyimpan state scene (5 kali berubah), bukan per-frame.
   ===================================================================== */

const MQ = '(max-width: 720px), (max-aspect-ratio: 4/5)'

/* ------------------------------- app ------------------------------- */
export default function App() {
  const [scene, setScene] = useState('intro') // intro | spraying | tracking | zooming | login
  const [pressed, setPressed] = useState(false)

  const sceneRef = useRef('intro')
  const startedRef = useRef(false)
  const rafRef = useRef(0)
  const sim = useRef(null)
  const view = useRef({ W: 1, H: 1, dpr: 1 })

  const canvasRef = useRef(null)
  const roomRef = useRef(null)
  const displayRef = useRef(null)
  const camLayerRef = useRef(null)
  const nozzleRef = useRef(null)
  const overlayRef = useRef(null)
  const tintRef = useRef(null)

  /* ---- efek samping: kepala spray naik lagi 150ms setelah ditekan (timer + cleanup) ---- */
  useEffect(() => {
    if (!pressed) return
    const timer = setTimeout(() => setPressed(false), 150)
    return () => clearTimeout(timer)
  }, [pressed])

  const go = useCallback((s) => {
    sceneRef.current = s
    setScene(s)
  }, [])

  /* ---- ukuran canvas + skala display (bukan skala scene) ---- */
  useEffect(() => {
    const onResize = () => {
      const W = window.innerWidth
      const H = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const c = canvasRef.current
      c.width = Math.round(W * dpr)
      c.height = Math.round(H * dpr)
      view.current = { W, H, dpr }
      const small = window.matchMedia(MQ).matches
      // HP/portrait: botol sedikit digeser ke kiri supaya ada ruang untuk semprotan di kanan
      const anchor = small ? 0.46 : 0.5
      // konten terlihat setinggi ~600 unit (lampu -> alas); boleh >1 supaya botol lebih besar
      let s = Math.min(1.6, small ? (W * 0.88) / 360 : (W * 0.5) / 360, (H * 0.84) / 600)
      // alas selebar 300 unit (setengahnya 150) tidak boleh keluar dari tepi layar kiri/kanan
      const halfPedestal = 150
      const margin = 14
      s = Math.min(s, (W * Math.min(anchor, 1 - anchor) - margin) / halfPedestal)
      displayRef.current.style.setProperty('--ds', s.toFixed(4))
      displayRef.current.style.setProperty('--ax', `${anchor * 100}%`)
    }
    getSprite() // siapkan sprite sebelum animasi mulai
    onResize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  /* ---- loop utama: kamera virtual + render partikel ---- */
  const loop = useCallback(
    function tick(now) {
      const sm = sim.current
      if (!sm) return
      const { W, H, dpr } = view.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const dt = clamp((now - sm.last) / 1000, 0.001, 0.05)
      sm.last = now
      const t = (now - sm.t0) / 1000

      sm.ema = sm.ema * 0.95 + dt * 0.05
      sm.frames++

      const { cam, axis, spray: sp, tmp } = sm

      // posisi target (dunia)
      particlePos(sp, 0, t, axis, tmp)
      const tpx = tmp.x
      const tpy = tmp.y

      /* --- KAMERA --- */
      // zoom mulai pelan sejak spray menyebar (T_TRACK), tanpa menggeser botol
      const lnEnd = Math.log((0.62 * Math.hypot(W, H)) / TARGET_R)
      const u = clamp((t - T_TRACK) / (T_LOGIN - T_TRACK), 0, 1)
      // dorongan awal kecil supaya zoom langsung terasa saat ditekan, lalu makin cepat
      const targetLn = lnEnd * 0.96 * Math.pow(u, 1.4) + 0.35 * smooth(0, 0.5, t)
      sm.lnZ = targetLn // murni fungsi waktu: tidak ada 'mengejar' yang ikut goyang saat frame tidak rata
      const z = Math.exp(sm.lnZ)

      // Pivot kamera: awalnya zoom berpusat di nozzle (nozzle tetap menempel di
      // posisi layarnya, botol tidak perlu bergeser), lalu pivot berpindah halus
      // ke droplet target. w = 0 -> pivot nozzle, w = 1 -> terkunci di target.
      const wr = smooth(0.4, 2.2, t)
      const w = wr * wr * (3 - 2 * wr)
      cam.x = (1 - w) * (cam.x0 / z) + w * tpx
      cam.y = (1 - w) * (cam.y0 / z) + w * tpy
      sm.prevX = tpx
      sm.prevY = tpy

      /* --- layer botol: memakai KAMERA YANG SAMA dengan partikel ---
         titik layar = tengah + (dunia - kamera) * zoom, jadi botol dan partikel
         selalu konsisten; yang bergerak mendekat adalah kamera, bukan objeknya. */
      const room = roomRef.current
      const rf = 1 - smooth(0.35, 0.85, w)
      if (rf > 0.01) {
        const tx = W / 2 - (sm.ox + cam.x) * z
        const ty = H / 2 - (sm.oy + cam.y) * z
        camLayerRef.current.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${z.toFixed(4)})`
        room.style.visibility = ''
      } else {
        room.style.visibility = 'hidden'
      }
      room.style.opacity = rf.toFixed(3)
      tintRef.current.style.opacity = (0.85 * smooth(0.2, 3.5, sm.lnZ)).toFixed(3)
      overlayRef.current.style.opacity = smooth(T_FADE, T_LOGIN, t).toFixed(3)

      /* --- transisi scene --- */
      if (t >= T_LOGIN) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, W, H)
        overlayRef.current.style.opacity = '1'
        room.style.opacity = '0'
        go('login')
        return
      }
      if (t >= T_ZOOM && sceneRef.current !== 'zooming') go('zooming')
      else if (t >= T_TRACK && sceneRef.current === 'spraying') go('tracking')

      /* --- RENDER --- */
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H) // canvas tetap transparan
      const cx = W / 2
      const cy = H / 2
      const focus = 1 - 0.97 * smooth(5, 45, z) // partikel lain memudar saat fokus ke target

      // kilatan kecil di nozzle
      if (t < 0.7 && focus > 0.5) {
        const fa = Math.pow(1 - t / 0.7, 2)
        const ox = cx + (0 - cam.x) * z
        const oy = cy + (0 - cam.y) * z
        const gr = ctx.createRadialGradient(ox, oy, 0, ox, oy, 26 * z)
        gr.addColorStop(0, `rgba(255,232,240,${0.55 * fa})`)
        gr.addColorStop(1, 'rgba(255,232,240,0)')
        ctx.fillStyle = gr
        ctx.beginPath()
        ctx.arc(ox, oy, 26 * z, 0, TAU)
        ctx.fill()
      }

      if (focus > 0.01) {
        const sprite = getSprite()
        const stride = 1 // jangan lompati partikel: bikin kedip/patah

        // pass 1: fine mist (haze + mist) — sprite lembut
        for (let i = 1; i < sp.m1; i += stride) {
          const age = t - sp.s[i]
          if (age <= 0) continue
          const life = sp.life[i]
          let al = sp.alpha[i] * Math.min(1, age / 0.25)
          if (age > life - 1.6) al *= 1 - smooth(life - 1.6, life, age)
          al *= focus
          if (al < 0.004) continue
          particlePos(sp, i, t, axis, tmp)
          const sx = cx + (tmp.x - cam.x) * z
          const sy = cy + (tmp.y - cam.y) * z
          const ds = sp.size[i] * z
          if (ds > W * 2.2) continue
          if (sx < -ds || sx > W + ds || sy < -ds || sy > H + ds) continue
          ctx.globalAlpha = al
          ctx.drawImage(sprite, sx - ds / 2, sy - ds / 2, ds, ds)
        }

        // pass 2: droplet
        ctx.fillStyle = '#ffe4ec'
        for (let i = sp.m1; i < sp.n; i++) {
          const age = t - sp.s[i]
          if (age <= 0) continue
          const life = sp.life[i]
          let al = sp.alpha[i] * Math.min(1, age / 0.15)
          if (age > life - 1.6) al *= 1 - smooth(life - 1.6, life, age)
          al *= focus
          if (al < 0.01) continue
          particlePos(sp, i, t, axis, tmp)
          const sx = cx + (tmp.x - cam.x) * z
          const sy = cy + (tmp.y - cam.y) * z
          const ds = sp.size[i] * z
          if (sx < -ds - 12 || sx > W + ds + 12 || sy < -ds - 12 || sy > H + ds + 12) continue
          const kind = sp.kind[i]

          if (kind === 0) {
            const eff = ds < 0.95 ? 0.95 : ds
            ctx.globalAlpha = al * (ds < 0.95 ? 0.55 + (0.45 * ds) / 0.95 : 1)
            if (eff < 2.4) {
              ctx.fillRect(sx - eff / 2, sy - eff / 2, eff, eff)
            } else {
              ctx.beginPath()
              ctx.arc(sx, sy, eff / 2, 0, TAU)
              ctx.fill()
            }
          } else if (kind === 1) {
            ctx.globalAlpha = al
            ctx.beginPath()
            ctx.arc(sx, sy, Math.max(ds / 2, 0.6), 0, TAU)
            ctx.fill()
            if (ds > 3) {
              ctx.globalAlpha = al * 0.8
              ctx.fillStyle = '#ffffff'
              ctx.beginPath()
              ctx.arc(sx - ds * 0.18, sy - ds * 0.2, ds * 0.14, 0, TAU)
              ctx.fill()
              ctx.fillStyle = '#ffe4ec'
            }
          } else {
            // streak tipis, pendek, searah semprotan
            const spd = (sp.D[i] / sp.tau[i]) * Math.exp(-age / sp.tau[i])
            const L = Math.min(10, spd * 0.011) * z
            if (L < 1.2) continue
            ctx.globalAlpha = al
            ctx.strokeStyle = '#ffe4ec'
            ctx.lineWidth = Math.max(0.6, ds * 0.6)
            ctx.lineCap = 'round'
            ctx.beginPath()
            ctx.moveTo(sx, sy)
            ctx.lineTo(sx - axis.cx * L, sy - axis.sy * L)
            ctx.stroke()
          }
        }
      }

      // target digambar terakhir — ukurannya HANYA berasal dari zoom kamera
      if (t >= sp.s[0]) {
        ctx.globalAlpha = 1
        const sx = cx + (tpx - cam.x) * z
        const sy = cy + (tpy - cam.y) * z
        drawTarget(ctx, sx, sy, TARGET_R * z)
      }
      ctx.globalAlpha = 1

      rafRef.current = requestAnimationFrame(tick)
    },
    [go],
  )

  /* ---- mulai spray ---- */
  const startSpray = useCallback(() => {
    if (startedRef.current) return
    startedRef.current = true

    setPressed(true) // dikembalikan lagi oleh useEffect di bawah

    const { W, H } = view.current
    const small = window.matchMedia(MQ).matches
    const r = nozzleRef.current.getBoundingClientRect()
    const ox = r.left + r.width / 2
    const oy = r.top + r.height / 2

    const phi = small ? -0.42 : -0.12 // arah semprotan (ke kanan, sedikit ke atas)
    const Lx = (W - ox - 18) / Math.cos(phi)
    const Ly = phi < 0 ? (oy - 24) / -Math.sin(phi) : 1e9
    const S = clamp(Math.min(Lx, Ly) / 640, 0.32, 1.15)

    const x0 = W / 2 - ox // kamera awal: nozzle tepat di posisi layarnya
    const y0 = H / 2 - oy

    sim.current = {
      spray: createSpray({ S, small: W < 600, seed: 1971 }),
      axis: { cx: Math.cos(phi), sy: Math.sin(phi), px: -Math.sin(phi), py: Math.cos(phi) },
      cam: { x: x0, y: y0, x0, y0 },
      ox,
      oy,
      lnZ: 0,
      prevX: 0,
      prevY: 0,
      tmp: { x: 0, y: 0 },
      t0: performance.now(),
      last: performance.now(),
      ema: 0.016,
      frames: 0,
    }
    go('spraying')
    rafRef.current = requestAnimationFrame(loop)
  }, [go, loop])

  return (
    <div className="app" data-scene={scene}>
      <div className="stage-base" />
      <div className="tint" ref={tintRef} />

      <div className="room" ref={roomRef}>
        <div className="room-bg" />
        <div className="brand">ANGÉLY PARFUMS</div>

        <div className="cam-layer" ref={camLayerRef}>
          <PerfumeDisplay displayRef={displayRef} tipRef={nozzleRef} pressed={pressed} onSpray={startSpray} />
        </div>
      </div>

      <canvas ref={canvasRef} className="fx" />
      <div className="enter" ref={overlayRef} />

      {scene === 'login' && <LoginPage />}
    </div>
  )
}
