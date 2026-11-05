import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
  Textarea,
} from 'flowbite-react';
import { Check, Copy, Plus, ShieldAlert } from 'lucide-react';
import apiClient from '../api/client.js';
import AdminPageHeader from '../components/admin/AdminPageHeader.jsx';
import Panel, { PanelHead } from '../components/admin/Panel.jsx';
import StatusBadge from '../components/admin/StatusBadge.jsx';
import EmptyState from '../components/admin/EmptyState.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

// The codes the server accepts, in the order the form lists them. Labels come
// from the dictionary so Swahili staff see their own language.
const CATEGORY_CODES = [
  'NAMES',
  'CONTACT_DETAILS',
  'IDENTITY_DOCUMENTS',
  'PAYMENT_INFORMATION',
  'ACCOUNT_CREDENTIALS',
  'BOOKING_DETAILS',
  'MESSAGES',
  'LOCATION',
  'OTHER',
];

/** Times are shown in Nairobi time, the zone the regulator's 72 hours are counted in. */
function formatTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })} EAT`;
}

/** The value a datetime-local input needs for "now", in the browser's own zone. */
function nowForInput() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

/** An empty input means "now" to the server, so only a filled one is sent. */
function inputToIso(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function clockBadge(incident, t) {
  const hours = Math.abs(Math.round(incident.hoursRemaining ?? 0));
  switch (incident.clockState) {
    case 'OVERDUE':
      return { tone: 'danger', text: t('admin.incidentsClockOverdue', { hours }) };
    case 'RUNNING':
      return {
        tone: incident.hoursRemaining <= 24 ? 'warning' : 'info',
        text: t('admin.incidentsClockRunning', { hours }),
      };
    case 'NOTIFIED_ON_TIME':
      return { tone: 'success', text: t('admin.incidentsClockOnTime') };
    case 'NOTIFIED_LATE':
      return { tone: 'warning', text: t('admin.incidentsClockLate') };
    default:
      return { tone: 'neutral', text: t('admin.incidentsClockClosedNoNotice') };
  }
}

const STATUS_KEYS = {
  OPEN: 'admin.incidentsStatusOpen',
  REGULATOR_NOTIFIED: 'admin.incidentsStatusRegulatorNotified',
  CLOSED: 'admin.incidentsStatusClosed',
};

const EMPTY_DECLARE_FORM = {
  title: '',
  summary: '',
  awareAt: '',
  dataCategories: [],
  affectedCount: '',
  consequences: '',
  measuresTaken: '',
};

function AdminIncidents() {
  const { t } = useLanguage();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [declareOpen, setDeclareOpen] = useState(false);
  const [declareForm, setDeclareForm] = useState(EMPTY_DECLARE_FORM);

  const [detail, setDetail] = useState(null);
  const [stepForm, setStepForm] = useState({ notifiedAt: '', regulatorReference: '', delayReason: '', closingNote: '' });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await apiClient.get('/admin/incidents');
      setIncidents(response.data.data || []);
    } catch (cause) {
      setError(cause.response?.data?.error || t('admin.incidentsLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  async function openDetail(id) {
    setFormError('');
    setCopied(false);
    setStepForm({ notifiedAt: '', regulatorReference: '', delayReason: '', closingNote: '' });
    try {
      const response = await apiClient.get(`/admin/incidents/${id}`);
      setDetail(response.data.data);
    } catch (cause) {
      setError(cause.response?.data?.error || t('admin.incidentsLoadFailed'));
    }
  }

  function openDeclare() {
    setFormError('');
    setDeclareForm({ ...EMPTY_DECLARE_FORM, awareAt: nowForInput() });
    setDeclareOpen(true);
  }

  function toggleCategory(code) {
    setDeclareForm((form) => ({
      ...form,
      dataCategories: form.dataCategories.includes(code)
        ? form.dataCategories.filter((entry) => entry !== code)
        : [...form.dataCategories, code],
    }));
  }

  async function submitDeclare(event) {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const response = await apiClient.post('/admin/incidents', {
        title: declareForm.title,
        summary: declareForm.summary,
        awareAt: inputToIso(declareForm.awareAt),
        dataCategories: declareForm.dataCategories,
        affectedCount: declareForm.affectedCount === '' ? undefined : Number(declareForm.affectedCount),
        consequences: declareForm.consequences || undefined,
        measuresTaken: declareForm.measuresTaken || undefined,
      });
      setDeclareOpen(false);
      await load();
      await openDetail(response.data.data.id);
    } catch (cause) {
      setFormError(cause.response?.data?.error || t('admin.incidentsSaveFailed'));
    } finally {
      setBusy(false);
    }
  }

  // One request per step. The server refuses a second attempt at the same step,
  // so a recorded time can never be quietly replaced from this screen.
  async function runStep(body) {
    setBusy(true);
    setFormError('');
    try {
      const response = await apiClient.patch(`/admin/incidents/${detail.id}`, body);
      setDetail(response.data.data);
      await load();
    } catch (cause) {
      setFormError(cause.response?.data?.error || t('admin.incidentsSaveFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function copyNotice() {
    try {
      await navigator.clipboard.writeText(detail.notice);
      setCopied(true);
    } catch {
      // Clipboard access can be blocked; the notice is also selectable in the box.
      setFormError(t('admin.incidentsCopyFailed'));
    }
  }

  const overdueCount = incidents.filter((incident) => incident.clockState === 'OVERDUE').length;
  const isClosed = detail?.status === 'CLOSED';
  const deadlinePassed = detail ? new Date(detail.deadlineAt) < new Date() : false;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={t('admin.incidentsTitle')}
        description={t('admin.incidentsDescription')}
        actions={(
          <Button onClick={openDeclare}>
            <Plus className="mr-2 h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {t('admin.incidentsDeclare')}
          </Button>
        )}
      />

      {overdueCount > 0 && (
        <Alert color="failure" icon={ShieldAlert}>
          {t('admin.incidentsOverdueAlert', { count: overdueCount })}
        </Alert>
      )}

      <Panel>
        <PanelHead title={t('admin.incidentsRegister')} subtitle={t('admin.incidentsRegisterHint')} />
        {loading ? (
          <div className="flex justify-center py-12"><Spinner aria-label={t('common.loading')} /></div>
        ) : error ? (
          <EmptyState kind="error" title={error} action={<Button color="light" size="sm" onClick={load}>{t('common.retry')}</Button>} />
        ) : incidents.length === 0 ? (
          <EmptyState icon={ShieldAlert} title={t('admin.incidentsEmptyTitle')} description={t('admin.incidentsEmptyBody')} />
        ) : (
          <div className="overflow-x-auto">
            <Table hoverable>
              <TableHead>
                <TableRow>
                  <TableHeadCell>{t('admin.incidentsColReference')}</TableHeadCell>
                  <TableHeadCell>{t('admin.incidentsColTitle')}</TableHeadCell>
                  <TableHeadCell>{t('admin.incidentsColAware')}</TableHeadCell>
                  <TableHeadCell>{t('admin.incidentsColDeadline')}</TableHeadCell>
                  <TableHeadCell>{t('admin.incidentsColStatus')}</TableHeadCell>
                  <TableHeadCell><span className="sr-only">{t('admin.incidentsView')}</span></TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y divide-border">
                {incidents.map((incident) => {
                  const badge = clockBadge(incident, t);
                  return (
                    <TableRow key={incident.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs">{incident.reference}</TableCell>
                      <TableCell className="font-medium text-navy">{incident.title}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{formatTime(incident.awareAt)}</TableCell>
                      <TableCell><StatusBadge tone={badge.tone}>{badge.text}</StatusBadge></TableCell>
                      <TableCell>{t(STATUS_KEYS[incident.status] || STATUS_KEYS.OPEN)}</TableCell>
                      <TableCell>
                        <Button color="light" size="xs" onClick={() => openDetail(incident.id)}>{t('admin.incidentsView')}</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <Modal show={declareOpen} onClose={() => setDeclareOpen(false)} size="2xl" dismissible>
        <form onSubmit={submitDeclare}>
          <ModalHeader>{t('admin.incidentsDeclareTitle')}</ModalHeader>
          <ModalBody className="space-y-4">
            <div>
              <Label htmlFor="incident-title">{t('admin.incidentsFieldTitle')}</Label>
              <TextInput id="incident-title" value={declareForm.title} maxLength={140} required
                onChange={(event) => setDeclareForm({ ...declareForm, title: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="incident-summary">{t('admin.incidentsFieldSummary')}</Label>
              <Textarea id="incident-summary" rows={3} value={declareForm.summary} maxLength={2000} required
                onChange={(event) => setDeclareForm({ ...declareForm, summary: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="incident-aware">{t('admin.incidentsFieldAware')}</Label>
              <TextInput id="incident-aware" type="datetime-local" value={declareForm.awareAt} required
                onChange={(event) => setDeclareForm({ ...declareForm, awareAt: event.target.value })} />
              <p className="mt-1 text-xs text-muted">{t('admin.incidentsFieldAwareHint')}</p>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-navy">{t('admin.incidentsFieldCategories')}</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CATEGORY_CODES.map((code) => (
                  <label key={code} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={declareForm.dataCategories.includes(code)} onChange={() => toggleCategory(code)} />
                    {t(`admin.incidentsCat${code}`)}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <Label htmlFor="incident-count">{t('admin.incidentsFieldAffected')}</Label>
              <TextInput id="incident-count" type="number" min="0" value={declareForm.affectedCount}
                onChange={(event) => setDeclareForm({ ...declareForm, affectedCount: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="incident-consequences">{t('admin.incidentsFieldConsequences')}</Label>
              <Textarea id="incident-consequences" rows={2} value={declareForm.consequences} maxLength={2000}
                onChange={(event) => setDeclareForm({ ...declareForm, consequences: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="incident-measures">{t('admin.incidentsFieldMeasures')}</Label>
              <Textarea id="incident-measures" rows={2} value={declareForm.measuresTaken} maxLength={2000}
                onChange={(event) => setDeclareForm({ ...declareForm, measuresTaken: event.target.value })} />
            </div>
            {formError && <Alert color="failure">{formError}</Alert>}
          </ModalBody>
          <ModalFooter>
            <Button type="button" color="light" onClick={() => setDeclareOpen(false)}>{t('admin.incidentsCancel')}</Button>
            <Button type="submit" disabled={busy || declareForm.dataCategories.length === 0}>
              {busy ? t('admin.incidentsSaving') : t('admin.incidentsSubmitDeclare')}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal show={Boolean(detail)} onClose={() => setDetail(null)} size="3xl" dismissible>
        {detail && (
          <>
            <ModalHeader>
              <span className="block font-mono text-xs text-muted">{detail.reference}</span>
              <span className="block text-base font-semibold text-navy">{detail.title}</span>
            </ModalHeader>
            <ModalBody className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge tone={clockBadge(detail, t).tone}>{clockBadge(detail, t).text}</StatusBadge>
                <span className="text-xs text-muted">
                  {t('admin.incidentsDetailDeadline')}: {formatTime(detail.deadlineAt)}
                </span>
              </div>

              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.incidentsColAware')}</dt><dd>{formatTime(detail.awareAt)}</dd></div>
                <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.incidentsRegulatorTold')}</dt><dd>{detail.regulatorNotifiedAt ? formatTime(detail.regulatorNotifiedAt) : t('admin.incidentsNotYet')}{detail.regulatorReference ? ` (${detail.regulatorReference})` : ''}</dd></div>
                <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.incidentsUsersTold')}</dt><dd>{detail.usersNotifiedAt ? formatTime(detail.usersNotifiedAt) : t('admin.incidentsNotYet')}</dd></div>
                <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.incidentsFieldAffected')}</dt><dd>{detail.affectedCount ?? t('admin.incidentsNotYet')}</dd></div>
              </dl>

              <div>
                <h3 className="mb-1 text-sm font-semibold text-navy">{t('admin.incidentsFieldSummary')}</h3>
                <p className="whitespace-pre-line text-sm">{detail.summary}</p>
              </div>

              {detail.delayReason && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-navy">{t('admin.incidentsDelayReason')}</h3>
                  <p className="whitespace-pre-line text-sm">{detail.delayReason}</p>
                </div>
              )}

              {detail.closingNote && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-navy">{t('admin.incidentsClosingNote')}</h3>
                  <p className="whitespace-pre-line text-sm">{detail.closingNote}</p>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-navy">{t('admin.incidentsNotice')}</h3>
                  <Button color="light" size="xs" type="button" onClick={copyNotice}>
                    {copied
                      ? <Check className="mr-1 h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                      : <Copy className="mr-1 h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}
                    {copied ? t('admin.incidentsCopied') : t('admin.incidentsCopyNotice')}
                  </Button>
                </div>
                <Textarea readOnly rows={12} value={detail.notice} className="font-mono text-xs" aria-label={t('admin.incidentsNotice')} />
                <p className="mt-1 text-xs text-muted">{t('admin.incidentsNoticeHint')}</p>
              </div>

              {!isClosed && (
                <div className="space-y-5 rounded-lg bg-surface p-4">
                  {!detail.regulatorNotifiedAt && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-navy">{t('admin.incidentsStepRegulator')}</h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="step-regulator-time">{t('admin.incidentsSentAt')}</Label>
                          <TextInput id="step-regulator-time" type="datetime-local" value={stepForm.notifiedAt}
                            onChange={(event) => setStepForm({ ...stepForm, notifiedAt: event.target.value })} />
                          <p className="mt-1 text-xs text-muted">{t('admin.incidentsSentAtHint')}</p>
                        </div>
                        <div>
                          <Label htmlFor="step-regulator-ref">{t('admin.incidentsRegulatorRef')}</Label>
                          <TextInput id="step-regulator-ref" value={stepForm.regulatorReference} maxLength={120}
                            onChange={(event) => setStepForm({ ...stepForm, regulatorReference: event.target.value })} />
                        </div>
                      </div>
                      {deadlinePassed && (
                        <div>
                          <Label htmlFor="step-delay">{t('admin.incidentsDelayReason')}</Label>
                          <Textarea id="step-delay" rows={2} value={stepForm.delayReason} maxLength={2000}
                            onChange={(event) => setStepForm({ ...stepForm, delayReason: event.target.value })} />
                          <p className="mt-1 text-xs text-muted">{t('admin.incidentsDelayHint')}</p>
                        </div>
                      )}
                      <Button size="sm" disabled={busy} onClick={() => runStep({
                        action: 'REGULATOR_NOTIFIED',
                        notifiedAt: inputToIso(stepForm.notifiedAt),
                        regulatorReference: stepForm.regulatorReference || undefined,
                        delayReason: stepForm.delayReason || undefined,
                      })}>
                        {t('admin.incidentsMarkRegulator')}
                      </Button>
                    </div>
                  )}

                  {!detail.usersNotifiedAt && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-navy">{t('admin.incidentsStepUsers')}</h3>
                      <Button size="sm" color="light" disabled={busy} onClick={() => runStep({ action: 'USERS_NOTIFIED' })}>
                        {t('admin.incidentsMarkUsers')}
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-navy">{t('admin.incidentsStepClose')}</h3>
                    <Textarea rows={2} value={stepForm.closingNote} maxLength={2000} aria-label={t('admin.incidentsClosingNote')}
                      placeholder={t('admin.incidentsClosingNote')}
                      onChange={(event) => setStepForm({ ...stepForm, closingNote: event.target.value })} />
                    <Button size="sm" color="light" disabled={busy || stepForm.closingNote.trim().length < 10}
                      onClick={() => runStep({ action: 'CLOSE', closingNote: stepForm.closingNote })}>
                      {t('admin.incidentsClose')}
                    </Button>
                  </div>
                </div>
              )}

              {formError && <Alert color="failure">{formError}</Alert>}
            </ModalBody>
            <ModalFooter>
              <Button color="light" type="button" onClick={() => setDetail(null)}>{t('admin.incidentsCloseWindow')}</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}

export default AdminIncidents;
