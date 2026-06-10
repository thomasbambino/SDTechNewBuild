import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  fallbackText?: string;
  height?: string;
}

interface PublicSettings {
  companyName?: string;
  logoPath?: string;
}

export function Logo({ className = "h-10 w-auto", fallbackText = "SD Tech Pros", height = "40px" }: LogoProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const { data: settings, isLoading } = useQuery<PublicSettings>({
    queryKey: ['/api/settings/public'],
  });

  if (isLoading) {
    return <Skeleton className="h-10 w-32" />;
  }

  if (!settings?.logoPath) {
    return <span className="font-bold text-xl text-primary">{fallbackText}</span>;
  }

  return (
    <div className="relative inline-flex items-center" style={{ height }}>
      {!imgLoaded && <Skeleton className="absolute inset-0 rounded-md" style={{ height }} />}
      <img
        src={settings.logoPath}
        alt={settings.companyName || fallbackText}
        className={cn(className, !imgLoaded && "opacity-0")}
        style={{ height }}
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgLoaded(true)}
      />
    </div>
  );
}
