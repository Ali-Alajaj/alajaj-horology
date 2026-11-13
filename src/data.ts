import type { CaseFinish, DialColor, LayerName, Numerals, StrapType, WatchConfig } from './three/watch';

/* All prices, specifications, durations and policies below are placeholder data. */

export const PRICE = {
  base: 46500,
  case: { steel: 0, rose: 36000, pvd: 5500 } as Record<CaseFinish, number>,
  strap: { leather: 0, bracelet: 7500, rubber: 1500 } as Record<StrapType, number>,
};
export const VAT = 0.15;

export const priceFor = (c: WatchConfig) => PRICE.base + PRICE.case[c.caseFinish] + PRICE.strap[c.strap];
export const formatPrice = (n: number) => `${new Intl.NumberFormat('en-US').format(Math.round(n))} ر.س`;

export const CASES: { id: CaseFinish; label: string; note: string; swatch: string }[] = [
  {
    id: 'steel',
    label: 'فولاذ',
    note: '316L · ساتاني ومصقول',
    swatch: 'linear-gradient(135deg,#f4f5f6 0%,#9aa0a6 38%,#e9ebee 62%,#7d838a 100%)',
  },
  {
    id: 'rose',
    label: 'ذهب وردي',
    note: 'عيار 18',
    swatch: 'linear-gradient(135deg,#f8d9c6 0%,#c98c6c 40%,#f1c3a8 64%,#a86f52 100%)',
  },
  {
    id: 'pvd',
    label: 'PVD أسود',
    note: 'طلاء كربوني داكن',
    swatch: 'linear-gradient(135deg,#55585e 0%,#17181b 42%,#3a3c41 66%,#0c0d0f 100%)',
  },
];

export const DIAL_OPTIONS: { id: DialColor; label: string; hex: string }[] = [
  { id: 'green', label: 'أخضر زمرّدي', hex: '#0f4d38' },
  { id: 'blue', label: 'أزرق ليلي', hex: '#14336a' },
  { id: 'ivory', label: 'عاجي', hex: '#e9dfc8' },
  { id: 'black', label: 'أسود فحمي', hex: '#1c1d20' },
];

export const STRAPS: { id: StrapType; label: string; note: string; swatch: string }[] = [
  {
    id: 'leather',
    label: 'جلد',
    note: 'مخيّط يدويًا',
    swatch: 'linear-gradient(135deg,#5a3722 0%,#2c1a10 60%,#472a19 100%)',
  },
  {
    id: 'bracelet',
    label: 'سلسلة فولاذية',
    note: 'ثلاث حلقات',
    swatch: 'repeating-linear-gradient(90deg,#e6e8ea 0 6px,#8d9399 6px 8px,#c4c8cc 8px 14px,#7d838a 14px 16px)',
  },
  {
    id: 'rubber',
    label: 'مطاط',
    note: 'مقاوم للماء والحرارة',
    swatch: 'repeating-linear-gradient(0deg,#1b1d1f 0 4px,#0d0e10 4px 7px)',
  },
];

export const NUMERALS: { id: Numerals; label: string; sample: string }[] = [
  { id: 'batons', label: 'مؤشرات مثبّتة', sample: '❘ ❘ ❘' },
  { id: 'arabic', label: 'أرقام مشرقية', sample: '١٢ ٣ ٩' },
];

export const configSummary = (c: WatchConfig) =>
  [
    CASES.find((x) => x.id === c.caseFinish)!.label,
    `ميناء ${DIAL_OPTIONS.find((x) => x.id === c.dial)!.label}`,
    STRAPS.find((x) => x.id === c.strap)!.label,
  ].join(' · ');

export interface Model {
  id: string;
  name: string;
  tagline: string;
  desc: string;
  config: WatchConfig;
  price: number;
  specs: [string, string][];
  photo: string;
  tone: 'gold' | 'steel' | 'night' | 'sand' | 'leather' | 'green';
}

