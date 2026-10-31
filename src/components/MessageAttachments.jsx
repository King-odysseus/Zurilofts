import PropTypes from 'prop-types';
import { FileText } from 'lucide-react';
import { formatAttachmentSize, isPdf, parseAttachments } from '../utils/attachments.js';

/**
 * Renders the files that travelled with a message, inside its bubble.
 *
 * Images are shown as a thumbnail that opens full size in a new tab; a PDF is a
 * link with its name and size, because there is no useful thumbnail for it and
 * the browser can render it once opened.
 */
export default function MessageAttachments({ attachments, mine = false, className = '' }) {
  const files = parseAttachments(attachments);
  if (files.length === 0) return null;

  return <div className={`flex flex-col gap-2 ${className}`.trim()}>
    {files.map((file) => {
      const linkClass = mine
        ? 'border-white/25 text-white hover:bg-white/10'
        : 'border-border text-navy hover:bg-surface';
      if (isPdf(file)) {
        return <a
          key={file.url}
          href={file.url}
          target="_blank"
          rel="noreferrer noopener"
          className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors ${linkClass}`}
        >
          <FileText className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          {file.size > 0 && <span className="shrink-0 text-[10px] font-normal opacity-80">{formatAttachmentSize(file.size)}</span>}
        </a>;
      }
      return <a
        key={file.url}
        href={file.url}
        target="_blank"
        rel="noreferrer noopener"
        className="block overflow-hidden rounded-xl"
        aria-label={`Open ${file.name}`}
      >
        <img src={file.url} alt={file.name} loading="lazy" className="max-h-56 w-full max-w-[15rem] rounded-xl object-cover" />
      </a>;
    })}
  </div>;
}

MessageAttachments.propTypes = {
  attachments: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
  mine: PropTypes.bool,
  className: PropTypes.string,
};
