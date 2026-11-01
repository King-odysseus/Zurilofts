import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Button, Spinner, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow,
} from 'flowbite-react';
import apiClient from '../api/client.js';
import AdminPageHeader from '../components/admin/AdminPageHeader.jsx';
import MetricCard from '../components/admin/MetricCard.jsx';
import Panel, { PanelFooter, PanelHead } from '../components/admin/Panel.jsx';
import { StateBadge } from '../components/admin/StatusBadge.jsx';
import EmptyState from '../components/admin/EmptyState.jsx';
import ConfirmDialog from '../components/admin/ConfirmDialog.jsx';
import AdminPagination from '../components/admin/AdminPagination.jsx';
import SelectMenu from '../components/SelectMenu.jsx';
import TableActionsMenu from '../components/TableActionsMenu.jsx';
import usePagedResource from '../hooks/usePagedResource.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { formatPrice } from '../utils/currency.js';

// Module scope on purpose: rebuilt inside a row, these would be a fresh array for
// every booking on every render.
const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'CONFLICT', label: 'Conflict' },
];

const PAYMENT_LABELS = {
  card: 'Card',
  mpesa: 'M-Pesa',
  bank: 'Bank transfer',
};

const BED_LABELS = {
  '1bed': '1-bed option',
  '2bed': '2-bed option',
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** A booking can outlive its guest account and its listing, so neither is assumed. */
function guestName(booking) {
  if (!booking) return 'Guest';
  const name = [booking.user?.firstName, booking.user?.lastName].filter(Boolean).join(' ').trim();
  return name || 'Guest';
}

/** Intl.format throws on an invalid date, and one bad timestamp must not blank the table. */
function formatDay(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return DATE_FORMAT.format(date);
}

function ReservationRow({ booking, onConfirm, onCancel, onRefund }) {
  const { t } = useLanguage();
  const guests = booking.guests ?? 0;
  const bedLabel = BED_LABELS[booking.bedOption];
  const refundPending = booking.status === 'CANCELLED' && booking.refundStatus === 'REFUND_PENDING';

  // Only actions that can succeed are listed. Each of these is refused by the
  // server outside its state, and a permanently disabled menu item reads as a
  // broken button rather than as "not applicable".
  const actions = [];
  if (booking.status === 'PENDING' || booking.status === 'CONFLICT') {
    actions.push({
      label: booking.status === 'CONFLICT' ? 'Resolve as confirmed' : 'Confirm booking',
      icon: 'approve',
      onClick: () => onConfirm(booking),
    });
  }
  if (booking.status !== 'CANCELLED') {
    actions.push({
      label: 'Cancel booking',
      icon: 'delete',
      danger: true,
      onClick: () => onCancel(booking),
    });
  }
  if (refundPending) {
    actions.push({
      label: 'Mark refunded',
      icon: 'approve',
      onClick: () => onRefund(booking, 'REFUNDED'),
    });
    actions.push({
      label: 'Decline refund',
      icon: 'delete',
      danger: true,
      onClick: () => onRefund(booking, 'REFUND_DECLINED'),
    });
  }

  return (
    <TableRow>
      <TableCell>
        <strong className="block truncate text-sm font-semibold text-navy">{guestName(booking)}</strong>
        <span className="block truncate text-xs text-charcoal">{booking.user?.email || 'No email on file'}</span>
      </TableCell>
      <TableCell>
        <strong className="block text-sm font-semibold text-navy">
          {booking.property?.title || 'Listing removed'}
        </strong>
        {booking.property?.location && (
          <span className="block text-xs text-muted">{booking.property.location}</span>
        )}
      </TableCell>
      <TableCell>
        <span className="block whitespace-nowrap text-sm text-charcoal">
          {formatDay(booking.checkIn)} to {formatDay(booking.checkOut)}
        </span>
      </TableCell>
      <TableCell>
        <strong className="block text-sm font-semibold text-navy">
          <span className="block text-right tabular-nums">{guests} guest{guests === 1 ? '' : 's'}</span>
        </strong>
        {bedLabel && <span className="block text-right text-xs text-muted">{bedLabel}</span>}
      </TableCell>
      <TableCell>
        <strong className="block whitespace-nowrap text-sm font-semibold text-navy">
          <span className="block text-right tabular-nums">{formatPrice(booking.total) || '-'}</span>
        </strong>
        {/* The promo explains why the total sits below the listed price. */}
        {booking.promoCode?.code && (
          <span className="block text-right text-xs text-muted">Promo {booking.promoCode.code}</span>
        )}
      </TableCell>
      <TableCell>
        <span className="block text-sm text-charcoal">
          {PAYMENT_LABELS[booking.paymentMethod] || booking.paymentMethod || 'Not set'}
        </span>
        <span className="block text-xs text-muted">
          {booking.paidAt ? `Paid ${formatDay(booking.paidAt)}` : 'Unpaid'}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          <StateBadge state={booking.status} />
          {booking.refundStatus && <StateBadge state={booking.refundStatus} />}
        </div>
      </TableCell>
      <TableCell>
        {actions.length > 0 ? (
          <div className="flex items-center justify-end">
            <TableActionsMenu
              label={t('a11y3.actionsForBookingBy', { name: guestName(booking) })}
              actions={actions}
            />
          </div>
        ) : (
          <span className="block text-right text-xs text-muted">{t('admin.noActions')}</span>
        )}
      </TableCell>
    </TableRow>
  );
}

ReservationRow.propTypes = {
  booking: PropTypes.shape({
    id: PropTypes.string.isRequired,
    checkIn: PropTypes.string,
    checkOut: PropTypes.string,
    guests: PropTypes.number,
    bedOption: PropTypes.string,
    status: PropTypes.string,
    total: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    paymentMethod: PropTypes.string,
    paidAt: PropTypes.string,
    refundStatus: PropTypes.string,
    user: PropTypes.shape({
      firstName: PropTypes.string,
      lastName: PropTypes.string,
      email: PropTypes.string,
    }),
    property: PropTypes.shape({
      title: PropTypes.string,
      location: PropTypes.string,
    }),
    promoCode: PropTypes.shape({ code: PropTypes.string }),
  }).isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onRefund: PropTypes.func.isRequired,
};

/**
 * Copy for the one dialog this page uses. Keeping it out of the component means
 * every action's wording is stated once, in the same shape.
 */
function dialogCopy(dialog, t) {
  if (!dialog) return null;
  const booking = dialog.booking;

  if (dialog.kind === 'cleanup') {
    return {
      title: t('admin.releaseHolds'),
      description: (
        <>
          An unpaid reservation holds its dates until the payment window closes. Releasing expired
          holds cancels those abandoned reservations so the dates become bookable again. Paid
          reservations are never touched.
        </>
      ),
      confirmLabel: t('admin.releaseHolds'),
      cancelLabel: 'Keep holds',
      tone: 'warning',
    };
  }

  if (dialog.kind === 'confirm') {
    return {
      title: 'Confirm this reservation',
      description: (
        <>
          Confirming marks the stay as booked for{' '}
          <strong className="font-semibold text-navy">{guestName(booking)}</strong> at{' '}
          <strong className="font-semibold text-navy">{booking.property?.title || 'this listing'}</strong>
          {' '}
          only once you have checked that the payment arrived.
        </>
      ),
      confirmLabel: 'Confirm booking',
      cancelLabel: 'Leave as is',
      tone: 'warning',
    };
  }

  if (dialog.kind === 'cancel') {
    return {
      title: 'Cancel this reservation',
      description: (
        <>
          Cancelling releases the dates immediately. A paid reservation moves to a pending refund:
          the host&apos;s share is reversed, and the guest&apos;s refund is then resolved from this
          page.
        </>
      ),
      confirmLabel: 'Cancel reservation',
      cancelLabel: 'Keep reservation',
      tone: 'danger',
    };
  }

  // Refund resolution. The wording follows the outcome so the button the admin
  // presses is never ambiguous.
  if (dialog.action === 'REFUNDED') {
    return {
      title: 'Mark this refund as sent',
      description: (
        <>
          Only confirm once the money has actually left the platform for{' '}
          <strong className="font-semibold text-navy">{guestName(booking)}</strong>. The reservation
          will record the refund as sent.
        </>
      ),
      confirmLabel: 'Mark refunded',
      cancelLabel: 'Not yet',
      tone: 'danger',
    };
  }

  return {
    title: 'Decline this refund',
    description: (
      <>
        The refund for{' '}
        <strong className="font-semibold text-navy">{guestName(booking)}</strong> will be closed as
        declined. Make sure the guest has been told why before you continue.
      </>
    ),
    confirmLabel: 'Decline refund',
    cancelLabel: 'Go back',
    tone: 'danger',
  };
}

function AdminBookings() {
  const { t } = useLanguage();
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('success');
  const [dialog, setDialog] = useState(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');

  // Only a real status narrows the list; sending an empty string would ask the
  // server to filter on nothing.
  const params = useMemo(() => (status ? { status } : {}), [status]);

  const {
    data, pagination, page, setPage, loading, error, refetch,
  } = usePagedResource('/admin/bookings', params, { limit: 20 });

  // The endpoint pages on the server, so these are counts of the rows on screen.
  // The labels say so: an admin must never read one page as the whole platform.
  const pageCounts = {
    total: data.length,
    pending: data.filter((booking) => booking.status === 'PENDING').length,
    confirmed: data.filter((booking) => booking.status === 'CONFIRMED').length,
    cancelled: data.filter((booking) => booking.status === 'CANCELLED').length,
    refundsPending: data.filter((booking) => booking.refundStatus === 'REFUND_PENDING').length,
  };

  function openDialog(next) {
    setDialogError('');
    setDialog(next);
  }

  function closeDialog() {
    // A closed dialog must not be replaceable mid-request, or the in-flight
    // result would land on a different booking.
    if (dialogBusy) return;
    setDialog(null);
    setDialogError('');
  }

  async function runDialog() {
    if (!dialog) return;
    const booking = dialog.booking;

    setDialogBusy(true);
    setDialogError('');
    setMessage('');

    try {
      if (dialog.kind === 'cleanup') {
        const res = await apiClient.post('/admin/bookings/cleanup-stale');
        const released = Number(res.data?.data?.cancelled) || 0;
        setMessage(
          released === 0
            ? 'No expired holds needed releasing.'
            : `${released} expired hold${released === 1 ? '' : 's'} released.`,
        );
      } else if (dialog.kind === 'confirm') {
        await apiClient.patch(`/admin/bookings/${booking.id}/status`, { status: 'CONFIRMED' });
        setMessage(`Reservation for ${guestName(booking)} confirmed.`);
      } else if (dialog.kind === 'cancel') {
        await apiClient.patch(`/admin/bookings/${booking.id}/status`, { status: 'CANCELLED' });
        setMessage(
          booking.paidAt
            ? `Reservation for ${guestName(booking)} cancelled. The refund is now pending.`
            : `Reservation for ${guestName(booking)} cancelled.`,
        );
      } else {
        await apiClient.patch(`/admin/bookings/${booking.id}/refund`, { action: dialog.action });
        setMessage(
          dialog.action === 'REFUNDED'
            ? `Refund marked as sent for ${guestName(booking)}.`
            : `Refund declined for ${guestName(booking)}.`,
        );
      }

      setMessageTone('success');
      setDialog(null);
      // The server owns every state transition, so the row is re-read rather
      // than patched locally. A local patch would drift from a second admin.
      refetch();
    } catch (err) {
      const detail = err.response?.data?.error || 'That action could not be completed. Please try again.';
      // The dialog keeps the reason in view; the page banner keeps it after the
      // dialog is dismissed, so nothing is only ever shown once.
      setDialogError(detail);
      setMessageTone('error');
      setMessage(detail);
    } finally {
      setDialogBusy(false);
    }
  }

  function changeStatusFilter(next) {
    setStatus(next);
    // Page 3 of an unfiltered list rarely exists once a filter is applied, and a
    // request for it would come back empty and look like a broken filter.
    setPage(1);
    setMessage('');
    setDialogError('');
  }

  const copy = dialogCopy(dialog, t);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={t('admin.bookingsTitle')}
        description={t('admin.bookingsDescription')}
        actions={(
          <Button type="button" onClick={() => openDialog({ kind: 'cleanup' })}>
            {t('admin.releaseHolds')}
          </Button>
        )}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('admin.bookingsOnPage')}
          value={pageCounts.total}
          note={`Page ${page} of ${pagination.totalPages || 1}`}
        />
        <MetricCard
          label={t('admin.pendingOnPage')}
          value={pageCounts.pending}
          note={t('admin.awaitingPayment')}
          tone={pageCounts.pending > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          label={t('admin.confirmedOnPage')}
          value={pageCounts.confirmed}
          note={t('admin.paidAndBooked')}
          tone={pageCounts.confirmed > 0 ? 'positive' : 'default'}
        />
        <MetricCard
          label={t('admin.cancelledOnPage')}
          value={pageCounts.cancelled}
          note={
            pageCounts.refundsPending > 0
              ? `${pageCounts.refundsPending} refund${pageCounts.refundsPending === 1 ? '' : 's'} to resolve`
              : t('admin.datesReleased')
          }
          tone={pageCounts.refundsPending > 0 ? 'warning' : 'default'}
        />
      </div>

      <Panel>
        <PanelHead
          title={t('admin.allReservationsAdmin')}
          subtitle={t('admin.reservationsSubtitle')}
          actions={(
            <SelectMenu
              value={status}
              onChange={changeStatusFilter}
              options={STATUS_FILTER_OPTIONS}
              ariaLabel={t('a11y3.filterByStatus')}
              wrapperClassName="sm:w-48"
              sizing="md"
            />
          )}
        />

        {message && (
          <Alert
            color={messageTone === 'error' ? 'failure' : 'success'}
            className="mx-5 mt-5 text-center"
            role="status"
          >
            {message}
          </Alert>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <Spinner size="lg" />
            <strong className="text-sm font-semibold text-navy">{t('admin.loadingReservations')}</strong>
            <p className="text-xs text-muted">{t('admin.loadingReservationsHint')}</p>
          </div>
        ) : error ? (
          // A failed fetch must not look like an empty list, so it gets its own
          // state with the reason and a way to retry.
          <EmptyState
            kind="error"
            title={t('admin.couldNotLoadReservations')}
            description={error}
            action={(
              <Button color="light" type="button" onClick={refetch}>
                {t('common.retry')}
              </Button>
            )}
          />
        ) : data.length === 0 ? (
          <EmptyState
            kind="empty"
            title={status ? t('admin.noReservationsThisStatus') : t('admin.noReservationsYet')}
            description={
              status
                ? t('admin.noReservationsStatusHint')
                : t('admin.noReservationsHint')
            }
            action={
              status ? (
                <Button color="light" type="button" onClick={() => changeStatusFilter('')}>
                  {t('admin.showAllStatuses')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table hoverable aria-label={t('admin.bookingsTitle')}>
              <TableHead>
                <TableRow>
                  <TableHeadCell>{t('admin.colGuest').toUpperCase()}</TableHeadCell>
                  <TableHeadCell>{t('admin.colProperty').toUpperCase()}</TableHeadCell>
                  <TableHeadCell>{t('admin.colDates').toUpperCase()}</TableHeadCell>
                  <TableHeadCell><span className="block text-right">{t('admin.colGuests').toUpperCase()}</span></TableHeadCell>
                  <TableHeadCell><span className="block text-right">{t('common.total').toUpperCase()}</span></TableHeadCell>
                  <TableHeadCell>{t('admin.colPayment').toUpperCase()}</TableHeadCell>
                  <TableHeadCell>{t('common.status').toUpperCase()}</TableHeadCell>
                  <TableHeadCell>
                    <span className="block text-right">{t('common.actions').toUpperCase()}</span>
                  </TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((booking) => (
                  <ReservationRow
                    key={booking.id}
                    booking={booking}
                    onConfirm={(target) => openDialog({ kind: 'confirm', booking: target })}
                    onCancel={(target) => openDialog({ kind: 'cancel', booking: target })}
                    onRefund={(target, action) => openDialog({ kind: 'refund', booking: target, action })}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* No footer under an empty list: "0 bookings" adds nothing to the
            empty state above it. */}
        {!loading && !error && data.length > 0 && (
          <PanelFooter>
            <AdminPagination
              page={page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onChange={setPage}
              noun="booking"
            />
          </PanelFooter>
        )}
      </Panel>

      <ConfirmDialog
        open={Boolean(dialog)}
        title={copy?.title || ''}
        description={copy?.description}
        confirmLabel={copy?.confirmLabel}
        cancelLabel={copy?.cancelLabel}
        tone={copy?.tone || 'danger'}
        busy={dialogBusy}
        error={dialogError}
        onConfirm={runDialog}
        onCancel={closeDialog}
      />
    </div>
  );
}

export default AdminBookings;
