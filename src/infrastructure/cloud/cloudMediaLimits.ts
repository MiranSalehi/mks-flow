export const CLOUD_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const CLOUD_MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Validates upload size against mksflow-cloud TaskMediaService limits. */
export function assertCloudMediaSize(mimeType: string, size: number): void {
  const isVideo = mimeType.startsWith('video/');
  const max = isVideo ? CLOUD_MAX_VIDEO_BYTES : CLOUD_MAX_IMAGE_BYTES;

  if (size > max) {
    throw new Error(
      isVideo
        ? 'Video must be 50 MB or smaller.'
        : 'Image must be 10 MB or smaller.',
    );
  }
}
