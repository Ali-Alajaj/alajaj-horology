import { useEffect, useMemo, useRef } from 'react';
import { formatGregorian, formatHijri, hijriParts, moonPhase, moonSvgPath } from '../lib/calendar';
import { gsap, ScrollTrigger, reducedMotion } from '../lib/scroll';
import { useReveal } from '../lib/reveal';
import Media from '../components/Media';

const C = 200; // centre of the 400 × 400 drawing
const polar = (r: number, a: number) => [C + Math.cos(a) * r, C + Math.sin(a) * r] as const;
const dayAngle = (d: number) => -Math.PI / 2 + (d / 30) * Math.PI * 2;

/** Brand concept: Hijri day ring + moon phase, shown with today's real values. */
export default function Complication() {
  const root = useRef<HTMLElement>(null);
  const pointer = useRef<SVGGElement>(null);
  const ring = useRef<SVGGElement>(null);
  useReveal(root);

  const now = useMemo(() => new Date(), []);
  const hijri = useMemo(() => hijriParts(now), [now]);
  const phase = useMemo(() => moonPhase(now), [now]);
  const stars = useMemo(() => {
    let s = 17;
    const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0), s / 4294967296);
    return Array.from({ length: 26 }, () => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 62;
      return { x: C + Math.cos(a) * d, y: C + Math.sin(a) * d, r: 0.5 + r() * 0.9, o: 0.3 + r() * 0.6 };
    });
  }, []);

  useEffect(() => {
    const target = (hijri.day / 30) * 360;
    if (reducedMotion() || !pointer.current || !ring.current) {
      pointer.current?.setAttribute('transform', `rotate(${target} ${C} ${C})`);
      return;
    }
    const state = { a: 0, r: -40 };
    const draw = () => {
      pointer.current?.setAttribute('transform', `rotate(${state.a} ${C} ${C})`);
      ring.current?.setAttribute('transform', `rotate(${state.r} ${C} ${C})`);
    };
    draw();
    const tw = gsap.to(state, {
      a: target,
      r: 0,
      ease: 'power2.out',
      onUpdate: draw,
      scrollTrigger: { trigger: root.current, start: 'top 75%', end: 'top 12%', scrub: 0.8 },
    });
    return () => {
      tw.scrollTrigger?.kill();
      tw.kill();
    };
  }, [hijri.day]);

  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="comp section" id="complication" ref={root} aria-labelledby="comp-title">
      <Media name="complication-night.webp" alt="" tone="night" className="comp__bg media--bare" />
      <div className="wrap comp__grid">
        <div className="comp__copy">
          <h2 className="h-section" id="comp-title" data-reveal>
            تقويمان <em>في نافذة واحدة</em>
          </h2>
          <p className="lead" data-reveal>
            نعمل في الدار على تعقيدة تجمع يوم الشهر الهجري بطور القمر في نافذة واحدة عند الساعة السادسة،
            ويقابلها التاريخ الميلادي. ما تراه هنا رسمٌ للفكرة بقيم اليوم الحقيقية، لا منتجٌ مطروح.
          </p>
          <dl className="comp__read" data-reveal>
            <div>
              <dt>التاريخ الهجري</dt>
              <dd>{formatHijri(now)}</dd>
            </div>
            <div>
              <dt>التاريخ الميلادي</dt>
              <dd>{formatGregorian(now)}</dd>
            </div>
            <div>
              <dt>طور القمر الليلة</dt>
              <dd>
                {phase.name} · <span className="num">{Math.round(phase.illumination * 100)}%</span>
              </dd>
            </div>
          </dl>
          <ol className="comp__how" data-reveal>
            <li>
              <span className="num">01</span>الحلقة الخارجية تحمل أيام الشهر الهجري الثلاثين، ويشير المثلث الذهبي إلى اليوم.
            </li>
            <li>
              <span className="num">02</span>النافذة الوسطى تعرض القمر كما يظهر في السماء الليلة.
            </li>
          </ol>
        </div>

        <div className="comp__visual" data-reveal>
          <svg viewBox="0 0 400 400" role="img" aria-label={`نافذة التقويم: اليوم ${hijri.day} من ${hijri.monthName}، القمر ${phase.name}`}>
            <defs>
              <radialGradient id="cg-face" cx="50%" cy="42%" r="62%">
                <stop offset="0" stopColor="#17352b" />
                <stop offset="1" stopColor="#081511" />
              </radialGradient>
              <linearGradient id="cg-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffd08a" />
                <stop offset="0.5" stopColor="#c97a1e" />
                <stop offset="1" stopColor="#f7ac48" />
              </linearGradient>
              <radialGradient id="cg-sky" cx="50%" cy="35%" r="75%">
                <stop offset="0" stopColor="#14284d" />
                <stop offset="1" stopColor="#050a16" />
              </radialGradient>
              <clipPath id="cg-clip">
                <circle cx={C} cy={C} r="66" />
              </clipPath>
            </defs>
            <circle cx={C} cy={C} r="192" fill="none" stroke="url(#cg-gold)" strokeWidth="2.2" />
            <circle cx={C} cy={C} r="186" fill="url(#cg-face)" />
            {Array.from({ length: 22 }, (_, i) => (
              <circle key={i} cx={C} cy={C} r={84 + i * 4.6} fill="none" stroke="#f3ede0" strokeOpacity="0.045" />
            ))}
            <g ref={ring}>
              {Array.from({ length: 30 }, (_, i) => {
                const d = i + 1;
                const a = dayAngle(d);
                const major = d % 5 === 0;
                const [x1, y1] = polar(major ? 163 : 168, a);
                const [x2, y2] = polar(176, a);
                const [tx, ty] = polar(146, a);
                return (
                  <g key={d}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? '#f7ac48' : '#f3ede0'} strokeOpacity={major ? 1 : 0.5} strokeWidth={major ? 1.6 : 0.9} />
                    {(major || d === 1) && (
                      <text x={tx} y={ty} className="comp__num" textAnchor="middle" dominantBaseline="central">
                        {d}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
            <g ref={pointer}>
              <path d={`M${C} ${C - 132} l7 -17 h-14 z`} fill="url(#cg-gold)" />
              <line x1={C} y1={C - 82} x2={C} y2={C - 128} stroke="#f7ac48" strokeWidth="0.8" strokeOpacity="0.7" />
            </g>
            {/* moon aperture */}
            <circle cx={C} cy={C} r="70" fill="none" stroke="url(#cg-gold)" strokeWidth="2" />
            <circle cx={C} cy={C} r="66" fill="url(#cg-sky)" />
            <g clipPath="url(#cg-clip)">
              {stars.map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#efe2c2" opacity={s.o} />
              ))}
              <circle cx={C} cy={C} r="40" fill="#f7ac48" opacity="0.14" />
              <path d={moonSvgPath(40, phase.fraction)} transform={`translate(${C} ${C})${phase.fraction > 0.5 ? ' scale(-1 1)' : ''}`} fill="#ffc978" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
