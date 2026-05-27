import React from 'react';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 40, className }: LogoMarkProps) {
  return (
    <img
      src="/logo.svg"
      alt="Customs Analyzer"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    />
  );
}
