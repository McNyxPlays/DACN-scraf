// src/components/ImageWithFallback.jsx
import React, { useState, useEffect } from "react";

const ImageWithFallback = ({ 
  src, 
  alt = "", 
  className = "", 
  fallbackSrc = "/fallback.png",  
  skeletonClass = "bg-gray-200 animate-pulse"
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Reset state khi src thay đổi
  useEffect(() => {
    setImgSrc(src);
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    if (!hasError && imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(true);
      setIsLoading(true); // Tải lại fallback
    } else {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Skeleton khi loading */}
      {isLoading && (
        <div className={`absolute inset-0 ${skeletonClass} rounded-lg`}></div>
      )}

      {/* Hình ảnh chính */}
      <img
        src={imgSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"  // Tối ưu tải
      />

      {/* Fallback UI khi cả src và fallback đều lỗi */}
      {!isLoading && hasError && imgSrc === fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <i className="ri-image-line text-4xl text-gray-400"></i>
            <p className="text-xs text-gray-500 mt-1">No Image</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageWithFallback;