export interface ClipboardImagePayload {
  blob: Blob;
  mimeType: string;
  fileName: string;
}

/** Reads image blobs from a paste event and/or the async Clipboard API. */
export async function readClipboardImages(
  event?: ClipboardEvent,
): Promise<ClipboardImagePayload[]> {
  const fromEvent = readImagesFromDataTransfer(event?.clipboardData ?? null);
  if (fromEvent.length > 0) {
    return fromEvent;
  }

  return readImagesFromClipboardApi();
}

function readImagesFromDataTransfer(
  dataTransfer: DataTransfer | null,
): ClipboardImagePayload[] {
  if (!dataTransfer) {
    return [];
  }

  const results: ClipboardImagePayload[] = [];

  if (dataTransfer.files?.length) {
    for (let index = 0; index < dataTransfer.files.length; index++) {
      const file = dataTransfer.files[index];
      if (file.type.startsWith('image/')) {
        results.push({
          blob: file,
          mimeType: file.type,
          fileName: file.name || defaultFileName(file.type),
        });
      }
    }
  }

  if (results.length > 0) {
    return results;
  }

  if (dataTransfer.items) {
    for (let index = 0; index < dataTransfer.items.length; index++) {
      const item = dataTransfer.items[index];
      if (!item.type.startsWith('image/')) {
        continue;
      }

      const file = item.getAsFile();
      if (!file) {
        continue;
      }

      results.push({
        blob: file,
        mimeType: item.type,
        fileName: file.name || defaultFileName(item.type),
      });
    }
  }

  return results;
}

async function readImagesFromClipboardApi(): Promise<ClipboardImagePayload[]> {
  if (!navigator.clipboard?.read) {
    return [];
  }

  try {
    const items = await navigator.clipboard.read();
    const results: ClipboardImagePayload[] = [];

    for (const item of items) {
      for (const type of item.types) {
        if (!type.startsWith('image/')) {
          continue;
        }

        const blob = await item.getType(type);
        results.push({
          blob,
          mimeType: type,
          fileName: defaultFileName(type),
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read image'));
        return;
      }

      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('Invalid image data'));
        return;
      }

      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
    reader.readAsDataURL(blob);
  });
}

function defaultFileName(mimeType: string): string {
  return `pasted-image.${extensionForMime(mimeType)}`;
}

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return 'png';
  }
}
