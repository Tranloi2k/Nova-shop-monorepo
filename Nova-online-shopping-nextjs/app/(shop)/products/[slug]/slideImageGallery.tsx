"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { SafeImage } from "@/app/ui/shared/safe-image";
import { Icon } from "@/app/ui/nova/nova-icons";
import { useFocusTrap } from "@/app/lib/hooks/use-focus-trap";

export default function SlideImageGallery({
  images,
  name,
}: Readonly<{
  images: string[];
  name: string;
}>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const thumbs = images.slice(0, 6);
  const zoomRef = useFocusTrap<HTMLDialogElement>(zoomOpen, () => setZoomOpen(false));

  const showPrevious = () =>
    setCurrentIndex((index) => (index - 1 + images.length) % images.length);
  const showNext = () =>
    setCurrentIndex((index) => (index + 1) % images.length);

  useEffect(() => {
    if (!zoomOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [zoomOpen]);

  return (
    <div className="pdp-gallery-viewer">
      <div className="pdp-stage-wrap">
        <button
          type="button"
          className="pdp-stage pdp-stage-button"
          onClick={() => setZoomOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") showPrevious();
            if (event.key === "ArrowRight") showNext();
          }}
          aria-label={`Enlarge ${name} image ${currentIndex + 1}`}
        >
          <SafeImage
            src={images[currentIndex]}
            alt={`${name}, view ${currentIndex + 1} of ${images.length}`}
            fill
            className="object-contain p-8 md:p-12"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={currentIndex === 0}
            fetchPriority={currentIndex === 0 ? "high" : "auto"}
            style={{ position: "absolute", inset: 0 }}
          />
          <span className="pdp-zoom-hint">
            <Icon name="search" size={16} /> Enlarge
          </span>
        </button>
        <button
          type="button"
          className="pdp-gallery-nav pdp-gallery-prev"
          onClick={showPrevious}
          aria-label="Previous product image"
        >
          <Icon name="chevron" size={20} />
        </button>
        <button
          type="button"
          className="pdp-gallery-nav pdp-gallery-next"
          onClick={showNext}
          aria-label="Next product image"
        >
          <Icon name="chevron" size={20} />
        </button>
        <span className="pdp-image-count" aria-live="polite">
          {currentIndex + 1} / {images.length}
        </span>
      </div>
      <div className="pdp-thumbs" aria-label="Choose a product image">
        {thumbs.map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={() => setCurrentIndex(index)}
            className={clsx("pdp-thumb tile", currentIndex === index && "is-active")}
            aria-label={`Show ${name} image ${index + 1}`}
            aria-pressed={currentIndex === index}
          >
            <div style={{ position: "relative", width: "60%", height: "60%" }}>
              <SafeImage
                src={image}
                alt={`${name} ${index + 1}`}
                fill
                className="object-contain"
                sizes="80px"
              />
            </div>
          </button>
        ))}
      </div>

      {zoomOpen && (
        <dialog
          open
          ref={zoomRef}
          className="pdp-zoom"
          aria-label={`${name} enlarged image`}
        >
          <button
            type="button"
            className="dialog-dismiss-layer"
            onClick={() => setZoomOpen(false)}
            aria-label="Close enlarged image"
            tabIndex={-1}
          />
          <button
            type="button"
            className="icon-btn pdp-zoom-close"
            onClick={() => setZoomOpen(false)}
            aria-label="Close enlarged image"
          >
            <Icon name="close" size={24} />
          </button>
          <div className="pdp-zoom-image">
            <SafeImage
              src={images[currentIndex]}
              alt={`${name}, enlarged view ${currentIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </dialog>
      )}
    </div>
  );
}
