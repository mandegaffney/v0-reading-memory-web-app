'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const SIZE = {
  sm: { cls: 'w-8  h-8',  text: 'text-sm',  img: '32px'  },
  md: { cls: 'w-10 h-10', text: 'text-sm',  img: '40px'  },
  lg: { cls: 'w-14 h-14', text: 'text-lg',  img: '56px'  },
} as const;

interface AuthorAvatarProps {
  name: string;
  photoUrl?: string | null;
  isLoading?: boolean;
  size?: keyof typeof SIZE;
  className?: string;
}

export function AuthorAvatar({
  name,
  photoUrl,
  isLoading = false,
  size = 'md',
  className,
}: AuthorAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const { cls, text, img } = SIZE[size];

  if (isLoading) {
    return (
      <div className={cn('rounded-full bg-muted animate-pulse shrink-0', cls, className)} />
    );
  }

  const showPhoto = !!photoUrl && !imgError;

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center',
        cls,
        className
      )}
    >
      {showPhoto ? (
        <Image
          src={photoUrl}
          alt={name}
          width={parseInt(img)}
          height={parseInt(img)}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={cn('font-serif font-medium text-muted-foreground select-none', text)}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
