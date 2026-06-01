import React from 'react';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 40, className }: LogoMarkProps) {
  return (
    <img
      src="../../../dist/assets/remove-bg-(6).svg"
      alt="Azərbaycan Respublikası Dövlət Gömrük Komitəsi"
      width={size}
      height={size}
      className={className}
      // Vector source — preserve intrinsic 1:1 aspect ratio at every render size.
      style={{ display: 'block', flexShrink: 0, objectFit: 'contain' }}
      onError={(e) => {
        // Defensive: if the asset is ever moved/renamed, surface a clear console
        // signal instead of a silent empty box.
        // eslint-disable-next-line no-console
        console.error('LogoMark: failed to load /logo.svg', e);
      }}
    />
  );
}
