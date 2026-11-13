import { useEffect, useRef, useState } from 'react';
import { gsap, reducedMotion } from '../lib/scroll';
import { fontsReady } from '../lib/fonts';
import { useStore } from '../store';

const R = 46;
const C = 2 * Math.PI * R;

/** Thin gold circle draws itself while the hands sweep, then the curtain opens. */
export default function Preloader({ onFonts }: { onFonts(): void }) {
  const root = useRef<HTMLDivElement>(null);
  const circle = useRef<SVGCircleElement>(null);
  const hour = useRef<SVGLineElement>(null);
  const minute = useRef<SVGLineElement>(null);
  const [gone, setGone] = useState(false);
  const setReady = useStore((s) => s.setReady);

  useEffect(() => {
    let cancelled = false;
    const still = reducedMotion();
    const state = { p: 0 };
    const draw = () => {
      if (circle.current) circle.current.style.strokeDashoffset = String(C * (1 - state.p));
      if (hour.current) hour.current.setAttribute('transform', `rotate(${state.p * 300} 60 60)`);
      if (minute.current) minute.current.setAttribute('transform', `rotate(${state.p * 720} 60 60)`);
    };
    draw();
    const finish = () => {
      if (cancelled) return;
      setReady();
      if (still) {
        setGone(true);
        return;
      }
      gsap
        .timeline({ onComplete: () => setGone(true) })
        .to(root.current!.querySelector('.pre__inner'), { opacity: 0, scale: 0.94, duration: 0.5, ease: 'power2.in' })
        .to(root.current!.querySelector('.pre__half--a'), { yPercent: -101, duration: 1.2, ease: 'expo.inOut' }, '-=0.25')
        .to(root.current!.querySelector('.pre__half--b'), { yPercent: 101, duration: 1.2, ease: 'expo.inOut' }, '<');
    };
    // progress runs to 80% on a timer and completes when the fonts are in
    const tw = gsap.to(state, { p: 0.8, duration: still ? 0.01 : 1.1, ease: 'power2.inOut', onUpdate: draw });
    fontsReady().then(() => {
      if (cancelled) return;
      onFonts();
      tw.then(() => {
        gsap.to(state, {
          p: 1,
          duration: still ? 0.01 : 0.6,
          ease: 'power3.inOut',
          onUpdate: draw,
          onComplete: () => {
            // open once the hero scene has compiled its shaders (or after a short grace period)
            const started = performance.now();
            const wait = () => {
              if (cancelled) return;
              if (useStore.getState().stageReady || !/^(#\/?)?$/.test(window.location.hash) || performance.now() - started > 900) setTimeout(finish, still ? 0 : 150);
              else setTimeout(wait, 60);
            };
            wait();
          },
        });
      });
    });
    return () => {
      cancelled = true;
      tw.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gone) return null;
  return (
    <div className="pre" ref={root} role="status" aria-label="ALAJAJ HOROLOGY — جارٍ التحميل">
      <div className="pre__half pre__half--a" />
      <div className="pre__half pre__half--b" />
      <div className="pre__inner">
        <p className="pre__title" dir="ltr" lang="en">
          <span className="pre__glow" aria-hidden="true" />
          <span className="pre__hollow">ALAJAJ</span> <span className="pre__solid">
            H{/* the clock stands in for the first O */}
            <svg viewBox="0 0 120 120" className="pre__dial pre__dial--o" aria-hidden="true">
              <circle cx="60" cy="60" r={R} className="pre__track" />
              <circle
                cx="60"
                cy="60"
                r={R}
                className="pre__ring"
                ref={circle}
                strokeDasharray={C}
                strokeDashoffset={C}
                transform="rotate(-90 60 60)"
              />
              <line x1="60" y1="60" x2="60" y2="36" className="pre__hand" ref={hour} />
              <line x1="60" y1="60" x2="60" y2="24" className="pre__hand pre__hand--min" ref={minute} />
              <circle cx="60" cy="60" r="2" className="pre__hub" />
            </svg>
            ROLOGY
          </span>
        </p>
      </div>
    </div>
  );
}
