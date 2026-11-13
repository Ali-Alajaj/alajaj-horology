import { useEffect, useRef, useState } from 'react';
import Turntable from '../three/Turntable';
import { CASES, DIAL_OPTIONS, NUMERALS, PRICE, STRAPS, configSummary, formatPrice, priceFor } from '../data';
import { gsap, reducedMotion } from '../lib/scroll';
import { useReveal } from '../lib/reveal';
import { useStore } from '../store';
import Magnetic from '../components/Magnetic';

function Price({ value }: { value: number }) {
  const el = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  useEffect(() => {
    if (!el.current) return;
    if (reducedMotion()) {
      shown.current = value;
      el.current.textContent = formatPrice(value);
      return;
    }
    const state = { v: shown.current };
    const tw = gsap.to(state, {
      v: value,
      duration: 0.9,
      ease: 'power3.out',
      onUpdate: () => {
        shown.current = state.v;
        if (el.current) el.current.textContent = formatPrice(state.v);
      },
    });
    return () => {
      tw.kill();
    };
  }, [value]);
  return (
    <span className="cfg__price-value price" ref={el}>
      {formatPrice(value)}
    </span>
  );
}

const delta = (n: number) => (n ? `+ ${formatPrice(n)}` : 'ضمن السعر');

export default function Configurator() {
  const root = useRef<HTMLElement>(null);
  const capture = useRef<(() => string) | null>(null);
  const config = useStore((s) => s.config);
  const setConfig = useStore((s) => s.setConfig);
  const addToCart = useStore((s) => s.addToCart);
  const openCart = useStore((s) => s.openCart);
  const [added, setAdded] = useState(false);
  useReveal(root);

  const price = priceFor(config);

  const add = () => {
    addToCart({
      id: `cfg-${config.caseFinish}-${config.dial}-${config.strap}-${config.numerals}`,
      name: 'Alajaj Meridian',
      detail: `${configSummary(config)} · ${NUMERALS.find((n) => n.id === config.numerals)!.label}`,
      price,
      thumb: capture.current?.() || undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2600);
  };

  return (
    <section className="cfg section" id="configurator" ref={root} aria-labelledby="cfg-title">
      <div className="wrap cfg__grid">
        <div className="cfg__stage">
          <span className="cfg__halo" aria-hidden="true" />
          <Turntable config={config} capture={capture} label="معاينة ثلاثية الأبعاد للساعة التي تصمّمها" className="cfg__canvas" />
          <p className="cfg__hint" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4" />
            </svg>
            اسحب لتدوير الساعة
          </p>
        </div>

        <div className="cfg__panel">
          <h2 className="h-section" id="cfg-title" data-reveal>
            صمّم <em>ساعتك</em>
          </h2>

          <fieldset className="opt" data-reveal>
            <legend>
              <span>العلبة</span>
              <b>{CASES.find((c) => c.id === config.caseFinish)!.label}</b>
            </legend>
            <div className="opt__row opt__row--cards">
              {CASES.map((c) => (
                <label key={c.id} className={`card-opt${config.caseFinish === c.id ? ' is-on' : ''}`}>
                  <input type="radio" name="case" checked={config.caseFinish === c.id} onChange={() => setConfig({ caseFinish: c.id })} />
                  <span className="card-opt__swatch" style={{ background: c.swatch }} />
                  <span className="card-opt__name">{c.label}</span>
                  <span className="card-opt__note">{c.note}</span>
                  <span className="card-opt__delta">{delta(PRICE.case[c.id])}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="opt" data-reveal>
            <legend>
              <span>لون الميناء</span>
              <b>{DIAL_OPTIONS.find((d) => d.id === config.dial)!.label}</b>
            </legend>
            <div className="opt__row">
              {DIAL_OPTIONS.map((d) => (
                <label key={d.id} className={`dot-opt${config.dial === d.id ? ' is-on' : ''}`} title={d.label}>
                  <input type="radio" name="dial" checked={config.dial === d.id} onChange={() => setConfig({ dial: d.id })} />
                  <span className="dot-opt__dot" style={{ background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${d.hex} 70%, #fff), ${d.hex} 62%)` }} />
                  <span className="sr-only">{d.label}</span>
                </label>
              ))}
              <div className="seg" role="presentation">
                {NUMERALS.map((n) => (
                  <label key={n.id} className={`seg__item${config.numerals === n.id ? ' is-on' : ''}`}>
                    <input type="radio" name="numerals" checked={config.numerals === n.id} onChange={() => setConfig({ numerals: n.id })} />
                    {n.label}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset className="opt" data-reveal>
            <legend>
              <span>السوار</span>
              <b>{STRAPS.find((s) => s.id === config.strap)!.label}</b>
            </legend>
            <div className="opt__row opt__row--cards">
              {STRAPS.map((s) => (
                <label key={s.id} className={`card-opt${config.strap === s.id ? ' is-on' : ''}`}>
                  <input type="radio" name="strap" checked={config.strap === s.id} onChange={() => setConfig({ strap: s.id })} />
                  <span className="card-opt__swatch" style={{ background: s.swatch }} />
                  <span className="card-opt__name">{s.label}</span>
                  <span className="card-opt__note">{s.note}</span>
                  <span className="card-opt__delta">{delta(PRICE.strap[s.id])}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="cfg__buy" data-reveal>
            <div className="cfg__price">
              <span className="label">السعر قبل الضريبة</span>
              <Price value={price} />
            </div>
            <Magnetic strength={0.16}>
              <button type="button" className="btn btn--gold" onClick={add}>
                {added ? 'أُضيفت إلى السلة' : 'أضف الساعة إلى السلة'}
              </button>
            </Magnetic>
            {added && (
              <button type="button" className="link" onClick={() => openCart(true)}>
                عرض السلة
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
