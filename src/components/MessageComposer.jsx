import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { ArrowUp, FileText, Loader2, Plus, X } from 'lucide-react';
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  isPdf,
  parseAttachments,
  formatAttachmentSize,
  uploadAttachments,
  validateAttachmentFile,
} from '../utils/attachments.js';

/**
 * The one message composer used by the guest inbox, support, the admin reply
 * panel and the host inbox.
 *
 * It is a pill: a circular attach control sits outside it, the text field grows
 * with the text (no drag handle, so the shape never turns into a box), and the
 * send arrow lives inside the pill as a circle. `actions` lets the host area
 * park its saved-reply button inside the pill without forking the component.
 *
 * `onSubmit` receives the text and any already-uploaded attachments and must
 * resolve true once the message is accepted; only then is the input cleared, so
 * a failed send never loses what was typed.
 */
export default function MessageComposer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Write a message',
  ariaLabel = 'Message',
  sending = false,
  disabled = false,
  actions = null,
  showAttach = true,
  className = '',
}) {
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
    <form className={`flex flex-col gap-2 ${className}`.trim()} onSubmit={submit} aria-label={ariaLabel}>
      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {attachments.map((entry) => (
            <li key={entry.id} className="flex max-w-full items-center gap-2 rounded-full border border-border bg-elevated py-1 pl-2.5 pr-1 text-xs text-navy">
              {isPdf(entry) ? <FileText className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" aria-hidden="true" />}
              <span className="max-w-[11rem] truncate">{entry.name}</span>
              <span className="shrink-0 text-[10px] text-muted">{entry.pending ? 'Uploading' : formatAttachmentSize(entry.size)}</span>
              <button
                type="button"
                onClick={() => removeAttachment(entry.id)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-600"
                aria-label={`Remove ${entry.name}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}

      <div className="flex items-end gap-2">
        {showAttach && (
          <>
            <input ref={fileRef} type="file" accept={ATTACHMENT_ACCEPT} multiple className="hidden" onChange={handleFiles} tabIndex={-1} aria-hidden="true" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy || disabled}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-elevated text-navy transition-colors hover:border-navy/30 hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Attach images or PDFs"
            >
              <Plus className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
            </button>
          </>
        )}

        {/* Pill: radius stays fully round while the height follows the text. */}
        <div className="flex min-w-0 flex-1 items-end gap-1 rounded-[22px] border border-border bg-elevated py-1 pl-4 pr-1 text-navy transition-colors focus-within:border-primary-600 focus-within:ring-2 focus-within:ring-primary-100 dark:focus-within:ring-primary/25">
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
            placeholder={placeholder}
            aria-label={ariaLabel}
            disabled={disabled}
            className="msg-composer-input w-full flex-1"
            style={{ resize: 'none' }}
          />
          {actions}
          <button
            type="submit"
            disabled={!canSend}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-bg text-white transition-colors hover:bg-navy-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:bg-surface disabled:text-muted"
            aria-label={sending ? 'Sending message' : 'Send message'}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />}
          </button>
        </div>
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
  actions: PropTypes.node,
  showAttach: PropTypes.bool,
  className: PropTypes.string,
};
