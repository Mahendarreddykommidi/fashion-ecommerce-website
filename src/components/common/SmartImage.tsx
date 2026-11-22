import React, { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { cn } from '../../lib/format.ts';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
  aspectClassName?: string;
}

export function SmartImage({
  src,
  alt,
  className,
  fallbackTitle,
  aspectClassName,
  ...props
}: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt || fallbackTitle || 'ATELIER product photography'}
        className={cn(
          'flex flex-col items-center justify-center bg-[#F2F2EF] text-[#777777] p-6 text-center',
          aspectClassName,
          className
        )}
      >
        <ShoppingBag className="w-7 h-7 mb-2 opacity-50" />
        <span className="text-xs font-medium tracking-wide uppercase text-[#171717]/60 max-w-[180px] line-clamp-2">
          {fallbackTitle || alt || 'ATELIER'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={props.loading || 'lazy'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
      {...props}
    />
  );
}
