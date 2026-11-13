import { useEffect, useState } from 'react';
import { NAV } from '../data';
import { lockScroll } from '../lib/scroll';
import { navigate, pathOf, type Route } from '../lib/router';
import { cartCount, useStore } from '../store';

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <a
      className="logo"
      href="#/"
      aria-label="العجاج للساعات — الصفحة الرئيسية"
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
        navigate('/');
      }}
    >
      <span className="logo__ar">العجاج</span>
      <span className="logo__rule" aria-hidden="true" />
      <span className="logo__en latin">ALAJAJ HOROLOGY</span>
    </a>
  );
}

export default function Header({ route }: { route: Route }) {
  const [scrolled, setScrolled] = useState(false);
  const count = useStore(cartCount);
  const openCart = useStore((s) => s.openCart);
  const menuOpen = useStore((s) => s.menuOpen);
  const openMenu = useStore((s) => s.openMenu);
  const current = pathOf(route);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    lockScroll(true);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && openMenu(false);
    window.addEventListener('keydown', key);
    return () => {
      lockScroll(false);
      window.removeEventListener('keydown', key);
    };
  }, [menuOpen, openMenu]);

  const go = (path: string) => {
    openMenu(false);
    navigate(path);
  };

  return (
    <>
      <header className={`header${scrolled || route !== 'home' ? ' is-scrolled' : ''}${menuOpen ? ' is-menu' : ''}`}>
        <div className="wrap header__row">
          <Logo onClick={() => openMenu(false)} />
          <nav className="header__nav" aria-label="التنقل الرئيسي">
            <ul>
              {NAV.map((item) => (
                <li key={item.path}>
                  <a
                    href={`#${item.path}`}
                    className={current === item.path ? 'is-current' : ''}
                    aria-current={current === item.path ? 'page' : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      go(item.path);
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="header__tools">
            <button type="button" className="cart-btn" onClick={() => openCart(true)} aria-label={`السلة، ${count} قطعة`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 8h14l-1.2 11H6.2L5 8z" />
                <path d="M9 8V6.5a3 3 0 016 0V8" />
              </svg>
              <span className="cart-btn__label">السلة</span>
              <span className={`cart-btn__count num${count ? ' has-items' : ''}`} key={count}>
                {count}
              </span>
            </button>
            <button
              type="button"
              className="menu-btn"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              onClick={() => openMenu(!menuOpen)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>
      <div className={`menu${menuOpen ? ' is-open' : ''}`} id="mobile-menu" aria-hidden={!menuOpen} inert={!menuOpen}>
        <nav aria-label="قائمة الجوال">
          <ul>
            {NAV.map((item, i) => (
              <li key={item.path} style={{ transitionDelay: `${0.08 + i * 0.05}s` }}>
                <a
                  href={`#${item.path}`}
                  aria-current={current === item.path ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    go(item.path);
                  }}
                >
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="menu__foot latin">ALAJAJ HOROLOGY</p>
      </div>
    </>
  );
}