export const MODELS: Model[] = [
  {
    id: 'meridian',
    name: 'Alajaj Meridian',
    tagline: 'ساعة التقويمين',
    desc: 'ميناء أخضر بتشطيب شمسي، وطوق مخدَّد، ونافذة تجمع يوم الشهر الهجري بطور القمر. الساعة التي بدأت منها الدار.',
    config: { caseFinish: 'steel', dial: 'green', strap: 'leather', numerals: 'batons' },
    price: 46500,
    specs: [
      ['القطر', '40 mm'],
      ['السماكة', '11.4 mm'],
      ['العلبة', 'فولاذ 316L'],
      ['مقاومة الماء', '10 ATM'],
      ['احتياطي الطاقة', '72 ساعة'],
    ],
    photo: 'collection-meridian.webp',
    tone: 'green',
  },
  {
    id: 'nomad',
    name: 'Alajaj Nomad',
    tagline: 'رفيقة الترحال',
    desc: 'علبة سوداء بطلاء PVD وأرقام مشرقية وسوار مطاطي. صُمّمت للطريق الطويل، من ساحل البحر إلى أطراف الربع الخالي.',
    config: { caseFinish: 'pvd', dial: 'black', strap: 'rubber', numerals: 'arabic' },
    price: 53500,
    specs: [
      ['القطر', '40 mm'],
      ['السماكة', '12.1 mm'],
      ['العلبة', 'فولاذ بطلاء PVD'],
      ['مقاومة الماء', '20 ATM'],
      ['احتياطي الطاقة', '72 ساعة'],
    ],
    photo: 'collection-nomad.webp',
    tone: 'sand',
  },
  {
    id: 'oasis',
    name: 'Alajaj Oasis',
    tagline: 'هدوء الواحة',
    desc: 'ذهب وردي عيار 18 وميناء عاجي دافئ وجلد بلون العسل. ساعة للمساء، وللمناسبات التي تُحفظ في الذاكرة.',
    config: { caseFinish: 'rose', dial: 'ivory', strap: 'leather', numerals: 'batons' },
    price: 82500,
    specs: [
      ['القطر', '40 mm'],
      ['السماكة', '11.4 mm'],
      ['العلبة', 'ذهب وردي عيار 18'],
      ['مقاومة الماء', '5 ATM'],
      ['احتياطي الطاقة', '72 ساعة'],
    ],
    photo: 'collection-oasis.webp',
    tone: 'gold',
  },
];

export interface Part {
  layer: LayerName;
  title: string;
  /** one line shown next to the part in the exploded view */
  short: string;
  text: string;
}

/** Hotspots of the exploded view, from the crystal down to the case back. */
export const PARTS: Part[] = [
  {
    layer: 'crystal',
    title: 'الزجاج الياقوتي',
    short: 'ياقوت مقاوم للخدش بطلاء مضاد للانعكاس.',
    text: 'قبّة من الياقوت الصناعي المقاوم للخدش، بطلاء مضاد للانعكاس على الوجهين، تُبقي الميناء واضحًا من كل زاوية.',
  },
  {
    layer: 'bezel',
    title: 'الطوق المخدَّد',
    short: '120 ضلعًا مصقولًا تلتقط الضوء مع كل حركة.',
    text: '120 ضلعًا تُقطع وتُصقل واحدًا واحدًا، لتلتقط الضوء مع كل حركة للمعصم.',
  },
  {
    layer: 'dial',
    title: 'الميناء والعقارب',
    short: 'تشطيب شمسي ومؤشرات تُثبَّت يدويًا.',
    text: 'تشطيب شمسي يتدرّج مع الضوء، ومؤشرات تُثبَّت يدويًا، وعقارب مصقولة على وجهين.',
  },
  {
    layer: 'caseMid',
    title: 'العلبة',
    short: 'فولاذ 316L بلمسة ساتانية وحواف مصقولة.',
    text: 'فولاذ 316L بقطر ⁦40 mm⁩، تتناوب على سطحه اللمسة الساتانية والحواف المصقولة.',
  },
  {
    layer: 'bridges',
    title: 'الجسور',
    short: 'خطوط جنيف وأحجار ياقوت وبراغٍ مزرّقة.',
    text: 'جسور مزخرفة بخطوط جنيف وحواف مشطوفة يدويًا، تحتضن أحجار الياقوت والبراغي المزرّقة بالحرارة.',
  },
  {
    layer: 'gears',
    title: 'قطار المسنّنات',
    short: 'ينقل القوة بإيقاع 28,800 ذبذبة في الساعة.',
    text: 'من خزّان الطاقة إلى عجلة الميزان: مسنّنات نحاسية تنقل القوة بإيقاع 28,800 ذبذبة في الساعة.',
  },
  {
    layer: 'rotor',
    title: 'الدوّار',
    short: 'كتلة ذهبية تعبّئ الزنبرك مع كل حركة.',
    text: 'كتلة ذهبية متأرجحة تعيد تعبئة الزنبرك مع كل حركة، لاحتياطي طاقة يبلغ 72 ساعة.',
  },
  {
    layer: 'caseBack',
    title: 'ظهر العلبة',
    short: 'ظهر شفاف من الياقوت يكشف الحركة وهي تعمل.',
    text: 'ظهر شفاف من الياقوت يكشف الحركة وهي تعمل، محكم الإغلاق حتى ⁦10 ATM⁩.',
  },
];

