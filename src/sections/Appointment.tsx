import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { lockScroll, scrollToTarget } from '../lib/scroll';
import { CITIES, TIMES } from '../data';
import { WEEKDAYS, WEEKDAYS_SHORT, formatGregorian, formatHijri, gregMonthName } from '../lib/calendar';
import { useReveal } from '../lib/reveal';
import { useStore } from '../store';
import Media from '../components/Media';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

function Calendar({ value, onChange }: { value: string; onChange(v: string): void }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [offset, setOffset] = useState(0); // months from the current month (0–2)
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = first.getDay(); // Sunday first
  const max = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 60);

  return (
    <div className="cal">
      <div className="cal__head">
        <button type="button" className="cal__nav" onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0} aria-label="الشهر السابق">
          <svg viewBox="0 0 10 16" aria-hidden="true">
            <path d="M2 1l7 7-7 7" />
          </svg>
        </button>
        <p className="cal__month" aria-live="polite">
          {gregMonthName(first.getMonth())} <span className="num">{first.getFullYear()}</span>
        </p>
        <button type="button" className="cal__nav" onClick={() => setOffset((o) => Math.min(2, o + 1))} disabled={offset === 2} aria-label="الشهر التالي">
          <svg viewBox="0 0 10 16" aria-hidden="true">
            <path d="M8 1L1 8l7 7" />
          </svg>
        </button>
      </div>
      <div className="cal__grid" role="group" aria-label="اختر اليوم">
        {WEEKDAYS_SHORT.map((w) => (
          <span key={w} className="cal__dow" aria-hidden="true">
            {w}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = new Date(first.getFullYear(), first.getMonth(), i + 1);
          const key = iso(d);
          const closed = d.getDay() === 5; // Friday
          const disabled = d <= today || d > max || closed;
          const selected = value === key;
          return (
            <button
              type="button"
              key={key}
              className={`cal__day num${selected ? ' is-on' : ''}${key === iso(today) ? ' is-today' : ''}`}
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${WEEKDAYS[d.getDay()]} ${formatGregorian(d)}${closed ? '، البوتيك مغلق' : ''}`}
              onClick={() => onChange(key)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className="cal__note">البوتيك مغلق يوم الجمعة.</p>
    </div>
  );
}

export default function Appointment() {
  const root = useRef<HTMLElement>(null);
  const appointments = useStore((s) => s.appointments);
  const addAppointment = useStore((s) => s.addAppointment);
  const latest = appointments[appointments.length - 1];
  const [editing, setEditing] = useState(!latest);
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [popup, setPopup] = useState(false);
  const popupBox = useRef<HTMLDivElement>(null);
  useReveal(root);

  // closing the confirmation returns to the top of the page, where the title and the booking are
  const closePopup = () => {
    setPopup(false);
    setTimeout(() => scrollToTarget(0), 60);
  };
  useEffect(() => {
    if (!popup) return;
    lockScroll(true);
    const t = setTimeout(() => popupBox.current?.querySelector<HTMLElement>('.btn')?.focus(), 80);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && closePopup();
    window.addEventListener('keydown', key);
    return () => {
      clearTimeout(t);
      lockScroll(false);
      window.removeEventListener('keydown', key);
    };
  }, [popup]);

  const details = latest && (
    <dl className="specs">
      <div>
        <dt>المدينة</dt>
        <dd>{latest.city}</dd>
      </div>
      <div>
        <dt>اليوم</dt>
        <dd>
          {WEEKDAYS[fromIso(latest.date).getDay()]} {formatGregorian(fromIso(latest.date))}
        </dd>
      </div>
      <div>
        <dt>الموافق</dt>
        <dd>{formatHijri(fromIso(latest.date))}</dd>
      </div>
      <div>
        <dt>الوقت</dt>
        <dd className="num">{latest.time}</dd>
      </div>
    </dl>
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!city) err.city = 'اختر المدينة.';
    if (!date) err.date = 'اختر اليوم من التقويم.';
    if (!time) err.time = 'اختر الوقت.';
    if (name.trim().length < 2) err.name = 'اكتب اسمك.';
    setErrors(err);
    if (Object.keys(err).length) {
      const firstKey = Object.keys(err)[0];
      root.current?.querySelector<HTMLElement>(`[data-field="${firstKey}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    addAppointment({ city, date, time, name: name.trim(), note: note.trim() });
    setPopup(true);
    setEditing(false);
    setCity('');
    setDate('');
    setTime('');
    setNote('');
  };

  return (
    <section className="apt section" id="boutique" ref={root} aria-labelledby="apt-title">
      <div className="wrap apt__grid">
        <div className="apt__copy">
          <h2 className="h-section" id="apt-title" data-reveal>
            احجز موعدًا <em>في البوتيك</em>
          </h2>
          <p className="lead" data-reveal>
            خمس وأربعون دقيقة مع أحد مستشاري الدار: تجرّب الساعات على معصمك، وترى الحركة تحت العدسة، وتختار
            السوار الذي يناسبك.
          </p>
          <Media name="boutique-interior.webp" alt="داخل بوتيك العجاج للساعات" tone="sand" className="apt__img" />
        </div>

        <div className="apt__panel" data-reveal>
          {!editing && latest ? (
            <div className="apt__done" role="status">
              <svg viewBox="0 0 64 64" className="apt__check" aria-hidden="true">
                <circle cx="32" cy="32" r="30" />
                <path d="M20 33l8 8 16-18" />
              </svg>
              <h3>موعدك محجوز، {latest.name}</h3>
              {details}
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(true)}>
                احجز موعدًا آخر
              </button>
            </div>
          ) : (
            <form className="apt__form" onSubmit={submit} noValidate>
              <div className="field" data-field="city">
                <label htmlFor="apt-city">المدينة</label>
                <select id="apt-city" className="input" value={city} onChange={(e) => setCity(e.target.value)} aria-invalid={!!errors.city}>
                  <option value="">اختر المدينة</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.city && <p className="error">{errors.city}</p>}
              </div>

              <div className="field" data-field="date">
                <span className="label">اليوم</span>
                <Calendar value={date} onChange={setDate} />
                {date && (
                  <p className="apt__picked date">
                    {WEEKDAYS[fromIso(date).getDay()]} {formatGregorian(fromIso(date))} · {formatHijri(fromIso(date))}
                  </p>
                )}
                {errors.date && <p className="error">{errors.date}</p>}
              </div>

              <div className="field" data-field="time">
                <span className="label" id="apt-time-label">
                  الوقت
                </span>
                <div className="times" role="radiogroup" aria-labelledby="apt-time-label">
                  {TIMES.map((t) => (
                    <label key={t} className={`time num${time === t ? ' is-on' : ''}`}>
                      <input type="radio" name="time" checked={time === t} onChange={() => setTime(t)} />
                      {t}
                    </label>
                  ))}
                </div>
                {errors.time && <p className="error">{errors.time}</p>}
              </div>

              <div className="field" data-field="name">
                <label htmlFor="apt-name">الاسم</label>
                <input id="apt-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="الاسم الكريم" aria-invalid={!!errors.name} />
                {errors.name && <p className="error">{errors.name}</p>}
              </div>

              <div className="field">
                <label htmlFor="apt-note">ملاحظة (اختياري)</label>
                <textarea id="apt-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ساعة تودّ رؤيتها، أو مناسبة تختار لها" rows={2} />
              </div>

              <button type="submit" className="btn btn--gold btn--wide">
                تأكيد الموعد
              </button>
            </form>
          )}
        </div>
      </div>

      <div className={`scrim${popup ? ' is-open' : ''}`} onClick={closePopup} aria-hidden="true" />
      <div className={`modal${popup ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-hidden={!popup} inert={!popup} aria-labelledby="apt-popup-title">
        <div className="modal__card apt-pop" ref={popupBox}>
          {latest && (
            <>
              <svg viewBox="0 0 64 64" className="apt__check" aria-hidden="true" key={latest.id}>
                <circle cx="32" cy="32" r="30" />
                <path d="M20 33l8 8 16-18" />
              </svg>
              <h3 className="apt-pop__title" id="apt-popup-title">
                موعدك محجوز، {latest.name}
              </h3>
              <p className="apt-pop__note">حُفظ الموعد على هذا الجهاز فقط. هذا عرض تجريبي ولن تصلك رسالة تأكيد.</p>
              {details}
              <button type="button" className="btn btn--gold btn--wide" onClick={closePopup}>
                تم
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
