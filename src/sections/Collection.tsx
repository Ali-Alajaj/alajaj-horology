import { useEffect, useRef, useState } from 'react';
import { MODELS, configSummary, formatPrice, type Model } from '../data';
import { lockScroll } from '../lib/scroll';
import { useReveal } from '../lib/reveal';
import { renderSnapshots } from '../three/snapshot';
import Turntable, { thumbFrom } from '../three/Turntable';
import { useStore } from '../store';
import Media from '../components/Media';

function useSnapshots(root: React.RefObject<HTMLElement | null>) {
  const [shots, setShots] = useState<Record<string, string>>({});
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const run = () =>
          renderSnapshots(MODELS.map((m) => ({ id: m.id, config: m.config }))).then((r) => !cancelled && setShots(r));
        if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1200 });
        else setTimeout(run, 200);
      },
      { rootMargin: '1200px 0px' },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [root]);
  return shots;
}

function addModel(model: Model, shot: string | undefined, add: ReturnType<typeof useStore.getState>['addToCart']) {
  const finish = (thumb?: string) =>
    add({ id: `model-${model.id}`, name: model.name, detail: configSummary(model.config), price: model.price, thumb });
  if (!shot) return finish();
  const img = new Image();
  img.onload = () => finish(thumbFrom(img) || undefined);
  img.onerror = () => finish();
  img.src = shot;
}

function Specs({ model }: { model: Model }) {
  return (
    <dl className="specs">
      {model.specs.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Three watches as a plain card grid; specifications open on demand. */
export default function Collection() {
  const root = useRef<HTMLElement>(null);
  const shots = useSnapshots(root);
  const addToCart = useStore((s) => s.addToCart);
  const openQuickView = useStore((s) => s.openQuickView);
  const quickView = useStore((s) => s.quickView);
  const [open, setOpen] = useState<string | null>(null);
  useReveal(root);

  // an open specification sheet closes by itself once its card has scrolled out of view
  // (for example when the reader reaches the configurator below)
  useEffect(() => {
    if (!open) return;
    const onScroll = () => {
      const sheet = document.getElementById(`specs-${open}`);
      if (!sheet) return;
      const r = sheet.getBoundingClientRect();
      if (r.bottom < 80 || r.top > window.innerHeight) setOpen(null);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [open]);

  const model = MODELS.find((m) => m.id === quickView) ?? null;

  return (
    <section className="col section" id="collection" ref={root} aria-labelledby="col-title">
      <div className="wrap">
        <header className="col__head">
          <h2 className="h-section" id="col-title" data-reveal>
            مجموعة <em>العجاج</em>
          </h2>
          <p className="lead" data-reveal>
            ثلاث ساعات تتقاسم الحركة نفسها والطوق المخدَّد نفسه، وتختلف في المزاج: واحدة لكل يوم، وأخرى للطريق،
            وثالثة للمساء.
          </p>
        </header>

        <div className="col__grid">
          {MODELS.map((m) => {
            const on = open === m.id;
            return (
              <article className="mcard" key={m.id} aria-labelledby={`m-${m.id}`} data-reveal>
                <button
                  type="button"
                  className="mcard__visual"
                  onClick={() => openQuickView(m.id)}
                  aria-label={`معاينة ${m.name} ثلاثية الأبعاد`}
                >
                  <Media name={m.photo} alt="" tone={m.tone} className="mcard__photo" />
                  {shots[m.id] ? (
                    <img className="mcard__watch" src={shots[m.id]} alt={`ساعة ${m.name}`} decoding="async" />
                  ) : (
                    <span className="mcard__loading" aria-hidden="true" />
                  )}
                </button>
                <div className={`mcard__sheet${on ? ' is-open' : ''}`} id={`specs-${m.id}`} inert={!on}>
                  <Specs model={m} />
                </div>
                <div className="mcard__body">
                  <p className="mcard__tag">{m.tagline}</p>
                  <h3 className="mcard__name" id={`m-${m.id}`} lang="en" dir="ltr">
                    {m.name}
                  </h3>
                  <p className="mcard__desc">{m.desc}</p>
                  <div className={`mcard__specs${on ? ' is-open' : ''}`}>
                    <button
                      type="button"
                      className="mcard__toggle"
                      aria-expanded={on}
                      aria-controls={`specs-${m.id}`}
                      onClick={() => setOpen(on ? null : m.id)}
                    >
                      <span>المواصفات</span>
                      <span className="acc__icon" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mcard__foot">
                    <p className="mcard__price price">{formatPrice(m.price)}</p>
                    <button type="button" className="btn btn--gold" onClick={() => addModel(m, shots[m.id], addToCart)}>
                      أضف إلى السلة
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <QuickView model={model} shot={model ? shots[model.id] : undefined} />
    </section>
  );
}

function QuickView({ model, shot }: { model: Model | null; shot?: string }) {
  const close = useStore((s) => s.openQuickView);
  const addToCart = useStore((s) => s.addToCart);
  const card = useRef<HTMLDivElement>(null);
  const [last, setLast] = useState<Model | null>(model);
  const open = !!model;

  useEffect(() => {
    if (model) setLast(model);
  }, [model]);

  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => card.current?.querySelector<HTMLElement>('.modal__close')?.focus(), 60);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(null);
      if (e.key === 'Tab' && card.current) {
        const f = card.current.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      clearTimeout(t);
      lockScroll(false);
      window.removeEventListener('keydown', key);
      prev?.focus?.();
    };
  }, [open, close]);

  useEffect(() => () => close(null), [close]);

  const m = model ?? last;
  return (
    <>
      <div className={`scrim${open ? ' is-open' : ''}`} onClick={() => close(null)} aria-hidden="true" />
      <div className={`modal${open ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-hidden={!open} inert={!open} aria-label={m ? `معاينة ${m.name}` : 'معاينة'}>
        <div className="modal__card qv" ref={card}>
          <button type="button" className="icon-btn modal__close" onClick={() => close(null)} aria-label="إغلاق المعاينة">
            <svg viewBox="0 0 14 14">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
          {m && (
            <>
              <div className="qv__stage">
                <span className="cfg__halo" aria-hidden="true" />
                {open && <Turntable key={m.id} config={m.config} label={`ساعة ${m.name}`} className="qv__canvas" distance={13.2} />}
                <p className="cfg__hint" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4" />
                  </svg>
                  اسحب لتدوير الساعة
                </p>
              </div>
              <div className="qv__body">
                <p className="mcard__tag">{m.tagline}</p>
                <h3 className="mcard__name" lang="en" dir="ltr">
                  {m.name}
                </h3>
                <p className="mcard__desc">{m.desc}</p>
                <Specs model={m} />
                <div className="mcard__foot">
                  <p className="mcard__price price">{formatPrice(m.price)}</p>
                  <button
                    type="button"
                    className="btn btn--gold"
                    onClick={() => {
                      addModel(m, shot, addToCart);
                      close(null);
                    }}
                  >
                    أضف إلى السلة
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
