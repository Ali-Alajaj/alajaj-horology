/** Hijri (Umm al-Qura) date parts with Western digits, plus a simple moon-phase model. */

export interface HijriParts {
  day: number;
  month: number;
  monthName: string;
  year: number;
}

const HIJRI_MONTHS = [
  'محرّم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوّال',
  'ذو القعدة',
  'ذو الحجة',
];

export function hijriParts(date: Date): HijriParts {
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = fmt.formatToParts(date);
    const num = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? '1', 10);
    const day = num('day');
    const month = num('month');
    const year = num('year');
    if (day >= 1 && month >= 1 && month <= 12) {
      return { day, month, monthName: HIJRI_MONTHS[month - 1], year };
    }
  } catch {
    /* fall through to the arithmetic calendar */
  }
  // Tabular Islamic calendar fallback
  const jd = Math.floor(date.getTime() / 86400000 + 2440587.5);
  const l0 = jd - 1948440 + 10632;
  const n = Math.floor((l0 - 1) / 10631);
  const l1 = l0 - 10631 * n + 354;
  const j =
    Math.floor((10985 - l1) / 5316) * Math.floor((50 * l1) / 17719) +
    Math.floor(l1 / 5670) * Math.floor((43 * l1) / 15238);
  const l2 =
    l1 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l2) / 709);
  const day = l2 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { day, month, monthName: HIJRI_MONTHS[month - 1], year };
}

const GREG_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const WEEKDAYS_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export function gregMonthName(m: number) {
  return GREG_MONTHS[m];
}

export function formatGregorian(date: Date) {
  return `${date.getDate()} ${GREG_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatHijri(date: Date) {
  const h = hijriParts(date);
  return `${h.day} ${h.monthName} ${h.year}`;
}

export interface MoonPhase {
  /** 0 = new moon, 0.5 = full moon, 1 = next new moon */
  fraction: number;
  illumination: number;
  name: string;
  ageDays: number;
}

const SYNODIC = 29.530588853;
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14, 0);

export function moonPhase(date: Date): MoonPhase {
  const days = (date.getTime() - NEW_MOON_REF) / 86400000;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  const fraction = age / SYNODIC;
  const illumination = (1 - Math.cos(fraction * Math.PI * 2)) / 2;
  let name = 'محاق';
  if (fraction < 0.03 || fraction > 0.97) name = 'محاق';
  else if (fraction < 0.22) name = 'هلال متزايد';
  else if (fraction < 0.28) name = 'تربيع أول';
  else if (fraction < 0.47) name = 'أحدب متزايد';
  else if (fraction < 0.53) name = 'بدر';
  else if (fraction < 0.72) name = 'أحدب متناقص';
  else if (fraction < 0.78) name = 'تربيع أخير';
  else name = 'هلال متناقص';
  return { fraction, illumination, name, ageDays: age };
}

/** SVG path for the lit part of the moon, centred on 0,0 with radius r. */
export function moonSvgPath(r: number, fraction: number): string {
  const k = Math.cos(fraction * Math.PI * 2);
  const rx = Math.max(0.001, r * Math.abs(k));
  const sweep = k > 0 ? 0 : 1;
  return `M0 ${-r} A${r} ${r} 0 0 1 0 ${r} A${rx} ${r} 0 0 ${sweep} 0 ${-r} Z`;
}
