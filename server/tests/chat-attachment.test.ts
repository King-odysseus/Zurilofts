/**
 * Which stored files are private conversation attachments, and what a request
 * may ask for.
 *
 * A guest's passport scan or a host's contract used to be readable by anyone
 * holding its URL, because it sat in the public upload directory. These tests
 * pin the rule that keeps that from coming back: a `msg-` file is never public,
 * and only a generated name is ever looked up.
 *
 * Run from server/:
 *   node --import tsx --test tests/chat-attachment.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  chatAttachmentFilename,
  isChatAttachmentFilename,
  isChatAttachmentUrl,
  requestsChatAttachment,
} from '../src/utils/chatAttachment.js';

test('a generated chat filename is recognised', () => {
  for (const name of [
    'msg-1730000000000-ab12cd34.jpg',
    'msg-1730000000000-ab12cd34.pdf',
    'msg-1730000000000-ab12cd34',
  ]) {
    assert.equal(isChatAttachmentFilename(name), true, name);
  }
});

test('listing photos and avatars are not chat attachments', () => {
  // These must stay public: the public site renders them for visitors.
  for (const name of ['prop-1730000000000-ab12cd34.jpg', 'avatar-1730000000000-ab12cd34.jpg']) {
    assert.equal(isChatAttachmentFilename(name), false, name);
    assert.equal(requestsChatAttachment(name), false, name);
  }
});

test('a lookalike name is not accepted as one of ours', () => {
  for (const name of [
    'msg-.pdf',
    'msg-../../../etc/passwd',
    'msg-1730000000000-ab12cd34.svg',
    'MSG-1730000000000-ab12cd34.exe',
    'msg-1730000000000-ab12cd34.pdf.php',
    'x-msg-1730000000000-ab12cd34.jpg',
  ]) {
    assert.equal(isChatAttachmentFilename(name), false, name);
  }
});

test('the filename is read from a local path or a delivery URL alike', () => {
  assert.equal(chatAttachmentFilename('/uploads/msg-173-abc.pdf'), 'msg-173-abc.pdf');
  assert.equal(
    chatAttachmentFilename('https://res.cloudinary.com/x/raw/upload/v1/zurilofts/msg-173-abc.pdf'),
    'msg-173-abc.pdf'
  );
  // Query strings and fragments are not part of the name.
  assert.equal(chatAttachmentFilename('/uploads/msg-173-abc.jpg?x=1#y'), 'msg-173-abc.jpg');
  // A percent-encoded name is decoded before it is checked.
  assert.equal(chatAttachmentFilename('/uploads/msg-173-abc%2Epdf'), 'msg-173-abc.pdf');
});

test('a URL that is not ours yields no filename', () => {
  for (const url of [
    'https://evil.example/msg-173-abc.pdf',
    'https://evil.example/uploads/msg-173-abc.pdf',
    '/uploads/prop-173-abc.jpg',
    'javascript:alert(1)',
    '',
  ]) {
    assert.equal(chatAttachmentFilename(url), null, url);
    assert.equal(isChatAttachmentUrl(url), false, url);
  }
});

test('malformed encoding is refused rather than throwing', () => {
  assert.equal(chatAttachmentFilename('/uploads/msg-%E0%A4%A.pdf'), null);
});

test('the static guard catches a chat file on any suffix', () => {
  // The guard runs before the static handler, so it must match even a name the
  // static handler would never serve.
  assert.equal(requestsChatAttachment('msg-173-abc.jpg'), true);
  assert.equal(requestsChatAttachment('msg-173-abc'), true);
  assert.equal(requestsChatAttachment('msg-anything'), true);
  assert.equal(requestsChatAttachment('MsG-173-abc.jpg'), true);
});

test('an encoded name cannot slip past the guard', () => {
  // express.static decodes the path before it looks at the disk, so the guard
  // has to decode it too. Before this rule `/%6dsg-...` passed the raw check and
  // then served the decoded private file - proved with a live probe.
  assert.equal(requestsChatAttachment('/%6dsg-173-abc.pdf'), true);
  assert.equal(requestsChatAttachment('/uploads/%6Dsg-173-abc.pdf'), true);
  assert.equal(requestsChatAttachment('/uploads/msg-173-abc.pdf'), true);
  // Not a bypass: one decode (what `send` does) leaves `%6dsg-`, a name that
  // does not exist on disk, so double encoding cannot reach the file either.
  assert.equal(requestsChatAttachment('/%256dsg-173-abc.pdf'), false);
  // Malformed encoding is refused rather than guessed at.
  assert.equal(requestsChatAttachment('/%zz/msg-173-abc.pdf'), true);
  assert.equal(requestsChatAttachment('/uploads/%E0%A4%A.pdf'), true);
  // A normal photo of a listing stays public.
  assert.equal(requestsChatAttachment('/uploads/prop-173-abc.jpg'), false);
  assert.equal(requestsChatAttachment('/uploads/avatar-173-abc.jpg'), false);
});
