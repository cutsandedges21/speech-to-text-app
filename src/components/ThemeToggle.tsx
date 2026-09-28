import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore, type MouseEvent } from 'react'
import { getTheme, subscribe, toggleTheme } from '../theme/themeStore'
import { prefersReducedMotion, willUseViewTransition } from '../theme/themeTransition'

/**
 * The sun/moon switch, ported from the student-notes app. One spring drives
 * everything: the rays spin and retract, the disc grows, and a second circle
 * slides across it to cut the crescent. Driven from JS because the crescent is
 * two moving circles, not a property CSS can transition. The loop stops as
 * soon as the spring settles.
 */

const STIFFNESS = 210
const DAMPING = 21
const REST = 0.0005
/** Clamp for a frame after a stall, so the spring can't fly off. */
const MAX_STEP = 1 / 30

// Warm ochre sun, pale moonlight: both sit well on paper and on the dark page.
const SUN = { r: 214, g: 140, b: 32 }
const MOON = { r: 196, g: 206, b: 232 }

const RAY_COUNT = 8
const CENTRE = 12

interface Spring {
  value: number
  velocity: number
  target: number
}

function stepSpring(s: Spring, dt: number): boolean {
  const acceleration = -STIFFNESS * (s.value - s.target) - DAMPING * s.velocity
  s.velocity += acceleration * dt
  s.value += s.velocity * dt
  const settled = Math.abs(s.value - s.target) < REST && Math.abs(s.velocity) < REST
  if (settled) {
    s.value = s.target
    s.velocity = 0
  }
  return settled
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeOut = (t: number) => 1 - (1 - t) * (1 - t)

function mixColour(t: number): string {
  const c = clamp01(t)
  return `rgb(${Math.round(lerp(SUN.r, MOON.r, c))} ${Math.round(lerp(SUN.g, MOON.g, c))} ${Math.round(lerp(SUN.b, MOON.b, c))})`
}

/** A four-point sparkle at unit size. */
const SPARKLE = 'M 0 -1 Q 0.16 -0.16 1 0 Q 0.16 0.16 0 1 Q -0.16 0.16 -1 0 Q -0.16 -0.16 0 -1 Z'

// Unrelated phases so the three stars never pulse in step.
const STARS = [
  { x: 4.6, y: 5.4, scale: 1.15, delay: 0.0, phase: 0.0 },
  { x: 19.2, y: 7.4, scale: 0.8, delay: 0.12, phase: 2.1 },
  { x: 18.1, y: 17.9, scale: 1.0, delay: 0.24, phase: 4.0 },
]

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getTheme) === 'dark'

  const discRef = useRef<SVGCircleElement>(null)
  const biteRef = useRef<SVGCircleElement>(null)
  const haloRef = useRef<SVGCircleElement>(null)
  const rippleRef = useRef<SVGCircleElement>(null)
  const raysRef = useRef<SVGGElement>(null)
  const rayRefs = useRef<(SVGLineElement | null)[]>([])
  const starRefs = useRef<(SVGPathElement | null)[]>([])

  // Refs, not state: this writes attributes every frame.
  const flip = useRef<Spring>({ value: isDark ? 1 : 0, velocity: 0, target: isDark ? 1 : 0 })
  const press = useRef<Spring>({ value: 0, velocity: 0, target: 0 })
  const ripple = useRef(0)
  const twinkle = useRef(0)
  const frame = useRef<number | null>(null)
  const lastTime = useRef(0)

  /** Draws one frame. Everything derives from p (0 = sun, 1 = moon). */
  const paint = useCallback(() => {
    const p = flip.current.value
    const squash = press.current.value
    const colour = mixColour(p)

    // Rays are gone before the crescent finishes, or the moon would be spiky for a few frames.
    const rayFade = clamp01(1 - p * 1.62)
    const rays = raysRef.current
    if (rays) {
      rays.setAttribute('transform', `rotate(${(p * 205).toFixed(2)} ${CENTRE} ${CENTRE})`)
      rays.setAttribute('opacity', rayFade.toFixed(3))
      rays.setAttribute('stroke', colour)
    }

    // Rays shorten into the disc as they fade, so they read as drawn in, not switched off.
    const inner = lerp(7.4, 5.6, 1 - rayFade)
    const outer = lerp(10.1, 6.0, 1 - rayFade)
    for (let i = 0; i < RAY_COUNT; i += 1) {
      const line = rayRefs.current[i]
      if (!line) continue
      const angle = (i * (360 / RAY_COUNT) * Math.PI) / 180
      const sin = Math.sin(angle)
      const cos = Math.cos(angle)
      line.setAttribute('x1', (CENTRE + sin * inner).toFixed(2))
      line.setAttribute('y1', (CENTRE - cos * inner).toFixed(2))
      line.setAttribute('x2', (CENTRE + sin * outer).toFixed(2))
      line.setAttribute('y2', (CENTRE - cos * outer).toFixed(2))
    }

    const disc = discRef.current
    if (disc) {
      const scale = 1 - squash * 0.12
      disc.setAttribute('r', lerp(5.0, 6.45, clamp01(p)).toFixed(3))
      disc.setAttribute('fill', colour)
      disc.setAttribute('transform', `translate(${CENTRE} ${CENTRE}) scale(${scale.toFixed(4)}) translate(${-CENTRE} ${-CENTRE})`)
    }

    // The crescent: a cutter circle slides in from the upper right and eats the disc.
    const bite = biteRef.current
    if (bite) {
      const t = easeOut(clamp01((p - 0.18) / 0.82))
      bite.setAttribute('cx', lerp(30, 16.4, t).toFixed(2))
      bite.setAttribute('cy', lerp(-4, 7.9, t).toFixed(2))
      bite.setAttribute('r', lerp(7.4, 5.75, t).toFixed(2))
    }

    const halo = haloRef.current
    if (halo) {
      halo.setAttribute('r', lerp(8.6, 10.4, p).toFixed(2))
      halo.setAttribute('opacity', (lerp(0.26, 0.13, p) * (1 - squash * 0.5)).toFixed(3))
      halo.setAttribute('fill', colour)
    }

    const ring = rippleRef.current
    if (ring) {
      const r = ripple.current
      ring.setAttribute('r', lerp(6.5, 15.5, 1 - r).toFixed(2))
      ring.setAttribute('opacity', (r * 0.5).toFixed(3))
      ring.setAttribute('stroke', colour)
    }

    for (let i = 0; i < STARS.length; i += 1) {
      const node = starRefs.current[i]
      const star = STARS[i]
      if (!node) continue
      const entry = easeOut(clamp01((p - 0.52 - star.delay) / (0.48 - star.delay)))
      const pulse = 1 + Math.sin(twinkle.current * 3.1 + star.phase) * 0.18 * entry
      node.setAttribute(
        'transform',
        `translate(${star.x} ${star.y}) rotate(${(entry * 90 - 90).toFixed(1)}) scale(${(star.scale * entry * pulse).toFixed(3)})`,
      )
      node.setAttribute('opacity', entry.toFixed(3))
      node.setAttribute('fill', colour)
    }
  }, [])

  const ensureRunning = useCallback(() => {
    if (frame.current !== null) return
    lastTime.current = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - lastTime.current) / 1000, MAX_STEP)
      lastTime.current = now
      const flipSettled = stepSpring(flip.current, dt)
      const pressSettled = stepSpring(press.current, dt)
      ripple.current = Math.max(0, ripple.current - dt * 1.9)
      twinkle.current += dt
      // The stars twinkle for a beat after the moon lands, then the icon goes still.
      const twinkling = flip.current.target === 1 && twinkle.current < 2.6
      paint()
      if (flipSettled && pressSettled && ripple.current === 0 && !twinkling) {
        frame.current = null
        return
      }
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }, [paint])

  // Layout effect: during a sweep the store flushes React synchronously and the
  // "after" snapshot must already show the new icon.
  useLayoutEffect(() => {
    const target = isDark ? 1 : 0
    if (flip.current.target === target) return
    flip.current.target = target
    twinkle.current = 0
    // Snap during a sweep (a spring would be photographed mid-flight) or with reduced motion.
    if (prefersReducedMotion() || willUseViewTransition()) {
      flip.current.value = target
      flip.current.velocity = 0
      ripple.current = 0
      paint()
      return
    }
    ripple.current = 1
    ensureRunning()
  }, [isDark, ensureRunning, paint])

  useEffect(() => {
    paint()
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
    }
  }, [paint])

  const setPress = (down: boolean) => {
    if (prefersReducedMotion()) return
    press.current.target = down ? 1 : 0
    ensureRunning()
  }

  // The new theme sweeps out from the centre of this button.
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    toggleTheme({ x: box.left + box.width / 2, y: box.top + box.height / 2 })
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="icon-btn theme-toggle"
      onClick={onClick}
      onPointerDown={() => setPress(true)}
      onPointerUp={() => setPress(false)}
      onPointerLeave={() => setPress(false)}
      onPointerCancel={() => setPress(false)}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ overflow: 'visible' }}>
        <defs>
          <mask id="theme-toggle-crescent">
            <rect x="-6" y="-6" width="36" height="36" fill="black" />
            <circle cx={CENTRE} cy={CENTRE} r="11" fill="white" />
            <circle ref={biteRef} cx="30" cy="-4" r="7.4" fill="black" />
          </mask>
        </defs>
        <circle ref={haloRef} cx={CENTRE} cy={CENTRE} r="8.6" opacity="0.26" />
        <circle ref={rippleRef} cx={CENTRE} cy={CENTRE} r="6.5" fill="none" strokeWidth="1.4" opacity="0" />
        <g ref={raysRef} strokeWidth="1.9" strokeLinecap="round">
          {Array.from({ length: RAY_COUNT }, (_, i) => (
            <line
              key={i}
              ref={(node) => {
                rayRefs.current[i] = node
              }}
            />
          ))}
        </g>
        <circle ref={discRef} cx={CENTRE} cy={CENTRE} r="5" mask="url(#theme-toggle-crescent)" />
        {STARS.map((star, i) => (
          <path
            key={i}
            ref={(node) => {
              starRefs.current[i] = node
            }}
            d={SPARKLE}
            opacity="0"
            transform={`translate(${star.x} ${star.y}) scale(0)`}
          />
        ))}
      </svg>
    </button>
  )
}
