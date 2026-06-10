import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface DynamicFaviconProps {
  defaultFavicon?: string;
}

// Define interface for public settings data
interface PublicSettings {
  companyName?: string;
  logoPath?: string;
  primaryColor?: string;
  theme?: string;
  radius?: number;
  siteTitle?: string;
  siteDescription?: string;
  favicon?: string;
}

export default function DynamicFavicon({ defaultFavicon = '/favicon.ico' }: DynamicFaviconProps) {
  // Direct API query to ensure this works even on public pages
  const { data: settings = {} as PublicSettings } = useQuery<PublicSettings>({
    queryKey: ['/api/settings/public'],
  });

  // Use state to keep track of current favicon
  const [currentFavicon, setCurrentFavicon] = useState<string | null>(null);

  // Keep document.title in sync with siteTitle setting
  useEffect(() => {
    if (settings.siteTitle) {
      document.title = settings.siteTitle;
    }
  }, [settings.siteTitle]);

  useEffect(() => {
    // Function to update favicon
    const updateFavicon = (faviconPath: string) => {
      if (!faviconPath) return;
      
      // Ensure the favicon path is absolute
      let absolutePath = faviconPath;
      if (!absolutePath.startsWith('http') && !absolutePath.startsWith('/')) {
        absolutePath = `/${absolutePath}`;
      }
      
      // Add timestamp to bust cache
      const timestamp = Date.now();
      const faviconWithTimestamp = absolutePath.includes('?') 
        ? `${absolutePath}&t=${timestamp}` 
        : `${absolutePath}?t=${timestamp}`;
      
      // Only update if the favicon has changed (ignoring timestamp)
      const baseFavicon = absolutePath.split('?')[0];
      const currentBaseFavicon = currentFavicon ? currentFavicon.split('?')[0] : null;
      
      if (baseFavicon !== currentBaseFavicon) {
        setCurrentFavicon(faviconWithTimestamp);
        
        // Get existing links
        const existingLink = document.querySelector('link[rel="icon"]');
        const existingAppleLink = document.querySelector('link[rel="apple-touch-icon"]');
        
        console.log('Setting favicon to:', faviconWithTimestamp);
        
        // Update or create favicon link
        if (existingLink) {
          existingLink.setAttribute('href', faviconWithTimestamp);
        } else {
          const link = document.createElement('link');
          link.rel = 'icon';
          link.href = faviconWithTimestamp;
          document.head.appendChild(link);
        }
        
        // Update or create apple-touch-icon link
        if (existingAppleLink) {
          existingAppleLink.setAttribute('href', faviconWithTimestamp);
        } else {
          const appleLink = document.createElement('link');
          appleLink.rel = 'apple-touch-icon';
          appleLink.href = faviconWithTimestamp;
          document.head.appendChild(appleLink);
        }
      }
    };

    // Either use the settings favicon or fall back to default
    if (settings.favicon) {
      updateFavicon(settings.favicon);
    } else if (!currentFavicon) {
      // Only set default if we haven't set a favicon yet
      updateFavicon(defaultFavicon);
    }
  }, [settings, defaultFavicon, currentFavicon]);

  // This component doesn't render anything visible
  return null;
}