export const CRAFT = [
  {
    title: 'الرسم',
    text: 'تبدأ كل ساعة بخطّ على الورق. نرسم النِّسَب باليد أولًا، ثم ننقلها إلى مخططات بدقة جزء من المئة من المليمتر.',
    image: 'craft-01-sketch.webp',
    tone: 'sand' as const,
  },
  {
    title: 'التشكيل',
    text: 'تُخرط العلبة من قالب واحد من الفولاذ، وتُقطع الجسور والصفائح من النحاس قبل طلائها بالروديوم.',
    image: 'craft-02-machining.webp',
    tone: 'steel' as const,
  },
  {
    title: 'الزخرفة',
    text: 'خطوط جنيف، والتحبيب الدائري، وشطف الحواف: تشطيبات تُنفَّذ يدويًا على أجزاء لن يراها إلا صانعها.',
    image: 'craft-03-finishing.webp',
    tone: 'gold' as const,
  },
  {
    title: 'التجميع',
    text: 'صانع واحد يجمع الحركة من أول برغي إلى آخر حجر، في غرفة نظيفة وتحت عدسة مكبّرة.',
    image: 'craft-04-assembly.webp',
    tone: 'green' as const,
  },
  {
    title: 'الضبط',
    text: 'تُختبر الساعة في ستة أوضاع وثلاث درجات حرارة على مدى أسبوعين، ولا تغادر المشغل قبل أن تنتظم.',
    image: 'craft-05-regulation.webp',
    tone: 'night' as const,
  },
];

export const CITIES = ['الرياض', 'جدة', 'الخبر', 'دبي', 'الدوحة', 'الكويت'];
export const TIMES = ['10:00', '11:30', '13:00', '16:30', '18:00', '19:30', '21:00'];

export const FAQ = [
  {
    q: 'ما مدة الضمان وماذا يشمل؟',
    a: 'خمس سنوات من تاريخ الشراء، تشمل عيوب التصنيع في الحركة والعلبة. لا يشمل الضمان الاستهلاك الطبيعي للسوار أو الأضرار الناتجة عن الصدمات.',
  },
  {
    q: 'متى تحتاج الساعة إلى صيانة؟',
    a: 'ننصح بصيانة كاملة كل خمس إلى سبع سنوات: تفكيك الحركة وتنظيفها وتزييتها، وتبديل الحشوات، ثم اختبار الدقة ومقاومة الماء.',
  },
  {
    q: 'هل أستطيع السباحة بالساعة؟',
    a: 'ساعات ⁦10 ATM⁩ و⁦20 ATM⁩ مناسبة للسباحة. ساعات ⁦5 ATM⁩ تحتمل رذاذ الماء والمطر فقط. في كل الأحوال تأكّد من إحكام التاج قبل ملامسة الماء.',
  },
  {
    q: 'هل يمكن تبديل السوار بعد الشراء؟',
    a: 'نعم. جميع الأساور تُثبَّت بقضبان سريعة الفك، وتستطيع تبديلها بنفسك أو في أي بوتيك للدار.',
  },
  {
    q: 'هل تعقيدة التقويمين متاحة اليوم؟',
    a: 'هي تصوّر تصميمي تعمل عليه الدار، ولم تُطرح بعد. ما تراه في هذه الصفحة عرض لفكرتها وطريقة قراءتها.',
  },
  {
    q: 'كيف أحجز موعدًا في البوتيك؟',
    a: 'اختر المدينة واليوم والوقت من نموذج الحجز في هذه الصفحة. المواعيد خاصة ومدتها نحو خمس وأربعين دقيقة.',
  },
];

export const NAV = [
  { path: '/', label: 'الرئيسية' },
  { path: '/about', label: 'عن الساعة' },
  { path: '/shop', label: 'المتجر' },
  { path: '/boutique', label: 'البوتيك' },
];
