'use client';

import Image from 'next/image';

export function SuManLogo({
  className = '',
  height = 40,
  priority = false,
}: {
  className?: string;
  height?: number;
  priority?: boolean;
}) {
  const width = Math.round(height * (420 / 142));
  return (
    <Image
      src="/su-courier.png"
      alt="SuMan Kuryer"
      width={width}
      height={height}
      priority={priority}
      className={`h-auto w-auto object-contain object-center ${className}`}
      style={{ height, width: 'auto' }}
    />
  );
}

export function KhamsaCredit({
  variant = 'footer',
}: {
  variant?: 'footer' | 'compact' | 'sidebar';
}) {
  if (variant === 'compact') {
    return (
      <a
        href="https://khamsacraft.az"
        target="_blank"
        rel="noopener noreferrer"
        className="khamsa-credit khamsa-credit--compact"
        title="KhamsaCraft"
      >
        <Image
          src="/khamsa-logo.svg"
          alt="KhamsaCraft"
          width={100}
          height={31}
          className="khamsa-credit__logo"
        />
      </a>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className="khamsa-credit khamsa-credit--sidebar">
        <p className="khamsa-credit__label">Hazırlayan</p>
        <a
          href="https://khamsacraft.az"
          target="_blank"
          rel="noopener noreferrer"
          className="khamsa-credit__link"
        >
          <Image
            src="/khamsa-logo.svg"
            alt="KhamsaCraft"
            width={120}
            height={37}
            className="khamsa-credit__logo"
          />
        </a>
      </div>
    );
  }

  return (
    <div className="khamsa-credit khamsa-credit--footer">
      <a
        href="https://khamsacraft.az"
        target="_blank"
        rel="noopener noreferrer"
        className="khamsa-credit__link"
      >
        <Image
          src="/khamsa-logo.svg"
          alt="KhamsaCraft"
          width={110}
          height={34}
          className="khamsa-credit__logo"
        />
      </a>
      <p className="khamsa-credit__copy">© {new Date().getFullYear()} KhamsaCraft</p>
    </div>
  );
}
