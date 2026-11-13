import { useRef, useState } from 'react';
import { FAQ } from '../data';
import { useReveal } from '../lib/reveal';

export default function Faq() {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(0);
  useReveal(root);
  return (
    <section className="faq section" id="faq" ref={root} aria-labelledby="faq-title">
      <div className="wrap faq__grid">
        <header className="faq__head">
          <h2 className="h-section" id="faq-title" data-reveal>
            أسئلة <em>تتكرّر</em>
          </h2>
          <p className="lead" data-reveal>
            ساعة ميكانيكية جيدة تعيش أطول من صاحبها إن أُحسنت العناية بها. هذه إجابات ما يُسأل عنه كثيرًا.
          </p>
        </header>
        <div className="faq__list" data-reveal>
          {FAQ.map((item, i) => {
            const on = open === i;
            return (
              <div className={`acc${on ? ' is-open' : ''}`} key={item.q}>
                <h3>
                  <button type="button" aria-expanded={on} aria-controls={`faq-${i}`} id={`faq-btn-${i}`} onClick={() => setOpen(on ? null : i)}>
                    <span className="acc__num num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="acc__q">{item.q}</span>
                    <span className="acc__icon" aria-hidden="true" />
                  </button>
                </h3>
                <div className="acc__panel" id={`faq-${i}`} role="region" aria-labelledby={`faq-btn-${i}`} inert={!on}>
                  <div>
                    <p>{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
