import { useEffect } from 'react';

export default function ThemeProvider() {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = (dark) => {
      document.documentElement.classList.toggle('dark', dark);
    };

    apply(mediaQuery.matches);
    mediaQuery.addEventListener('change', (e) => apply(e.matches));
    return () => mediaQuery.removeEventListener('change', (e) => apply(e.matches));
  }, []);

  return null;
}
