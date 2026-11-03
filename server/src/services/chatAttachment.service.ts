import fs from 'fs';
import path from 'path';
import prisma from '../config/prisma.js';
import { NotFoundError } from '../types/index.js';
import { UPLOAD_DIR } from '../utils/imageStorage.js';
import { chatAttachmentFilename, isChatAttachmentFilename } from '../utils/chatAttachment.js';
import { parseAttachments } from '../utils/messageAttachments.js';

/**
 * Delivery of a conversation attachment to someone allowed to read it.
 *
 * These files used to sit in the public upload directory, so the only thing
 * protecting a guest's passport scan or a host's contract was an unguessable
 * name in a URL. A link forwarded to one person was readable by anyone who saw
 * it, forever, without signing in.
 *
 * Now the bytes are served only after the requester is matched against the
 * message that carries the file: the sender and the recipient of that thread, or
 * an administrator. A miss and a refusal both answer the same way, so the route
 * cannot be used to learn whether a name exists.
 */

export interface AuthorizedAttachment {
  bytes: Buffer;
  name: string;
  mimeType: string;
}

interface Holder {
  url: string;
  name: string;
  mimeType: string;
}

/** The stored entry for this filename on a message, if the message carries it. */
function findHolder(rawAttachments: string | null, filename: string): Holder | null {
  for (const entry of parseAttachments(rawAttachments)) {
    if (chatAttachmentFilename(entry.url) === filename) {
      return { url: entry.url, name: entry.name, mimeType: entry.mimeType };
    }
  }
  return null;
}

async function bytesFor(holder: Holder, filename: string): Promise<Buffer> {
  if (holder.url.startsWith('/uploads/')) {
    // Path comes from the stored row and is re-checked, so neither the request
    // nor a hand-edited column can point outside the upload directory.
    if (!isChatAttachmentFilename(filename)) throw new NotFoundError('Attachment');
    const filePath = path.join(UPLOAD_DIR, filename);
    try {
      return await fs.promises.readFile(filePath);
    } catch {
      // The row outlived the file (dev disk wiped, storage cleaned): that is a
      // missing file, not a server fault.
      throw new NotFoundError('Attachment');
    }
  }

  // Cloudinary delivery. Fetched server-side so the requester never receives a
  // durable public URL, and capped so a misbehaving response cannot exhaust
  // memory.
  const response = await fetch(holder.url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new NotFoundError('Attachment');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 20 * 1024 * 1024) throw new NotFoundError('Attachment');
  return buffer;
}

/**
 * Resolve a chat attachment for a requester, or throw NotFound.
 *
 * `isAdmin` is the caller's admin authority, not a stored flag: an
 * administrator needs to read a reported conversation, and nothing else does.
 */
export async function readChatAttachment(
  filename: string,
  requester: { userId: string; isAdmin: boolean },
): Promise<AuthorizedAttachment> {
  if (!isChatAttachmentFilename(filename)) throw new NotFoundError('Attachment');

  // A support thread file.
  const supportMessage = await prisma.message.findFirst({
    where: { attachments: { contains: filename } },
    select: { userId: true, attachments: true },
  });
  if (supportMessage) {
    const holder = findHolder(supportMessage.attachments, filename);
    if (holder && (requester.isAdmin || supportMessage.userId === requester.userId)) {
      return { bytes: await bytesFor(holder, filename), name: holder.name, mimeType: holder.mimeType };
    }
  }

  // A booking conversation file.
  const conversationMessage = await prisma.conversationMessage.findFirst({
    where: { attachments: { contains: filename } },
    select: {
      attachments: true,
      conversation: {
        select: { booking: { select: { userId: true, property: { select: { hostId: true } } } } },
      },
    },
  });
  if (conversationMessage) {
    const holder = findHolder(conversationMessage.attachments, filename);
    const booking = conversationMessage.conversation.booking;
    const allowed =
      requester.isAdmin || booking.userId === requester.userId || booking.property.hostId === requester.userId;
    if (holder && allowed) {
      return { bytes: await bytesFor(holder, filename), name: holder.name, mimeType: holder.mimeType };
    }
  }

  // Same answer whether the file does not exist or the requester may not read
  // it, so the route cannot be used to enumerate stored files.
  throw new NotFoundError('Attachment');
}
