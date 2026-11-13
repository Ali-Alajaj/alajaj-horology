import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let locks = 0;

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Smooth scrolling synced with ScrollTrigger. Skipped under reduced motion. */
export function initScroll() {
  if (lenis || reducedMotion()) return () => undefined;
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.9, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(raf);
    lenis?.destroy();
    lenis = null;
  };
}

/** Lock / unlock page scroll while an overlay is open (reference counted). */
export function lockScroll(lock: boolean) {
  locks = Math.max(0, locks + (lock ? 1 : -1));
  const on = locks > 0;
  if (lenis) {
    if (on) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = on ? 'hidden' : '';
}

/** Jump to the top without animation (page changes). */
export function resetScroll() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  window.scrollTo(0, 0);
}

export function scrollToTarget(target: string | number | HTMLElement, offset = 0) {
  const el =
    typeof target === 'string' ? (document.getElementById(target) ?? document.querySelector<HTMLElement>(target)) : target;
  if (el === null) return;
  if (lenis) {
    lenis.scrollTo(el as HTMLElement | number, { offset, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  } else {
    const y = typeof el === 'number' ? el : (el as HTMLElement).getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top: y, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
}

export { gsap, ScrollTrigger };
