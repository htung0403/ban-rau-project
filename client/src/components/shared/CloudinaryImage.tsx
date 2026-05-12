import React from 'react';
import { optimizeCloudinaryUrl, CloudinarySize } from '../../lib/cloudinaryUrl';

interface CloudinaryImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  size?: CloudinarySize | number;
  fallbackSrc?: string;
}

export const CloudinaryImage: React.FC<CloudinaryImageProps> = ({
  src,
  size = 'md',
  fallbackSrc,
  alt,
  className,
  ...rest
}) => {
  const optimizedSrc = optimizeCloudinaryUrl(src, size);
  const finalSrc = optimizedSrc || fallbackSrc || '';

  return (
    <img
      src={finalSrc}
      alt={alt || ''}
      className={className}
      loading="lazy"
      {...rest}
    />
  );
};
