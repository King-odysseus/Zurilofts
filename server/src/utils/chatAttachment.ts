/**
 * Which stored files are conversation attachments, and what may be asked for.
 *
 * Chat files are the one upload family that is not public: they belong to a
 * private message between two people. Listing photos and avatars stay public
 * because the public site renders them, so the distinction is made here, from
 * the stored name, and both the delivery route and the static guard use it.
 *
 * The prefix is the whole signal. Every chat file the upload endpoint writes
 * starts with `msg-`; nothing else is allowed to reach it.
 */

// Generated names carry a timestamp and random hex after the prefix. A local
// file keeps the extension we chose; a Cloudinary raw upload is stored under a
// public id with no extension, so the extension is optional.
const CHAT_FILE_PATTERN = /^msg-[a-z0-9-]{1,80}(?:\.(?:jpg|jpeg|png|webp|pdf))?$/i;

export function isChatAttachmentFilename(name: string): boolean {
  return CHAT_FILE_PATTERN.test(name);
}

/**
 * The filename a stored attachment URL refers to, or null when the URL is not
 * one of ours.
 *
 * Only our two storage shapes are accepted: a local `/uploads/...` path, and a
 * Cloudinary delivery URL in our folder. A file name that merely looks generated
 * on somebody else's host is not ours, and this is also what stops the delivery
 * route being asked to fetch a foreign address on the server's behalf.
 */
export function chatAttachmentFilename(url: string): string | null {
  if (typeof url !== 'string') return null;

  const localPath = url.startsWith('/uploads/');
  const cloudinaryUrl = url.startsWith('https://res.cloudinary.com/') && url.includes('/zurilofts/');
  if (!localPath && !cloudinaryUrl) return null;

  // Query strings and fragments are not part of the name.
  const pathOnly = url.split(/[?#]/)[0];
  const lastSegment = pathOnly.split('/').pop();
  if (!lastSegment) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(lastSegment);
  } catch {
    // Malformed percent-encoding is caller input, not a server fault.
    return null;
  }

  return isChatAttachmentFilename(decoded) ? decoded : null;
}

/** True when a stored path or delivery URL names a chat attachment. */
export function isChatAttachmentUrl(url: string): boolean {
  return chatAttachmentFilename(url) !== null;
}

/**
 * True for a request path segment that specifically asks for a chat file.
 *
 * Used by the guard in front of the public upload directory: it must catch
 * `msg-...` on any suffix, including one a static handler would otherwise
 * normalise, so it deliberately does not require a valid extension.
 */
export function requestsChatAttachment(segment: string): boolean {
  return segment.toLowerCase().startsWith('msg-');
}
