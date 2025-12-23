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
    // Log thumbnail loading attempts for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('🖼️ OptimizedImage: Loading image:', { src, alt });
    }
    
    // Check if src is valid
    if (!src || src.trim() === '') {
      console.warn('⚠️ OptimizedImage: Empty src provided', { alt });
      setHasError(true);
      setImageSrc(placeholder);
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ OptimizedImage: Image loaded successfully:', src);
      }
      setImageSrc(src);
      setIsLoaded(true);
      setHasError(false);
    };
    img.onerror = (error) => {
      console.error('❌ OptimizedImage: Failed to load image:', { src, alt, error });
      setHasError(true);
      setImageSrc(placeholder);
    };
    img.src = src;
  }, [placeholder, src, alt]);

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
      onError={(e) => {
        console.error('❌ OptimizedImage: Image onError triggered:', { src, alt });
        setHasError(true);
        setImageSrc(placeholder);
      }}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;

