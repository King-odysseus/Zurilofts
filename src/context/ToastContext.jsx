import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Check, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastSeq = 0;

const KIND_META = {
  success: {
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    icon: <Check className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />,
  },
  error: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    icon: <X className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />,
  },
  info: {
    iconBg: 'bg-[#C49A6C]/15',
    iconColor: 'text-[#C49A6C]',
    icon: <Info className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />,
  },
};

function ToastCard({ toast, onDismiss }) {
  const meta = KIND_META[toast.kind] || KIND_META.info;
  return (
    <div
      role="status"
      className="toast-in pointer-events-auto flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-[0_8px_30px_-6px_rgba(38,34,98,0.22)] p-4"
    >
      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${meta.iconBg} ${meta.iconColor}`}>
        {meta.icon}
      </span>
      <div className="flex-1 min-w-0">
        {toast.title && <p className="text-sm font-semibold text-[#0B1F42] leading-snug">{toast.title}</p>}
        <p className="text-sm text-[#6b7280] leading-snug break-words">{toast.message}</p>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="flex-shrink-0 -mr-1 text-[#6b7280]/60 hover:text-[#1f2937] transition-colors"
      >
        <X className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

ToastCard.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.number.isRequired,
    kind: PropTypes.oneOf(['success', 'error', 'info']).isRequired,
    title: PropTypes.string,
    message: PropTypes.string.isRequired,
  }).isRequired,
  onDismiss: PropTypes.func.isRequired,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    (kind, message, opts = {}) => {
      const id = ++toastSeq;
      setToasts((prev) => [...prev.slice(-3), { id, kind, message, title: opts.title || null }]);
      const duration = opts.duration ?? (kind === 'error' ? 6000 : 4000);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (message, opts) => push('success', message, opts),
      error: (message, opts) => push('error', message, opts),
      info: (message, opts) => push('info', message, opts),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3 pointer-events-none">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

ToastProvider.propTypes = {
  children: PropTypes.node,
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export default ToastContext;
