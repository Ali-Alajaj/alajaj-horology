import { useEffect, useState } from 'react';

/** Hash routes (`#/shop`), so the static build works from any folder without server rewrites. */
export type Route = 'home' | 'about' | 'shop' | 'boutique' | 'checkout' | 'notfound';

const ROUTES: Record<string, Route> = {
  '/': 'home',
  '/about': 'about',
  '/shop': 'shop',
  '/boutique': 'boutique',
  '/checkout': 'checkout',
};

let last: Route = 'home';

function parse(): Route {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash === '') return (last = 'home');
  // a plain in-page anchor (#main) keeps the current page
  if (!hash.startsWith('/')) return last;
  return (last = ROUTES[hash.replace(/\/+$/, '') || '/'] ?? 'notfound');
}

export function navigate(path: string) {
  const target = `#${path}`;
  if (window.location.hash === target || (path === '/' && window.location.hash === '')) {
    window.scrollTo({ top: 0 });
    return;
  }
  window.location.hash = path;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const pathOf = (route: Route) => Object.keys(ROUTES).find((k) => ROUTES[k] === route) ?? '/';
