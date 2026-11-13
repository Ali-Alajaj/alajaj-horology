import { useEffect, useRef, useState } from 'react';
import { CRAFT } from '../data';
import { ScrollTrigger } from '../lib/scroll';
import { useReveal } from '../lib/reveal';
import Media from '../components/Media';

/** Five steps; the framed picture on the side changes with the step you are reading. */
export default function Craft() {
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);
  useReveal(root);

  useEffect(() => {
    const ol = list.current!;
    const steps = Array.from(ol.children) as HTMLElement[];
    const triggers = steps.map((step, i) =>
      ScrollTrigger.create({
        trigger: step,
        start: 'top 58%',
        end: 'bottom 58%',
        onToggle: (self) => self.isActive && setActive(i),
      }),
    );
    const progress = ScrollTrigger.create({
      trigger: ol,
      start: 'top 58%',
      end: 'bottom 58%',
      onUpdate: (self) => {
        if (line.current) line.current.style.blockSize = `${self.progress * 100}%`;
      },
    });
    return () => {
      triggers.forEach((t) => t.kill());
      progress.kill();
    };
  }, []);

  return (
    <section className="craft section" id="craft" ref={root} aria-labelledby="craft-title">
      <div className="wrap">
        <header className="craft__head">
          <h2 className="h-section" id="craft-title" data-reveal>
            خمس مراحل، <em>ويدٌ واحدة</em>
          </h2>
        </header>

        <div className="craft__grid">
          <div className="craft__frame" aria-hidden="true">
            <div className="craft__stack">
              {CRAFT.map((step, i) => (
                <Media
                  key={step.image}
                  name={step.image}
                  video={i === 2 ? 'craft-loop.mp4' : undefined}
                  alt=""
                  tone={step.tone}
                  className={`craft__img${active === i ? ' is-on' : ''}`}
                />
              ))}
              <span className="craft__count">
                <span className="num">
                  {String(active + 1).padStart(2, '0')} <i>/</i> {String(CRAFT.length).padStart(2, '0')}
                </span>
              </span>
            </div>
          </div>

          <div className="craft__steps">
            <span className="craft__rail" aria-hidden="true">
              <span ref={line} />
            </span>
            <ol ref={list}>
              {CRAFT.map((step, i) => (
                <li key={step.title} className={`step${active === i ? ' is-on' : ''}`}>
                  <span className="step__num">
                    <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  </span>
                  <div className="step__body">
                    <Media name={step.image} alt={`مرحلة ${step.title}`} tone={step.tone} className="step__img" />
                    <h3 className="step__title">{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
