import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { TaskDescriptionImage } from '../../types/messages';
import { useVSCode } from '../../hooks/useVSCode';
import {
  blobToBase64,
  readClipboardImages,
} from '../../utils/clipboardImages';
import {
  TaskDescriptionEditor,
  type TaskDescriptionEditorHandle,
} from './TaskDescriptionEditor';
import { MediaPreviewLightbox } from './MediaPreviewLightbox';

export interface TaskDescriptionFieldHandle {
  getDescription: () => string;
}

interface TaskDescriptionFieldProps {
  taskId: string;
  description: string;
  images: TaskDescriptionImage[];
  mediaUploadEnabled?: boolean;
  mediaRemoveEnabled?: boolean;
  readOnly?: boolean;
  onDescriptionChange: (value: string) => void;
}

export const TaskDescriptionField = forwardRef<
  TaskDescriptionFieldHandle,
  TaskDescriptionFieldProps
>(function TaskDescriptionField(
  {
    taskId,
    description,
    images,
    mediaUploadEnabled = true,
    mediaRemoveEnabled = true,
    readOnly = false,
    onDescriptionChange,
  },
  ref,
) {
  const { postMessage } = useVSCode();
  const editorRef = useRef<TaskDescriptionEditorHandle>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [resolvedUris, setResolvedUris] = useState<Record<string, string>>({});
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});
  const [previewId, setPreviewId] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getDescription: () => editorRef.current?.getValue() ?? description,
  }));

  const galleryImages = useMemo(
    () =>
      images.map((image) => ({
        ...image,
        uri: image.uri || resolvedUris[image.id] || '',
      })),
    [images, resolvedUris],
  );

  useEffect(() => {
    setResolvedUris({});
    setFailedIds({});
    setPreviewId(null);
  }, [taskId]);

  useEffect(() => {
    for (const image of images) {
      if (image.uri || resolvedUris[image.id] || failedIds[image.id]) {
        continue;
      }

      postMessage({
        type: 'RESOLVE_CLOUD_ATTACHMENT',
        taskId,
        attachmentId: image.id,
        mimeType: image.mimeType,
      });
    }
  }, [failedIds, images, postMessage, resolvedUris, taskId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = event.data as {
        type?: string;
        taskId?: string;
        attachmentId?: string;
        uri?: string;
      };

      if (message.taskId !== taskId || !message.attachmentId) {
        return;
      }

      if (message.type === 'CLOUD_ATTACHMENT_URI' && message.uri) {
        setResolvedUris((current) => ({
          ...current,
          [message.attachmentId!]: message.uri!,
        }));
        return;
      }

      if (message.type === 'CLOUD_ATTACHMENT_FAILED') {
        setFailedIds((current) => ({
          ...current,
          [message.attachmentId!]: true,
        }));
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [taskId]);

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

  const handleMediaPaste = useCallback(
    (event: ClipboardEvent) => {
      setPasteError(null);

      const items = event.clipboardData?.items;
      const hasMedia = Array.from(items ?? []).some(
        (item) => item.type.startsWith('image/') || item.type.startsWith('video/'),
      );

      if (!hasMedia) {
        return false;
      }

      event.preventDefault();

      void readClipboardImages(event).then((payloads) => {
        if (payloads.length > 0) {
          void attachImages(payloads);
          return;
        }

        postMessage({ type: 'PASTE_TASK_IMAGE_FROM_CLIPBOARD', taskId });
      });

      return true;
    },
    [attachImages, postMessage, taskId],
  );

  const previewIndex = previewId
    ? galleryImages.findIndex((image) => image.id === previewId)
    : -1;
  const previewMedia =
    previewIndex >= 0 && galleryImages[previewIndex]?.uri
      ? galleryImages[previewIndex]
      : null;

  const openPreview = (imageId: string) => {
    const target = galleryImages.find((image) => image.id === imageId);
    if (target?.uri) {
      setPreviewId(imageId);
    }
  };

  const findPreviewableIndex = (start: number, direction: -1 | 1): number => {
    let index = start;
    while (index >= 0 && index < galleryImages.length) {
      if (galleryImages[index]?.uri) {
        return index;
      }
      index += direction;
    }
    return -1;
  };

  return (
    <div className="task-description-field">
      <div className="task-description-field__header">
        <span className="field-label task-description-field__label">Description</span>
        {mediaUploadEnabled ? (
          <button
            type="button"
            className="task-description-field__add-media"
            onClick={() => postMessage({ type: 'PICK_TASK_IMAGES', taskId })}
          >
            <svg
              className="task-description-field__add-media-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
              />
            </svg>
            Add media
          </button>
        ) : null}
      </div>

      {mediaUploadEnabled ? (
        <p className="task-description-field__hint">
          Paste or attach images and videos — they appear below the editor.
        </p>
      ) : null}

      <TaskDescriptionEditor
        ref={editorRef}
        taskId={taskId}
        value={description}
        placeholder="Describe the task…"
        readOnly={readOnly}
        onChange={onDescriptionChange}
        onMediaPaste={mediaUploadEnabled ? handleMediaPaste : undefined}
      />

      {pasteError ? (
        <p className="task-description-field__error">{pasteError}</p>
      ) : null}

      {galleryImages.length > 0 ? (
        <div className="task-description-field__gallery">
          <p className="task-description-field__gallery-label">Attachments</p>
          <div className="task-description-field__gallery-grid">
            {galleryImages.map((image) => (
              <figure key={image.id} className="task-description-field__thumb">
                {image.uri ? (
                  <button
                    type="button"
                    className="task-description-field__thumb-open"
                    onClick={() => openPreview(image.id)}
                    aria-label={`Preview ${image.fileName}`}
                  >
                    {image.mimeType.startsWith('video/') ? (
                      <>
                        <video
                          src={image.uri}
                          muted
                          playsInline
                          preload="metadata"
                          className="task-description-field__video"
                        />
                        <span
                          className="task-description-field__play-badge"
                          aria-hidden
                        >
                          ▶
                        </span>
                      </>
                    ) : (
                      <img src={image.uri} alt={image.fileName} loading="lazy" />
                    )}
                  </button>
                ) : failedIds[image.id] ? (
                  <div className="task-description-field__thumb-placeholder task-description-field__thumb-placeholder--error">
                    Media unavailable — deploy latest mksflow-cloud
                  </div>
                ) : (
                  <div className="task-description-field__thumb-placeholder">
                    Loading…
                  </div>
                )}
                <figcaption>{image.fileName}</figcaption>
                {mediaRemoveEnabled ? (
                  <button
                    type="button"
                    className="task-description-field__remove"
                    aria-label={`Remove ${image.fileName}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      postMessage({
                        type: 'REMOVE_TASK_IMAGE',
                        taskId,
                        imageId: image.id,
                      });
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </figure>
            ))}
          </div>
        </div>
      ) : null}

      {previewMedia ? (
        <MediaPreviewLightbox
          media={previewMedia}
          onClose={() => setPreviewId(null)}
          hasPrevious={findPreviewableIndex(previewIndex - 1, -1) >= 0}
          hasNext={findPreviewableIndex(previewIndex + 1, 1) >= 0}
          onPrevious={() => {
            const index = findPreviewableIndex(previewIndex - 1, -1);
            if (index >= 0) {
              setPreviewId(galleryImages[index].id);
            }
          }}
          onNext={() => {
            const index = findPreviewableIndex(previewIndex + 1, 1);
            if (index >= 0) {
              setPreviewId(galleryImages[index].id);
            }
          }}
        />
      ) : null}
    </div>
  );
});
