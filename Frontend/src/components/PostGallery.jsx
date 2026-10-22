
import { useEffect, useState } from "react";
import "./PostGallery.css";

export default function PostGallery({ images = [] }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const photos = (Array.isArray(images) ? images : [])
    .filter((image) => typeof image === "string" && image.trim())
    .slice(0, 5);

  const photoCount = photos.length;

  useEffect(() => {
    if (activeIndex === null) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((index) => (index + 1) % photoCount);
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex(
          (index) => (index - 1 + photoCount) % photoCount
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, photoCount]);

  if (photoCount === 0) return null;

  const showPrevious = () => {
    setActiveIndex((index) =>
      (index - 1 + photoCount) % photoCount
    );
  };

  const showNext = () => {
    setActiveIndex((index) =>
      (index + 1) % photoCount
    );
  };

  return (
    <>
      <div
        className={`mc-post-gallery mc-gallery-${photoCount}`}
      >
        {photos.map((photo, index) => (
          <button
            key={`${photo}-${index}`}
            className="mc-gallery-item"
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`Open photo ${index + 1} of ${photoCount}`}
          >
            <img
              src={photo}
              alt={`Post photo ${index + 1}`}
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <div
          className="mc-photo-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Post photo viewer"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setActiveIndex(null);
            }
          }}
        >
          <button
            className="mc-viewer-close"
            type="button"
            onClick={() => setActiveIndex(null)}
            aria-label="Close photo viewer"
          >
            ×
          </button>

          {photoCount > 1 && (
            <button
              className="mc-viewer-arrow mc-viewer-prev"
              type="button"
              onClick={showPrevious}
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          <img
            className="mc-viewer-image"
            src={photos[activeIndex]}
            alt={`Photo ${activeIndex + 1}`}
          />

          {photoCount > 1 && (
            <button
              className="mc-viewer-arrow mc-viewer-next"
              type="button"
              onClick={showNext}
              aria-label="Next photo"
            >
              ›
            </button>
          )}

          <div className="mc-viewer-counter">
            {activeIndex + 1} / {photoCount}
          </div>
        </div>
      )}
    </>
  );
}
