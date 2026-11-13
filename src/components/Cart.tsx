import { useEffect, useRef, type RefObject } from 'react';
import { VAT, formatPrice } from '../data';
import { navigate } from '../lib/router';
import { lockScroll } from '../lib/scroll';
import { cartCount, cartSubtotal, useStore } from '../store';

const CloseIcon = () => (
  <svg viewBox="0 0 14 14" aria-hidden="true">
    <path d="M1 1l12 12M13 1L1 13" />
  </svg>
);
export const WatchGlyph = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="9" />
    <path d="M16 11v5l3 2M12 7.5l1-5h6l1 5M12 24.5l1 5h6l1-5" />
  </svg>
);

/** Focus trap, Escape to close and scroll lock for an open overlay. */
function useOverlay(open: boolean, box: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => box.current?.querySelector<HTMLElement>('button, input, select')?.focus(), 80);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab' || !box.current) return;
      const f = Array.from(
        box.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, textarea, a[href]'),
      ).filter((n) => n.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      clearTimeout(t);
      lockScroll(false);
      window.removeEventListener('keydown', key);
      prev?.focus?.();
    };
  }, [open, box, close]);
}

export function Totals({ subtotal }: { subtotal: number }) {
  const vat = subtotal * VAT;
  return (
    <div className="totals">
      <div>
        <span>المجموع قبل الضريبة</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      <div>
        <span>
          ضريبة القيمة المضافة <span className="num">15%</span>
        </span>
        <span>{formatPrice(vat)}</span>
      </div>
      <div className="totals__sum">
        <span>الإجمالي</span>
        <span className="price">{formatPrice(subtotal + vat)}</span>
      </div>
    </div>
  );
}

export function CartDrawer() {
  const open = useStore((s) => s.cartOpen);
  const cart = useStore((s) => s.cart);
  const openCart = useStore((s) => s.openCart);
  const setQty = useStore((s) => s.setQty);
  const removeItem = useStore((s) => s.removeItem);
  const count = useStore(cartCount);
  const subtotal = useStore(cartSubtotal);
  const box = useRef<HTMLElement>(null);
  const close = useRef(() => openCart(false)).current;
  useOverlay(open, box, close);

  return (
    <>
      <div className={`scrim${open ? ' is-open' : ''}`} onClick={close} aria-hidden="true" />
      <aside className={`drawer${open ? ' is-open' : ''}`} ref={box} role="dialog" aria-modal="true" aria-label="سلة المشتريات" aria-hidden={!open} inert={!open}>
        <div className="drawer__head">
          <h2 className="drawer__title">
            السلة <span className="num drawer__count">({count})</span>
          </h2>
          <button type="button" className="icon-btn" onClick={close} aria-label="إغلاق السلة">
            <CloseIcon />
          </button>
        </div>
        <div className="drawer__body">
          {cart.length === 0 ? (
            <div className="drawer__empty">
              <WatchGlyph />
              <p>سلتك فارغة.</p>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  close();
                  navigate('/shop');
                }}
              >
                تصفّح المجموعة
              </button>
            </div>
          ) : (
            <ul>
              {cart.map((item) => (
                <li className="cart-item" key={item.id}>
                  <div className="cart-item__thumb">{item.thumb ? <img src={item.thumb} alt="" /> : <WatchGlyph />}</div>
                  <div>
                    <p className="cart-item__name" lang="en">
                      {item.name}
                    </p>
                    <p className="cart-item__detail">{item.detail}</p>
                    <div className="cart-item__row">
                      <div className="qty">
                        <button type="button" onClick={() => setQty(item.id, item.qty - 1)} aria-label={`إنقاص كمية ${item.name}`}>
                          −
                        </button>
                        <span className="num" aria-live="polite">
                          {item.qty}
                        </span>
                        <button type="button" onClick={() => setQty(item.id, item.qty + 1)} aria-label={`زيادة كمية ${item.name}`}>
                          +
                        </button>
                      </div>
                      <span className="cart-item__price">{formatPrice(item.price * item.qty)}</span>
                    </div>
                    <button type="button" className="cart-item__remove" onClick={() => removeItem(item.id)}>
                      إزالة
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {cart.length > 0 && (
          <div className="drawer__foot">
            <Totals subtotal={subtotal} />
            <button type="button" className="btn btn--gold btn--wide" onClick={() => {
              close();
              navigate('/checkout');
            }}>
              إتمام الطلب
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <p className={`toast${t.leaving ? ' is-leaving' : ''}`} key={t.id}>
          {t.text}
        </p>
      ))}
    </div>
  );
}
