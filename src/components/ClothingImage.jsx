import React, { useEffect, useState } from 'react';
import { Shirt } from 'lucide-react';

export function ClothingImage({
  src,
  alt = '',
  className,
  fallbackClassName,
  iconClassName = 'size-5',
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />;
  }

  return (
    <span className={fallbackClassName} aria-label={alt || 'ไม่มีรูป'}>
      <Shirt className={iconClassName} />
    </span>
  );
}

export default ClothingImage;
