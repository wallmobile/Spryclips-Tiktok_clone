import React, { useState, useRef, useEffect, memo, useCallback } from 'react';

const OptimizedImage = memo(({ 
  src, 
  alt, 
  className, 
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E',
  lazy = true 
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  const loadImage = useCallback(() => {
    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      setHasError(false);
    };
    img.onerror = () => {
      setHasError(true);
      setImageSrc(placeholder);
    };
    img.src = src;
  }, [placeholder, src]);

  useEffect(() => {
    if (!lazy) {
      loadImage();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );

    const currentImage = imgRef.current;
    if (currentImage) {
      observer.observe(currentImage);
    }

    return () => {
      if (currentImage) {
        observer.unobserve(currentImage);
      }
    };
  }, [lazy, loadImage]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={className}
      style={{
        opacity: isLoaded ? 1 : 0.5,
        transition: 'opacity 0.3s',
        objectFit: 'cover'
      }}
      loading={lazy ? 'lazy' : 'eager'}
      data-has-error={hasError ? 'true' : 'false'}
      onError={() => {
        setHasError(true);
        setImageSrc(placeholder);
      }}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;

