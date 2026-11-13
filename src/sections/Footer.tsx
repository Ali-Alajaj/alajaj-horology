import { useRef, useState, type FormEvent } from 'react';
import { NAV } from '../data';
import { navigate } from '../lib/router';
import { scrollToTarget } from '../lib/scroll';
import { useStore } from '../store';
import Media from '../components/Media';

export default function Footer() {
  const root = useRef<HTMLElement>(null);
  const subscribed = useStore((s) => s.newsletter);
  const subscribe = useStore((s) => s.subscribe);
  const toast = useStore((s) => s.toast);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('اكتب بريدًا إلكترونيًا صحيحًا.');
      return;
    }
    setError('');
    subscribe(email.trim());
    setEmail('');
    toast('أُضيف بريدك إلى القائمة');
  };

  const toFaq = () => {
    navigate('/');
    setTimeout(() => scrollToTarget('faq'), 450);
  };

  return (
    <footer className="foot" ref={root}>
      <Media name="footer-dunes.webp" alt="" tone="sand" className="foot__bg media--bare" />
      {/* the wordmark sits behind the links at low opacity */}
      <p className="foot__word" aria-hidden="true">
        العجاج
      </p>
      <div className="wrap">
        <div className="foot__top">
          <div className="foot__news">
            <h2 className="foot__title">النشرة الإخبارية</h2>
            <p>رسائل عن ساعات جديدة، عروض و خصومات، تحديثات قد تهمك</p>
            {subscribed ? (
              <p className="foot__ok" role="status">
                شكرًا لك. سُجّل <span dir="ltr">{subscribed}</span> على هذا الجهاز.
              </p>
            ) : (
              <form className="foot__form" onSubmit={submit} noValidate>
                <label className="sr-only" htmlFor="news-email">
                  البريد الإلكتروني
                </label>
                <input
                  id="news-email"
                  className="input"
                  type="email"
                  dir="ltr"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@domain.example"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                />
                <button type="submit" className="btn btn--gold">
                  اشترك في الرسائل
                </button>
                {error && <p className="error">{error}</p>}
              </form>
            )}
          </div>

          <nav className="foot__nav" aria-label="روابط التذييل">
            <h3>الصفحات</h3>
            <ul>
              {NAV.map((n) => (
                <li key={n.path}>
                  <a
                    href={`#${n.path}`}
                    className="foot__link"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(n.path);
                    }}
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="foot__nav">
            <h3>تواصل</h3>
            <ul>
              <li>
                <button type="button" className="foot__link" onClick={toFaq}>
                  الضمان والصيانة
                </button>
              </li>
              <li>
                <span dir="ltr" className="foot__plain">
                  concierge@alajaj.example
                </span>
              </li>
              <li>
                <span className="foot__plain">الرياض · جدة · الخبر · دبي · الدوحة · الكويت</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="foot__base">
          <p className="latin">ALAJAJ HOROLOGY</p>
          <p>
            © <span className="num">{new Date().getFullYear()}</span> العجاج للساعات
          </p>
        </div>
      </div>
    </footer>
  );
}
