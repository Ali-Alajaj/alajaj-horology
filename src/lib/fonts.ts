/** Resolves when the faces used on canvas textures and above the fold are ready (or after a timeout). */
export function fontsReady(timeout = 5000): Promise<void> {
  if (!('fonts' in document)) return Promise.resolve();
  const wanted = [
    document.fonts.load('700 64px Amiri', 'العجاج ١٢٣٩'),
    document.fonts.load('400 64px Amiri', 'العجاج'),
    document.fonts.load('500 24px "Cormorant Garamond"', 'ALAJAJ HOROLOGY'),
    document.fonts.load('400 16px "IBM Plex Sans Arabic"', 'العجاج للساعات'),
    document.fonts.load('700 48px "Noto Kufi Arabic"', 'الوقت حرفة'),
    document.fonts.load('700 48px "Cormorant Garamond"', 'ALAJAJ HOROLOGY'),
  ];
  return Promise.race([
    Promise.all(wanted).then(() => undefined),
    new Promise<void>((r) => setTimeout(r, timeout)),
  ]).catch(() => undefined);
}
