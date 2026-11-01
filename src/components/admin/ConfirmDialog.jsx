import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Button, Label, Modal, ModalBody, ModalFooter, ModalHeader, TextInput } from 'flowbite-react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { CircleAlert } from 'lucide-react';

/**
 * One confirmation dialog for destructive actions.
 *
 * Four places still used the browser's grey `window.confirm`, which ignores the
 * brand, cannot be styled, and reads differently on every OS. `expect` adds the
 * typed confirmation the account-delete flow already had, for the worst actions.
 */
function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  expect,
  busy = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  const { t } = useLanguage();
  const [typed, setTyped] = useState('');
  const needsTyping = Boolean(expect);
  const canConfirm = !needsTyping || typed === expect;

  // The dialog is reused for different rows, so a typed word from the previous
  // target must not survive into the next one and pre-approve it.
  useEffect(() => {
    if (!open) setTyped('');
  }, [open, expect]);

  function close() {
    setTyped('');
    onCancel();
  }

  return (
    // Flowbite expects a function for onClose. While a request is in flight the
    // dialog refuses to close rather than handing back a no-op that still tears
    // the modal down.
    <Modal show={open} onClose={busy ? () => {} : close} size="md" dismissible>
      <ModalHeader>
        <span className="flex items-center gap-2">
          <CircleAlert
            className={`h-5 w-5 ${tone === 'danger' ? 'text-[#B42318]' : 'text-[#B54708]'}`}
            strokeWidth={2}
            aria-hidden="true"
          />
          <span className="text-base font-semibold text-navy">{title}</span>
        </span>
      </ModalHeader>
      <ModalBody className="space-y-4">
        {description && <div className="text-sm leading-relaxed text-charcoal">{description}</div>}
        {error && <p className="text-sm font-medium text-[#B42318]">{error}</p>}
        {needsTyping && (
          <div>
            <Label htmlFor="confirm-dialog-expect">
              {t('common.typeToConfirm')} <strong>{expect}</strong>
            </Label>
            <TextInput
              id="confirm-dialog-expect"
              value={typed}
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
            />
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="light" type="button" onClick={close} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          color={tone === 'danger' ? 'failure' : 'warning'}
          onClick={onConfirm}
          disabled={busy || !canConfirm}
        >
          {busy ? t('common.working') : confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

ConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.node,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  tone: PropTypes.oneOf(['danger', 'warning']),
  expect: PropTypes.string,
  busy: PropTypes.bool,
  error: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default ConfirmDialog;
