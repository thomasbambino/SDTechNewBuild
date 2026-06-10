import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface PublicSettings {
  siteTitle?: string;
  favicon?: string;
}

export default function DynamicFavicon({ defaultFavicon = '/favicon.svg' }: { defaultFavicon?: string }) {
  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ['/api/settings/public'],
  });

  useEffect(() => {
    const path = settings?.favicon || defaultFavicon;
    if (!path) return;

    const href = path.startsWith('/') || path.startsWith('http') ? path : `/${path}`;
    const type = href.endsWith('.svg') ? 'image/svg+xml'
      : href.endsWith('.png') ? 'image/png'
      : 'image/x-icon';

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = type;
    link.href = href;

    let appleLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = href;
  }, [settings?.favicon, defaultFavicon]);

  useEffect(() => {
    if (settings?.siteTitle) {
      document.title = settings.siteTitle;
    }
  }, [settings?.siteTitle]);

  return null;
}
