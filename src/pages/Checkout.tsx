import { useState, type FormEvent } from 'react';
import { CITIES, VAT, formatPrice } from '../data';
import { navigate } from '../lib/router';
import { cartSubtotal, useStore } from '../store';
import { Totals, WatchGlyph } from '../components/Cart';

const METHODS = [
  { id: 'boutique', label: 'استلام من البوتيك', note: 'نجهّز الساعة ونضبط السوار على معصمك عند الاستلام.' },
  { id: 'courier', label: 'توصيل مؤمَّن', note: 'تسليم باليد مع توقيع المستلم، خلال ثلاثة إلى خمسة أيام عمل.' },
] as const;

/** Mock checkout as its own page. Nothing is charged and nothing leaves the browser. */
export default function Checkout() {
  const cart = useStore((s) => s.cart);
  const subtotal = useStore(cartSubtotal);
  const setQty = useStore((s) => s.setQty);
  const removeItem = useStore((s) => s.removeItem);
  const clearCart = useStore((s) => s.clearCart);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [method, setMethod] = useState<(typeof METHODS)[number]['id']>('boutique');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ id: string; total: number; name: string; city: string; method: string } | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (name.trim().length < 2) err.name = 'اكتب اسمك.';
    if (!city) err.city = 'اختر المدينة.';
    setErrors(err);
    if (Object.keys(err).length) return;
    const order = {
      id: `AJ-${Math.floor(100000 + Math.random() * 900000)}`,
      total: subtotal * (1 + VAT),
      name: name.trim(),
      city,
      method: METHODS.find((m) => m.id === method)!.label,
    };
    // a short wait while the order is "sent"
    setSending(true);
    setTimeout(() => {
      setDone(order);
      clearCart();
      window.scrollTo({ top: 0 });
    }, 1000);
  };

  if (done) {
    return (
      <section className="page co-page" aria-labelledby="co-title">
        <div className="wrap co-done" role="status">
          <svg viewBox="0 0 64 64" className="apt__check" aria-hidden="true">
            <circle cx="32" cy="32" r="30" />
            <path d="M20 33l8 8 16-18" />
          </svg>
          <h1 className="h-section" id="co-title">
            سُجّل طلبك، <em>{done.name}</em>
          </h1>
          <p className="lead">
            استلمنا طلبك بنجاح. سيتواصل معك أحد المستشارين خلال 24 ساعة لتأكيد التفاصيل وترتيب الاستلام.
          </p>
          <dl className="specs co-done__specs">
            <div>
              <dt>رقم الطلب</dt>
              <dd className="num">{done.id}</dd>
            </div>
            <div>
              <dt>الاستلام</dt>
              <dd>
                {done.method} · {done.city}
              </dd>
            </div>
            <div>
              <dt>الإجمالي شامل الضريبة</dt>
              <dd className="price">{formatPrice(done.total)}</dd>
            </div>
          </dl>
          <button type="button" className="btn btn--gold" onClick={() => navigate('/')}>
            العودة إلى الصفحة الرئيسية
          </button>
        </div>
      </section>
    );
  }

  if (cart.length === 0) {
    return (
      <section className="page co-page" aria-labelledby="co-title">
        <div className="wrap co-done">
          <span className="co-empty">
            <WatchGlyph />
          </span>
          <h1 className="h-section" id="co-title">
            سلتك <em>فارغة</em>
          </h1>
          <p className="lead">اختر ساعة من المجموعة أو صمّم ساعتك، ثم عد لإتمام الطلب.</p>
          <button type="button" className="btn btn--gold" onClick={() => navigate('/shop')}>
            الذهاب إلى المتجر
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page co-page" aria-labelledby="co-title">
      <div className="wrap">
        <header className="co-head">
          <h1 className="h-section" id="co-title">
            إتمام <em>الطلب</em>
          </h1>
          <ol className="co-steps" aria-label="مراحل الطلب">
            <li className="is-done">السلة</li>
            <li className="is-on" aria-current="step">
              البيانات والاستلام
            </li>
            <li>التأكيد</li>
          </ol>
        </header>

        <form className="co-grid" onSubmit={submit} noValidate>
          <div className="co-form">
            <fieldset className="co-block">
              <legend>بياناتك</legend>
              <div className="field">
                <label htmlFor="co-name">الاسم</label>
                <input id="co-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="الاسم الكريم" aria-invalid={!!errors.name} />
                {errors.name && <p className="error">{errors.name}</p>}
              </div>
              <div className="field">
                <label htmlFor="co-city">المدينة</label>
                <select id="co-city" className="input" value={city} onChange={(e) => setCity(e.target.value)} aria-invalid={!!errors.city}>
                  <option value="">اختر المدينة</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.city && <p className="error">{errors.city}</p>}
              </div>
            </fieldset>

            <fieldset className="co-block opt">
              <legend>طريقة الاستلام</legend>
              <div className="co-methods">
                {METHODS.map((m) => (
                  <label key={m.id} className={`card-opt co-method${method === m.id ? ' is-on' : ''}`}>
                    <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} />
                    <span className="card-opt__name">{m.label}</span>
                    <span className="card-opt__note">{m.note}</span>
                    <span className="card-opt__delta">بلا رسوم إضافية</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="co-block">
              <legend>ملاحظاتك</legend>
              <div className="field">
                <label htmlFor="co-note">(اختياري) ملاحظة على الطلب</label>
                <textarea id="co-note" className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="نقش على ظهر العلبة، أو موعد مفضّل للاستلام" />
              </div>
            </fieldset>
          </div>

          <aside className="co-summary" aria-label="ملخّص الطلب">
            <h2 className="co-summary__title">ملخّص الطلب</h2>
            <ul className="co-list">
              {cart.map((item) => (
                <li key={item.id} className="cart-item">
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
                      <span className="cart-item__price price">{formatPrice(item.price * item.qty)}</span>
                    </div>
                    <button type="button" className="cart-item__remove" onClick={() => removeItem(item.id)}>
                      إزالة
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <Totals subtotal={subtotal} />
            <button type="submit" className="btn btn--gold btn--wide" disabled={sending} aria-busy={sending}>
              {sending ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  جارٍ إرسال الطلب
                </>
              ) : (
                'تأكيد الطلب'
              )}
            </button>
            <button type="button" className="link co-back" onClick={() => navigate('/shop')}>
              متابعة التسوّق
            </button>
          </aside>
        </form>
      </div>
    </section>
  );
}
