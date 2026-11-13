import { Logo } from './Header';

/** Shown for any path other than the site root. */
export default function NotFound() {
  // an unknown hash route goes back to #/ ; an unknown path goes back to the site root
  const path = window.location.pathname;
  const rootDoc = path.endsWith('/') || path.endsWith('/index.html');
  const home = rootDoc ? '#/' : import.meta.env.BASE_URL === './' ? '/' : import.meta.env.BASE_URL;
  return (
    <main className="nf" id="main">
      <header className="nf__head wrap">
        <Logo onClick={() => !rootDoc && (window.location.href = home)} />
      </header>
      <div className="nf__body wrap">
        <svg viewBox="0 0 240 240" className="nf__dial" aria-hidden="true">
          <circle cx="120" cy="120" r="112" className="nf__ring" />
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2;
            const r1 = i % 5 === 0 ? 96 : 101;
            return (
              <line
                key={i}
                x1={120 + Math.cos(a) * r1}
                y1={120 + Math.sin(a) * r1}
                x2={120 + Math.cos(a) * 106}
                y2={120 + Math.sin(a) * 106}
                className={i % 5 === 0 ? 'nf__tick nf__tick--major' : 'nf__tick'}
              />
            );
          })}
          <text x="120" y="120" textAnchor="middle" dominantBaseline="central" className="nf__num">
            404
          </text>
          <g className="nf__hand">
            <line x1="120" y1="132" x2="120" y2="30" />
          </g>
          <circle cx="120" cy="120" r="3" className="nf__hub" />
        </svg>
        <h1 className="h-section">
          هذه الصفحة <em>خارج الوقت</em>
        </h1>
        <p className="lead">الرابط الذي فتحته غير موجود، أو نُقل إلى مكان آخر.</p>
        <a className="btn btn--gold" href={home}>
          العودة إلى الصفحة الرئيسية
        </a>
      </div>
    </main>
  );
}
