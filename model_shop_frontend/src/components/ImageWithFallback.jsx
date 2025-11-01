// src/components/ImageWithFallback.jsx
import React, { useState } from "react";

const ImageWithFallback = ({ src, alt, className = "", fallback = null }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleError = () => {
    setError(true);
    setImgSrc(fallback || "/placeholder-product.jpg");
  };

  const handleLoad = () => {
    setLoading(false);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Loading skeleton */}
      {loading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg"></div>
      )}

      {/* Main image */}
      <img
        src={imgSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* Fallback UI khi lỗi */}
      {error && (
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