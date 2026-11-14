import { useEffect, useState } from 'react';
import './styles/ui.css';
import './styles/experience.css';
import './styles/sections.css';
import './styles/pages.css';
import { initScroll, resetScroll, ScrollTrigger } from './lib/scroll';
import { useRoute, navigate, type Route } from './lib/router';
import Preloader from './components/Preloader';
import Header from './components/Header';
import NotFound from './components/NotFound';
import Media from './components/Media';
import { CartDrawer, Toasts } from './components/Cart';
import Experience from './sections/Experience';
import Complication from './sections/Complication';
import Configurator from './sections/Configurator';
import Collection from './sections/Collection';
import Craft from './sections/Craft';
import Appointment from './sections/Appointment';
import Faq from './sections/Faq';
import Footer from './sections/Footer';
import Checkout from './pages/Checkout';

const TITLES: Record<Route, string> = {
  home: 'العجاج للساعات | ALAJAJ HOROLOGY',
  about: 'عن الساعة | العجاج للساعات',
  shop: 'المتجر | العجاج للساعات',
  boutique: 'احجز موعدًا في البوتيك | العجاج للساعات',
  checkout: 'إتمام الطلب | العجاج للساعات',
  notfound: 'الصفحة غير موجودة | العجاج للساعات',
};

/** Three doors from the home page to the other pages. */
function Gateways() {
  const doors = [
    { path: '/about', title: 'عن الساعة', text: 'تعقيدة التقويمين، وخمس مراحل من الرسم إلى المعصم.', image: 'craft-03-finishing.webp', tone: 'gold' as const },
    { path: '/shop', title: 'المتجر', text: 'ثلاث ساعات جاهزة، أو ساعة تصمّمها بنفسك.', image: 'collection-meridian.webp', tone: 'green' as const },
    { path: '/boutique', title: 'البوتيك', text: 'موعد خاص لتجربة الساعات على معصمك.', image: 'boutique-interior.webp', tone: 'sand' as const },
  ];
  return (
    <section className="gates section" aria-label="صفحات الموقع">
      <div className="wrap gates__grid">
        {doors.map((d) => (
          <a
            key={d.path}
            href={`#${d.path}`}
            className="gate"
            onClick={(e) => {
              e.preventDefault();
              navigate(d.path);
            }}
          >
            <Media name={d.image} alt="" tone={d.tone} className="gate__img" />
            <span className="gate__body">
              <span className="gate__title">{d.title}</span>
              <span className="gate__text">{d.text}</span>
              <span className="gate__go" aria-hidden="true">
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function Page({ route }: { route: Route }) {
  switch (route) {
    case 'home':
      return (
        <>
          <Experience />
          <Gateways />
          <Faq />
        </>
      );
    case 'about':
      return (
        <div className="page">
          <Complication />
          <Craft />
        </div>
      );
    case 'shop':
      return (
        <div className="page">
          <Collection />
          <Configurator />
        </div>
      );
    case 'boutique':
      return (
        <div className="page">
          <Appointment />
        </div>
      );
    case 'checkout':
      return <Checkout />;
    default:
      return null;
  }
}

/** Anything that is not the root document is a 404, and so is an unknown hash route. */
function isRootDocument() {
  const path = window.location.pathname;
  return path.endsWith('/') || path.endsWith('/index.html');
}

export default function App() {
  const [rootDoc] = useState(isRootDocument);
  const route = useRoute();
  const [fonts, setFonts] = useState(false);
  const missing = !rootDoc || route === 'notfound';

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    return initScroll();
  }, []);

  // a new page starts at the top
  useEffect(() => {
    document.title = TITLES[missing ? 'notfound' : route];
    resetScroll();
    const timers = [120, 900].map((ms) => setTimeout(() => ScrollTrigger.refresh(), ms));
    return () => timers.forEach(clearTimeout);
  }, [route, missing, fonts]);

  if (missing) return <NotFound />;

  return (
    <>
      <a className="skip" href="#main">
        تخطَّ إلى المحتوى
      </a>
      <Preloader onFonts={() => setFonts(true)} />
      <Header route={route} />
      <main id="main" key={route}>
        {fonts && <Page route={route} />}
      </main>
      {fonts && <Footer />}
      <CartDrawer />
      <Toasts />
    </>
  );
}
