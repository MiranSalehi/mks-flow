import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TaskDescriptionImage } from '../../types/messages';
import { Button } from '../shared/Button';

interface MediaPreviewLightboxProps {
  media: TaskDescriptionImage;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function MediaPreviewLightbox({
  media,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: MediaPreviewLightboxProps) {
  const isVideo = media.mimeType.startsWith('video/');
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setZoomed(false);
  }, [media.id, media.uri]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (zoomed && !isVideo) {
          setZoomed(false);
          return;
        }
        onClose();
        return;
      }

      if (event.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        event.preventDefault();
        onPrevious();
        return;
      }

      if (event.key === 'ArrowRight' && hasNext && onNext) {
        event.preventDefault();
        onNext();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [hasNext, hasPrevious, isVideo, onClose, onNext, onPrevious, zoomed]);

  const toggleZoom = () => {
    if (!isVideo) {
      setZoomed((current) => !current);
    }
  };

  return createPortal(
    <div
      className="media-preview-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="media-preview"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${media.fileName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="media-preview__header">
          <span className="media-preview__title">{media.fileName}</span>
          <div className="media-preview__actions">
            {!isVideo ? (
              <Button
                variant="ghost"
                className="media-preview__action"
                onClick={toggleZoom}
                aria-label={zoomed ? 'Fit to screen' : 'Zoom to actual size'}
              >
                {zoomed ? 'Fit' : '1:1'}
              </Button>
            ) : null}
            {hasPrevious ? (
              <Button
                variant="ghost"
                className="media-preview__action"
                onClick={onPrevious}
                aria-label="Previous"
              >
                ‹
              </Button>
            ) : null}
            {hasNext ? (
              <Button
                variant="ghost"
                className="media-preview__action"
                onClick={onNext}
                aria-label="Next"
              >
                ›
              </Button>
            ) : null}
            <Button
              variant="ghost"
              className="media-preview__action"
              onClick={onClose}
              aria-label="Close preview"
            >
              ×
            </Button>
          </div>
        </header>

        <div
          className={`media-preview__body${
            zoomed ? ' media-preview__body--zoomed' : ''
          }`}
        >
          {isVideo ? (
            <video
              key={media.uri}
              src={media.uri}
              controls
              autoPlay
              playsInline
              className="media-preview__video"
            />
          ) : (
            <img
              key={media.uri}
              src={media.uri}
              alt={media.fileName}
              className={`media-preview__image${
                zoomed ? ' media-preview__image--zoomed' : ''
              }`}
              onClick={toggleZoom}
            />
          )}
        </div>

        {!isVideo ? (
          <p className="media-preview__hint">
            {zoomed
              ? 'Click image or press Esc to fit · Esc again to close'
              : 'Click image for actual size · Esc to close'}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
