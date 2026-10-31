import apiClient from '../api/client.js';

// Attachments are stored on the message as a JSON array of
// { url, name, mimeType, size }. Keeping the shape in one place means the three
// chat surfaces (guest, admin, host) cannot drift apart on naming.
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;
export const ALLOWED_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
export const ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_TYPES.join(',');

export function isPdf(attachment) {
  return attachment?.mimeType === 'application/pdf' || /\.pdf$/i.test(attachment?.name || '');
}

// Returns a short message instead of throwing: the composer shows it next to the
// field, where the person who picked the file will actually look.
export function validateAttachmentFile(file) {
  if (!file) return 'That file could not be read.';
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) return `${file.name} is not an image or PDF.`;
  if (file.size > MAX_ATTACHMENT_BYTES) return `${file.name} is larger than 15 MB.`;
  return '';
}

// Tolerates text from the API, an already-parsed array, or null, so a message
// saved before attachments existed still renders.
export function parseAttachments(raw) {
  if (!raw) return [];
  let list = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((entry) => entry && typeof entry.url === 'string' && entry.url)
    .map((entry) => ({
      url: entry.url,
      name: typeof entry.name === 'string' && entry.name ? entry.name : 'Attachment',
      mimeType: typeof entry.mimeType === 'string' ? entry.mimeType : '',
      size: Number(entry.size) > 0 ? Number(entry.size) : 0,
    }));
}

export function formatAttachmentSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadAttachments(files) {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  const response = await apiClient.post('/uploads/attachments', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return parseAttachments(response.data?.data?.files);
}
