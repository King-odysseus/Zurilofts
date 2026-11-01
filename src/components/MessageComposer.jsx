import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownDivider, DropdownHeader, DropdownItem } from 'flowbite-react';
import { ArrowUp, FileText, Loader2, MessageSquareQuote, Paperclip, Plus, X } from 'lucide-react';
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  isPdf,
  parseAttachments,
  formatAttachmentSize,
  uploadAttachments,
  validateAttachmentFile,
} from '../utils/attachments.js';
import { useLanguage } from '../context/LanguageContext.jsx';

/**
 * The one message composer used by the guest inbox, support, the admin reply
 * panel and the host inbox.
 *
 * It is a single pill: the "+" control, the text field and the send arrow all
 * sit inside the same rounded shape, so the row reads as one object rather than
 * a field with satellites. The pill starts at 44px (fully rounded, like a text
 * bubble) and grows downwards with the text; `resize` stays off so the shape
 * never becomes a draggable box.
 *
 * The "+" is the only add control. One press offers the two things a reply is
 * usually built from - a file to attach, and a saved reply to drop in - instead
 * of scattering a paperclip and a separate quote button around the pill.
 *
 * `savedReplies` entries are `{ trigger, label, body, preview }`; picking one
 * calls `onInsertSavedReply` with the whole entry, because only the caller knows
 * how to merge placeholders into a draft.
 *
 * `onSubmit` receives the text and any already-uploaded attachments and must
 * resolve true once the message is accepted; only then is the input cleared, so
 * a failed send never loses what was typed.
 */

// The add menu follows the shared floating-panel look but is wider than a
// navigation menu, because a saved reply shows its label and a line of preview.
const ADD_MENU_THEME = {
  floating: {
    base: 'z-[70] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-elevated shadow-lg',
    content: 'max-h-[min(20rem,45vh)] overflow-y-auto py-1 text-sm text-navy',
    header: 'block px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted',
    item: {
      base: 'flex w-full items-start gap-2.5 px-3 py-2 text-left text-sm text-navy hover:bg-surface focus:bg-surface focus:outline-none',
    },
  },
};

// Shared shape for both round controls inside the pill. They are 36px, so with
// the pill's 4px padding the resting row is exactly 44px: a tap target that is
// also a perfect pill.
const INNER_BUTTON =
  'grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed';

