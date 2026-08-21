'use client';

import { trackEvent } from '@/lib/analytics';

type Props = {
  href: string;
  event: string;
  location: string;
  className?: string;
  children: React.ReactNode;
  external?: boolean;
};

/** An anchor that reports its click to GA4 before navigating. */
export default function TrackedLink({
  href,
  event,
  location,
  className,
  children,
  external,
}: Props) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => trackEvent(event, { location })}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
}
