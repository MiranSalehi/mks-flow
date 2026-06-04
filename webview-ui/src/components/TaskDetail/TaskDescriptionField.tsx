import { useCallback, useEffect, useRef, useState } from 'react';
import type { TaskDescriptionImage } from '../../types/messages';
import { useVSCode } from '../../hooks/useVSCode';
import {
  blobToBase64,
  readClipboardImages,
} from '../../utils/clipboardImages';
import { Button } from '../shared/Button';

interface TaskDescriptionFieldProps {
  taskId: string;
  description: string;
  images: TaskDescriptionImage[];
  onDescriptionChange: (value: string) => void;
}

export function TaskDescriptionField({
  taskId,
  description,
  images,
  onDescriptionChange,
}: TaskDescriptionFieldProps) {
  const { postMessage } = useVSCode();
  const rootRef = useRef<HTMLDivElement>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const attachImages = useCallback(
    async (payloads: Awaited<ReturnType<typeof readClipboardImages>>) => {
      for (const payload of payloads) {
        const dataBase64 = await blobToBase64(payload.blob);
        postMessage({
          type: 'ATTACH_TASK_IMAGE',
          taskId,
          fileName: payload.fileName,
          mimeType: payload.mimeType,
          dataBase64,
        });
      }
      if (payloads.length > 0) {
        setPasteError(null);
      }
    },
    [postMessage, taskId],
  );

  const handleClipboardImages = useCallback(
    async (event?: ClipboardEvent) => {
      setPasteError(null);
      const payloads = await readClipboardImages(event);
      if (payloads.length === 0) {
        return false;
      }

      if (event) {
        event.preventDefault();
      }

      await attachImages(payloads);
      return true;
    },
    [attachImages],
  );

  const pasteFromClipboard = useCallback(async () => {
    setPasteError(null);
    const attached = await handleClipboardImages();
    if (attached) {
      return;
    }

    postMessage({ type: 'PASTE_TASK_IMAGE_FROM_CLIPBOARD', taskId });
  }, [handleClipboardImages, postMessage, taskId]);

  useEffect(() => {
    const onPaste = (event: Event) => {
      if (!(event instanceof ClipboardEvent)) {
        return;
      }

      const root = rootRef.current;
      if (!root) {
        return;
      }

      const target = event.target as Node | null;
      const active = document.activeElement;
      const inField =
        (target && root.contains(target)) ||
        (active && root.contains(active));

      if (!inField) {
        return;
      }

      void handleClipboardImages(event).then((attached) => {
        if (attached) {
          return;
        }

        const text = event.clipboardData?.getData('text/plain')?.trim();
        const hasImageType = Array.from(event.clipboardData?.types ?? []).some(
          (type) => type.startsWith('image/'),
        );

        if (hasImageType || !text) {
          postMessage({ type: 'PASTE_TASK_IMAGE_FROM_CLIPBOARD', taskId });
        }
      });
    };

    document.addEventListener('paste', onPaste, true);
    return () => document.removeEventListener('paste', onPaste, true);
  }, [handleClipboardImages, postMessage, taskId]);

  return (
    <div className="task-description-field" ref={rootRef}>
      <textarea
        id="task-description"
        className="textarea"
        value={description}
        placeholder="Describe the task…"
        onChange={(event) => onDescriptionChange(event.target.value)}
      />

      <div className="task-description-field__toolbar">
        <Button
          variant="secondary"
          onClick={() => postMessage({ type: 'PICK_TASK_IMAGES', taskId })}
        >
          Attach image
        </Button>
        <Button variant="secondary" onClick={() => void pasteFromClipboard()}>
          Paste from clipboard
        </Button>
      </div>

      <p className="task-description-field__hint">
        Ctrl+V / Cmd+V in the description field to paste a copied screenshot
      </p>

      {pasteError ? (
        <p className="task-description-field__error">{pasteError}</p>
      ) : null}

      {images.length > 0 ? (
        <div className="task-description-field__gallery">
          {images.map((image) => (
            <figure key={image.id} className="task-description-field__thumb">
              {image.uri ? (
                <img src={image.uri} alt={image.fileName} loading="lazy" />
              ) : (
                <div className="task-description-field__thumb-placeholder">
                  {image.fileName}
                </div>
              )}
              <figcaption>{image.fileName}</figcaption>
              <button
                type="button"
                className="task-description-field__remove"
                aria-label={`Remove ${image.fileName}`}
                onClick={() =>
                  postMessage({
                    type: 'REMOVE_TASK_IMAGE',
                    taskId,
                    imageId: image.id,
                  })
                }
              >
                ×
              </button>
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}
