import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { resolveImageUrl } from '../lib/assetMap.ts';

interface BrandLogoProps {
  compact?: boolean;
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  const { settings, language } = useStore();
  const [imgFailed, setImgFailed] = useState(false);

  const hasCustomLogo = Boolean(settings.logoUrl && settings.logoUrl.trim() && !imgFailed);
  const displayTitle =
    language === 'bn' && settings.websiteNameBn
      ? settings.websiteNameBn
      : settings.websiteName || 'Maa Lakshmi Alankar';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      {hasCustomLogo ? (
        <img
          src={resolveImageUrl(settings.logoUrl)}
          alt={settings.websiteName || 'Maa Lakshmi Alankar'}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className={compact ? 'h-8 w-auto object-contain' : 'h-10 w-auto object-contain'}
        />
      ) : (
        <svg
          viewBox="0 0 44 44"
          fill="none"
          aria-hidden="true"
          className={compact ? 'h-8 w-8 shrink-0' : 'h-9 w-9 shrink-0'}
        >
          <circle
            cx="22"
            cy="22"
            r="20.5"
            stroke="#B58938"
            strokeWidth="1.25"
            fill="#FBF7EE"
          />
          <circle
            cx="22"
            cy="22"
            r="17"
            stroke="#D6B97B"
            strokeWidth="0.75"
            strokeDasharray="2 2"
          />
          {/* Sacred Heritage Lotus Motif */}
          <path
            d="M22 10C19.5 14.2 18.8 18.2 22 22.5C25.2 18.2 24.5 14.2 22 10Z"
            fill="#B58938"
          />
          <path
            d="M15.2 13.8C14.8 17.8 16.5 21.2 21 23C19.5 18.8 18.2 15.6 15.2 13.8Z"
            fill="#C89E4C"
          />
          <path
            d="M28.8 13.8C29.2 17.8 27.5 21.2 23 23C24.5 18.8 25.8 15.6 28.8 13.8Z"
            fill="#C89E4C"
          />
          <path
            d="M11.5 19.5C13.2 23.2 16.8 25 21.2 24.5C18.2 22.2 15.2 20.4 11.5 19.5Z"
            fill="#9A7024"
          />
          <path
            d="M32.5 19.5C30.8 23.2 27.2 25 22.8 24.5C25.8 22.2 28.8 20.4 32.5 19.5Z"
            fill="#9A7024"
          />
          <path
            d="M14 27.8C17.2 29.8 26.8 29.8 30 27.8C27.2 31.4 16.8 31.4 14 27.8Z"
            fill="#B58938"
          />
          <circle cx="22" cy="33" r="1.4" fill="#9A7024" />
        </svg>
      )}
      <span className="font-serif-display text-xl sm:text-2xl font-semibold tracking-tight text-[#1C1917]">
        {displayTitle}
      </span>
    </span>
  );
}