export default function MessageComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  ariaLabel,
  sending = false,
  disabled = false,
  savedReplies = [],
  onInsertSavedReply,
  showAttach = true,
  className = '',
}) {
  const { t } = useLanguage();
  // A caller may pass its own wording; these are only the fallbacks, so the
  // field still has a name when nobody does.
  const fieldLabel = placeholder ?? t('a11y1.writeMessage');
  const composerLabel = ariaLabel ?? t('a11y1.message');
  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Reset to auto before measuring so deleting a line shrinks the pill again.
  useEffect(() => {
    const field = textareaRef.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 144)}px`;
  }, [value]);

  async function handleFiles(event) {
    const picked = Array.from(event.target.files || []);
    // Clearing the input lets the same file be picked again after a removal.
    event.target.value = '';
    if (picked.length === 0) return;

    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      setError(`You can attach up to ${MAX_ATTACHMENTS} files.`);
      return;
    }
    const accepted = [];
    for (const file of picked.slice(0, room)) {
      const problem = validateAttachmentFile(file);
      if (problem) setError(problem);
      else accepted.push(file);
    }
    if (picked.length > room) setError(`You can attach up to ${MAX_ATTACHMENTS} files.`);
    if (accepted.length === 0) return;

    const staged = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      url: '',
      pending: true,
    }));
    setAttachments((current) => [...current, ...staged]);
    setUploading(true);
    try {
      const uploaded = await uploadAttachments(accepted);
      const byName = new Map(uploaded.map((file) => [file.name, file]));
      setAttachments((current) => current.map((entry) => {
        if (!entry.pending) return entry;
        const match = byName.get(entry.name);
        return match ? { ...match, id: entry.id, pending: false } : entry;
      }));
      setError(uploaded.length < accepted.length ? 'One file could not be attached.' : '');
    } catch (requestError) {
      setAttachments((current) => current.filter((entry) => !entry.pending));
      setError(requestError.response?.data?.error || 'That file could not be attached. Try again.');
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(id) {
    setAttachments((current) => current.filter((entry) => entry.id !== id));
    setError('');
  }

  const ready = attachments.filter((entry) => !entry.pending && entry.url);
  const busy = sending || uploading;
  const canSend = Boolean(value.trim() || ready.length) && !busy && !disabled;
  const hasSavedReplies = savedReplies.length > 0 && typeof onInsertSavedReply === 'function';
  const showAddMenu = showAttach || hasSavedReplies;

  async function submit(event) {
    event.preventDefault();
    if (!canSend) return;
    let accepted = false;
    try {
      accepted = await onSubmit({ text: value.trim(), attachments: parseAttachments(ready) });
    } catch {
      // The caller owns the error message it shows; the composer only has to make
      // sure a failed send keeps the text and the staged files.
      accepted = false;
    }
    if (accepted) {
      setAttachments([]);
      setError('');
    }
  }

  return (
    <form className={`flex flex-col gap-2 ${className}`.trim()} onSubmit={submit} aria-label={composerLabel}>
      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {attachments.map((entry) => (
            <li key={entry.id} className="flex max-w-full items-center gap-2 rounded-full border border-border bg-elevated py-1 pl-2.5 pr-1 text-xs text-navy">
              {isPdf(entry) ? <FileText className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-bronze" aria-hidden="true" />}
              <span className="max-w-[11rem] truncate">{entry.name}</span>
              <span className="shrink-0 text-[10px] text-muted">{entry.pending ? 'Uploading' : formatAttachmentSize(entry.size)}</span>
              <button
                type="button"
                onClick={() => removeAttachment(entry.id)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-600"
                aria-label={t('a11y1.removeAttachment', { name: entry.name })}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}

      {/* Pill: radius stays fully round while the height follows the text, so a
          one-line reply is a capsule and a long one is a rounded panel. */}
      <div className="flex min-w-0 items-end gap-1 rounded-[22px] border border-border bg-elevated p-1 text-navy transition-colors focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/15">
        {showAddMenu && (
          <>
            <input ref={fileRef} type="file" accept={ATTACHMENT_ACCEPT} multiple className="hidden" onChange={handleFiles} tabIndex={-1} aria-hidden="true" />
            <Dropdown
              theme={ADD_MENU_THEME}
              placement="top-start"
              dismissOnClick
              renderTrigger={() => (
                <button
                  type="button"
                  disabled={busy || disabled}
                  className={`${INNER_BUTTON} text-muted hover:bg-surface hover:text-navy disabled:opacity-50`}
                  aria-label={t('a11y1.addAttachmentOrSavedReply')}
                >
                  <Plus className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                </button>
              )}
            >
              {showAttach && (
                <DropdownItem onClick={() => fileRef.current?.click()}>
                  <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block font-medium">Attach a photo or PDF</span>
                    <span className="mt-0.5 block text-xs text-muted">Up to {MAX_ATTACHMENTS} files</span>
                  </span>
                </DropdownItem>
              )}

              {showAttach && hasSavedReplies && <DropdownDivider />}

              {hasSavedReplies && (
                <>
                  <DropdownHeader>Saved replies</DropdownHeader>
                  {savedReplies.map((reply) => (
                    <DropdownItem
                      key={reply.trigger || reply.label}
                      onClick={() => onInsertSavedReply(reply)}
                    >
                      <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{reply.label}</span>
                        {reply.preview && <span className="mt-0.5 block truncate text-xs text-muted">{reply.preview}</span>}
                      </span>
                    </DropdownItem>
                  ))}
                </>
              )}
            </Dropdown>
          </>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit(event);
            }
          }}
          rows={1}
          placeholder={fieldLabel}
          aria-label={composerLabel}
          disabled={disabled}
          className="msg-composer-input w-full flex-1"
          style={{ resize: 'none' }}
        />

        {/* Send is the arrow alone: the pill already sits in a reply context, so a
            word would be noise beside the text. */}
        <button
          type="submit"
          disabled={!canSend}
          className={`${INNER_BUTTON} bg-navy-bg text-white hover:bg-navy-hover disabled:bg-surface disabled:text-muted`}
          aria-label={sending ? t('a11y1.sendingMessage') : t('a11y1.sendMessage')}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}

MessageComposer.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  ariaLabel: PropTypes.string,
  sending: PropTypes.bool,
  disabled: PropTypes.bool,
  savedReplies: PropTypes.arrayOf(PropTypes.shape({
    trigger: PropTypes.string,
    label: PropTypes.string,
    body: PropTypes.string,
    preview: PropTypes.string,
  })),
  onInsertSavedReply: PropTypes.func,
  showAttach: PropTypes.bool,
  className: PropTypes.string,
};
