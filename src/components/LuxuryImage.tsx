import React, { useState } from 'react';
import { resolveImageUrl } from '../lib/assetMap.ts';

interface LuxuryImageProps {
  src: string | undefined | null;
  alt: string;
  className?: string;
  eager?: boolean;
}

export function LuxuryImage({ src, alt, className = '', eager = false }: LuxuryImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveImageUrl(src);

  if (failed || !resolved) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F7F2E7] via-[#EFE5D1] to-[#E6D6B8] text-[#7A5B1E] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <svg viewBox="0 0 40 40" className="w-10 h-10 mb-2 opacity-80" fill="none">
          <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M20 9L23.5 17.5L31 20L23.5 22.5L20 31L16.5 22.5L9 20L16.5 17.5L20 9Z"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
        <span className="font-serif-display text-sm font-medium line-clamp-2 max-w-[20ch]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
