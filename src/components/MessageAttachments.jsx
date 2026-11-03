import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FileText } from 'lucide-react';
import apiClient from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { chatAttachmentPath, formatAttachmentSize, isPdf, parseAttachments } from '../utils/attachments.js';

/**
 * Renders the files that travelled with a message, inside its bubble.
 *
 * Images are shown as a thumbnail that opens full size in a new tab; a PDF is a
 * link with its name and size, because there is no useful thumbnail for it and
 * the browser can render it once opened.
 *
 * Conversation files are private, so they are fetched with the reader's own
 * session and shown from a blob URL. A plain <img src="/uploads/..."> would be
 * a request with no credentials, and the server now refuses those - which is
 * the point: a file forwarded to someone outside the conversation stops
 * working for them.
 */

function usePrivateFile(url) {
  const [state, setState] = useState({ src: null, failed: false });

  useEffect(() => {
    const path = chatAttachmentPath(url);

    // A public address (listing photo) is used as-is.
    if (!path) {
      setState({ src: url, failed: false });
      return undefined;
    }

    let cancelled = false;
    let objectUrl = null;
    setState({ src: null, failed: false });

    apiClient
      .get(path, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setState({ src: objectUrl, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ src: null, failed: true });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return state;
}

function ImageAttachment({ file, mine }) {
  const { src, failed } = usePrivateFile(file.url);
  const linkClass = mine
    ? 'border-white/25 text-white hover:bg-white/10'
    : 'border-border text-navy hover:bg-surface';

  if (failed) {
    return (
      <span className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-semibold ${linkClass}`}>
        <FileText className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{file.name}</span>
      </span>
    );
  }

  if (!src) {
    // Same footprint as the image so the bubble does not jump when it arrives.
    return <span className="block h-24 w-40 animate-pulse rounded-xl bg-black/10" aria-hidden="true" />;
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer noopener"
      className="block overflow-hidden rounded-xl"
      aria-label={`Open ${file.name}`}
    >
      <img src={src} alt={file.name} loading="lazy" className="max-h-56 w-full max-w-[15rem] rounded-xl object-cover" />
    </a>
  );
}

function PdfAttachment({ file, mine }) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  const linkClass = mine
    ? 'border-white/25 text-white hover:bg-white/10'
    : 'border-border text-navy hover:bg-surface';

  // A private PDF cannot be opened by URL, so the bytes are fetched first and
  // handed to the browser as a blob. The URL is revoked later, not at once, or
  // the new tab would lose the document before it renders.
  async function open(event) {
    const path = chatAttachmentPath(file.url);
    if (!path) return; // A public address navigates normally.
    event.preventDefault();
    setFailed(false);
    try {
      const { data } = await apiClient.get(path, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(data);
      window.open(objectUrl, '_blank', 'noreferrer,noopener');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch {
      setFailed(true);
    }
  }

  return (
    <a
      href={chatAttachmentPath(file.url) ? '#' : file.url}
      onClick={open}
      target={chatAttachmentPath(file.url) ? undefined : '_blank'}
      rel="noreferrer noopener"
      aria-describedby={failed ? `attachment-error-${file.name}` : undefined}
      className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors ${linkClass}`}
    >
      <FileText className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{file.name}</span>
      {failed
        ? <span id={`attachment-error-${file.name}`} className="shrink-0 text-[10px] font-normal opacity-90">{t('common.attachmentUnavailable')}</span>
        : file.size > 0 && <span className="shrink-0 text-[10px] font-normal opacity-80">{formatAttachmentSize(file.size)}</span>}
    </a>
  );
}

export default function MessageAttachments({ attachments, mine = false, className = '' }) {
  const files = parseAttachments(attachments);
  if (files.length === 0) return null;

  return <div className={`flex flex-col gap-2 ${className}`.trim()}>
    {files.map((file) => (isPdf(file)
      ? <PdfAttachment key={file.url} file={file} mine={mine} />
      : <ImageAttachment key={file.url} file={file} mine={mine} />
    ))}
  </div>;
}

const attachmentShape = PropTypes.shape({
  url: PropTypes.string.isRequired,
  name: PropTypes.string,
  mimeType: PropTypes.string,
  size: PropTypes.number,
});

ImageAttachment.propTypes = {
  file: attachmentShape.isRequired,
  mine: PropTypes.bool,
};

PdfAttachment.propTypes = {
  file: attachmentShape.isRequired,
  mine: PropTypes.bool,
};

MessageAttachments.propTypes = {
  attachments: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
  mine: PropTypes.bool,
  className: PropTypes.string,
};
