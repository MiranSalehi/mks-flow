export interface CloudAttachmentRef {
  id: string;
  fileName: string;
  kind: 'image' | 'video';
}

const IMAGE_PATTERN = /!\[([^\]]*)\]\(attachment:([^)]+)\)/g;
const VIDEO_PATTERN = /\[video\]\(attachment:([^)]+)\)/g;

/** Parses cloud attachment markers embedded in task descriptions. */
export function parseCloudAttachmentRefs(description: string): CloudAttachmentRef[] {
  const refs: CloudAttachmentRef[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = IMAGE_PATTERN.exec(description)) !== null) {
    const id = match[2]?.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    refs.push({
      id,
      fileName: match[1]?.trim() || id,
      kind: 'image',
    });
  }

  while ((match = VIDEO_PATTERN.exec(description)) !== null) {
    const id = match[1]?.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    refs.push({
      id,
      fileName: 'video',
      kind: 'video',
    });
  }

  return refs;
}

/** Removes attachment markdown blocks from a cloud description for editing/display. */
export function stripCloudAttachmentMarkdown(description: string): string {
  return description
    .replace(IMAGE_PATTERN, '')
    .replace(VIDEO_PATTERN, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Returns attachment markdown blocks from a cloud description (preserved on save). */
export function extractCloudAttachmentMarkdown(description: string): string {
  const blocks: string[] = [];
  let match: RegExpExecArray | null;

  const imagePattern = new RegExp(IMAGE_PATTERN.source, 'g');
  while ((match = imagePattern.exec(description)) !== null) {
    blocks.push(match[0]);
  }

  const videoPattern = new RegExp(VIDEO_PATTERN.source, 'g');
  while ((match = videoPattern.exec(description)) !== null) {
    blocks.push(match[0]);
  }

  return blocks.join('\n\n');
}

/** Merges preserved attachment markdown with edited plain description text. */
export function mergeCloudDescription(
  preservedMarkdown: string,
  editedText: string,
): string {
  const body = editedText.trim();
  if (!preservedMarkdown) {
    return body;
  }
  if (!body) {
    return preservedMarkdown.trim();
  }
  return `${body}\n\n${preservedMarkdown.trim()}`;
}
