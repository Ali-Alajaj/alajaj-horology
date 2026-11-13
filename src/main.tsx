import { createRoot } from 'react-dom/client';
import '@fontsource/amiri/400.css';
import '@fontsource/amiri/700.css';
import '@fontsource/ibm-plex-sans-arabic/300.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/noto-kufi-arabic/500.css';
import '@fontsource/noto-kufi-arabic/600.css';
import '@fontsource/noto-kufi-arabic/700.css';
import './styles/base.css';
import { fontsReady } from './lib/fonts';

const root = createRoot(document.getElementById('root')!);

if (new URLSearchParams(location.search).has('lab')) {
  // 3D development bench, not linked from the site
  Promise.all([import('./Lab'), fontsReady()]).then(([{ default: Lab }]) => root.render(<Lab />));
} else {
  import('./App').then(({ default: App }) => root.render(<App />));
}
