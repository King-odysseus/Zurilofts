import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Badge,
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Textarea,
  TextInput,
} from 'flowbite-react';
import { FileText, Search } from 'lucide-react';
import apiClient from '../api/client.js';
import SelectMenu from '../components/SelectMenu.jsx';

const STATUS_OPTIONS = [
  { value: '', label: 'All applications' },
  { value: 'SUBMITTED', label: 'Awaiting review' },
  { value: 'CHANGES_REQUESTED', label: 'Changes requested' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DRAFT', label: 'Draft' },
];

const STATUS_META = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  SUBMITTED: { label: 'Awaiting review', tone: 'pending' },
  CHANGES_REQUESTED: { label: 'Changes requested', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
};

// Status tones are semantic; the Badge palette names them differently.
const BADGE_COLORS = { neutral: 'gray', pending: 'warning', warning: 'warning', success: 'success', danger: 'failure' };

const DOCUMENT_LABELS = {
  IDENTITY_FRONT: 'Identity - front/details',
  IDENTITY_BACK: 'Identity - reverse',
  PROPERTY_AUTHORITY: 'Property authority',
  BUSINESS_REGISTRATION: 'Business registration',
};

function initials(application) {
  const name = application.legalName || `${application.user?.firstName || ''} ${application.user?.lastName || ''}`;
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'HA';
}

function formatDate(value, includeTime = false) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-GB', includeTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFileSize(size) {
  const bytes = Number(size) || 0;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function statusMeta(status) {
  return STATUS_META[status] || { label: String(status || 'Unknown').replace(/_/g, ' '), tone: 'neutral' };
}

function SearchIcon() {
  return <Search strokeWidth={1.8} aria-hidden="true" />;
}

function AdminHostApplications() {
  const [applications, setApplications] = useState([]);
  const [status, setStatus] = useState('SUBMITTED');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('success');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await apiClient.get('/admin/host-applications', {
        params: { ...(status ? { status } : {}), limit: 100 },
      });
      setApplications(response.data.data || []);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Could not load host applications.');
      setMessageTone('error');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const visibleApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return applications;
    return applications.filter((application) => [
      application.legalName,
      application.businessName,
      application.contactEmail,
      application.contactPhone,
      application.city,
      application.user?.firstName,
      application.user?.lastName,
      application.user?.email,
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [applications, search]);

  const viewTotals = useMemo(() => {
    const documents = visibleApplications.reduce((total, application) => total + (application.documents?.length || 0), 0);
    const locations = new Set(visibleApplications.map((application) => application.city).filter(Boolean));
    const latest = visibleApplications
      .map((application) => application.updatedAt || application.submittedAt || application.createdAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0];
    return { documents, locations: locations.size, latest };
  }, [visibleApplications]);

  async function openApplication(id) {
    setBusy(id);
    setMessage('');
    setNote('');
    try {
      const response = await apiClient.get(`/admin/host-applications/${id}`);
      setSelected(response.data.data);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Could not load the application.');
      setMessageTone('error');
    } finally {
      setBusy('');
    }
  }

  function closeApplication() {
    if (busy) return;
    setSelected(null);
    setNote('');
  }

  async function review(action) {
    if (!selected) return;
    if ((action === 'request-changes' || action === 'reject') && !note.trim()) {
      setMessage('Enter a reviewer note first.');
      setMessageTone('error');
      return;
    }
    setBusy(action);
    setMessage('');
    try {
      await apiClient.post(`/admin/host-applications/${selected.id}/${action}`, action === 'approve' ? {} : { reason: note.trim() });
      setMessage(action === 'approve' ? 'Host approved. They can now create properties.' : 'Application updated.');
      setMessageTone('success');
      setSelected(null);
      setNote('');
      await load();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Could not update the application.');
      setMessageTone('error');
    } finally {
      setBusy('');
    }
  }

  async function downloadDocument(document) {
    if (!selected) return;
    setBusy(document.id);
    setMessage('');
    try {
      const response = await apiClient.get(`/admin/host-applications/${selected.id}/documents/${document.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.originalName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Could not download the document.');
      setMessageTone('error');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-6" data-openpencil-frame="0:7228">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">ZURILOFTS · ADMIN · VERIFICATION</p>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Host applications</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">Verify identity, authority, and hosting details before granting workspace access.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">APPLICATIONS IN VIEW</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">{visibleApplications.length}</strong>
          <small className="mt-1 block text-xs text-muted">Matching the current review filter</small>
        </article>
        <article className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">ENCRYPTED FILES</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">{viewTotals.documents}</strong>
          <small className="mt-1 block text-xs text-muted">Documents available to review</small>
        </article>
        <article className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">LOCATIONS</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">{viewTotals.locations}</strong>
          <small className="mt-1 block text-xs text-muted">Distinct primary areas</small>
        </article>
        <article className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">LAST UPDATE</span>
          <strong className="mt-2 block text-2xl font-bold text-navy">{formatDate(viewTotals.latest)}</strong>
          <small className="mt-1 block text-xs text-muted">Most recent application activity</small>
        </article>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.8} aria-hidden="true" />
            <TextInput
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search applicant, business, email or area"
              aria-label="Search host applications"
              className="pl-9"
            />
          </div>
          <SelectMenu
            ariaLabel="Filter host applications by status"
            value={status}
            onChange={(next) => setStatus(next)}
            wrapperClassName="sm:w-56"
            options={STATUS_OPTIONS}
          />
        </div>

        {message && <Alert color={messageTone === 'error' ? 'failure' : 'success'} className="mx-5 mt-4" role="status">{message}</Alert>}

        {loading ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <Spinner size="lg" aria-hidden="true" />
            <strong className="text-sm font-semibold text-navy">Loading applications</strong>
            <p className="text-xs text-muted">Fetching the verification queue and encrypted document records.</p>
          </div>
        ) : visibleApplications.length === 0 ? (
          <Alert color="info" className="m-5">
            <span aria-hidden="true"><SearchIcon /></span>
            <strong>No applications in this view</strong>
            <p>Nothing is waiting under the selected status and search. Try another filter.</p>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <Table hoverable aria-label="Host applications">
              <TableHead>
                <TableRow>
                  <TableHeadCell>APPLICANT</TableHeadCell>
                  <TableHeadCell>BUSINESS</TableHeadCell>
                  <TableHeadCell>HOSTING</TableHeadCell>
                  <TableHeadCell>DOCUMENTS</TableHeadCell>
                  <TableHeadCell>UPDATED</TableHeadCell>
                  <TableHeadCell>STATUS</TableHeadCell>
                  <TableHeadCell>ACTION</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleApplications.map((application) => {
                  const meta = statusMeta(application.status);
                  return (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-navy" aria-hidden="true">{initials(application)}</span>
                          <div className="min-w-0">
                            <strong className="block truncate text-sm font-semibold text-navy">{application.legalName || `${application.user?.firstName || ''} ${application.user?.lastName || ''}`.trim() || 'Unnamed applicant'}</strong>
                            <span className="block truncate text-xs text-muted">{application.contactEmail || application.user?.email || 'Email not provided'}</span>
                            <small className="block text-xs text-muted">{application.contactPhone || 'Phone not provided'}</small>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <small className="block text-[11px] font-semibold uppercase tracking-wide text-muted">BUSINESS</small>
                        <strong className="mt-0.5 block text-sm font-medium text-navy">{application.businessName || 'Individual host'}</strong>
                        <span className="mt-0.5 block text-xs text-muted">{application.businessType ? String(application.businessType).replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Type not set'}</span>
                      </TableCell>
                      <TableCell>
                        <small className="block text-[11px] font-semibold uppercase tracking-wide text-muted">HOSTING</small>
                        <strong className="mt-0.5 block text-sm font-medium text-navy">{application.city || 'Area not set'}</strong>
                        <span className="mt-0.5 block text-xs text-muted">{application.propertyCount ? `${application.propertyCount} propert${application.propertyCount === 1 ? 'y' : 'ies'}` : 'Count not set'}</span>
                      </TableCell>
                      <TableCell>
                        <small className="block text-[11px] font-semibold uppercase tracking-wide text-muted">DOCUMENTS</small>
                        <strong className="mt-0.5 block text-sm font-medium text-navy">{application.documents?.length || 0} encrypted</strong>
                        <span className="mt-0.5 block text-xs text-muted">{application.documents?.length ? 'Ready to inspect' : 'No files uploaded'}</span>
                      </TableCell>
                      <TableCell>
                        <small className="block text-[11px] font-semibold uppercase tracking-wide text-muted">UPDATED</small>
                        <strong className="mt-0.5 block text-sm font-medium text-navy">{formatDate(application.updatedAt || application.submittedAt)}</strong>
                        <span className="mt-0.5 block text-xs text-muted">{application.reviewedAt ? `Reviewed ${formatDate(application.reviewedAt)}` : 'Not reviewed yet'}</span>
                      </TableCell>
                      <TableCell><Badge color={BADGE_COLORS[meta.tone] || 'gray'}>{meta.label}</Badge></TableCell>
                      <TableCell>
                        <Button size="xs" onClick={() => openApplication(application.id)} disabled={busy === application.id}>
                          {busy === application.id ? 'Loading...' : 'Review'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Modal show={Boolean(selected)} onClose={closeApplication} size="2xl" dismissible>
        {selected && (
          <>
            <ModalHeader>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">HOST APPLICATION · {String(selected.status || '').replace(/_/g, ' ')}</span>
              <span className="mt-1 block text-lg font-semibold text-navy">{selected.legalName || 'Host application'}</span>
              <span className="mt-0.5 block text-xs font-normal text-muted">{selected.contactEmail || selected.user?.email}</span>
            </ModalHeader>
            <ModalBody className="space-y-5">
              {message && <Alert color={messageTone === 'error' ? 'failure' : 'success'} role="status">{message}</Alert>}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <DetailSection title="Identity & contact">
                  <Detail label="Legal name" value={selected.legalName} />
                  <Detail label="Date of birth" value={selected.dateOfBirth} />
                  <Detail label="Nationality" value={selected.nationality} />
                  <Detail label="Identity type" value={selected.identityType} />
                  <Detail label="KRA PIN" value={selected.kraPin} />
                  <Detail label="Contact phone" value={selected.contactPhone} />
                  <Detail label="Contact email" value={selected.contactEmail} />
                  <Detail label="Preferred payout" value={selected.preferredPayoutMethod} />
                  {selected.preferredPayoutMethod === 'mpesa' ? (
                    <Detail label="M-PESA number" value={selected.payoutMpesaPhone} />
                  ) : (
                    <>
                      <Detail label="Bank" value={selected.payoutBankName} />
                      <Detail label="Bank code" value={selected.payoutBankCode} />
                      <Detail label="Account number" value={selected.payoutBankAccountNo} />
                    </>
                  )}
                </DetailSection>

                <DetailSection title="Business">
                  <Detail label="Business name" value={selected.businessName} />
                  <Detail label="Business type" value={selected.businessType} />
                  <Detail label="Registration" value={selected.companyRegistrationNo} />
                  <Detail label="Applicant account" value={`${selected.user?.firstName || ''} ${selected.user?.lastName || ''}`.trim() || selected.user?.email} />
                </DetailSection>

                <DetailSection title="Hosting plan">
                  <Detail label="Primary area" value={selected.city} />
                  <Detail label="Property locations" value={selected.propertyLocations} />
                  <Detail label="Property count" value={selected.propertyCount} />
                  <Detail label="Relationship" value={selected.propertyRelationship} />
                  <Detail label="Property types" value={selected.propertyTypes?.join(', ')} />
                  <Detail label="Years hosting" value={selected.yearsHosting} />
                </DetailSection>
              </div>

              <section className="rounded-xl border border-border bg-surface p-4">
                <div>
                  <h3 className="text-sm font-semibold text-navy">Experience</h3>
                  <p className="mt-1 text-xs text-muted">Applicant notes supplied for verification.</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-charcoal">{selected.experience || 'No additional hosting notes were supplied.'}</p>
              </section>

              <section className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-navy">Encrypted documents</h3>
                    <p className="mt-1 text-xs text-muted">Files are decrypted only for this authorised review download.</p>
                  </div>
                  <span className="text-xs text-muted">{selected.documents?.length || 0} files</span>
                </div>
                {selected.documents?.length ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {selected.documents.map((document) => (
                      <Button key={document.id} color="light" onClick={() => downloadDocument(document)} disabled={busy === document.id}>
                        <FileText strokeWidth={1.6} aria-hidden="true" />
                        <span className="flex min-w-0 flex-col items-start leading-tight">
                          <strong className="w-full truncate text-xs font-semibold text-navy">{DOCUMENT_LABELS[document.kind] || document.kind}</strong>
                          <small className="w-full truncate text-[11px] font-normal text-muted">{document.originalName} · {formatFileSize(document.size)}</small>
                        </span>
                      </Button>
                    ))}
                  </div>
                ) : <div className="mt-3 rounded-xl border border-border bg-white px-4 py-6 text-center text-sm text-muted">No documents have been uploaded for this application.</div>}
              </section>

              {selected.status === 'SUBMITTED' && (
                <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-navy">Review decision</h3>
                    <p className="mt-1 text-xs text-muted">Approve to grant host access, or return the application with a clear, applicant-visible note.</p>
                  </div>
                  <Label htmlFor="host-application-note">Reviewer note</Label>
                  <Textarea
                    id="host-application-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Required for changes or rejection"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button color="failure" onClick={() => review('reject')} disabled={Boolean(busy)}>Reject</Button>
                    <Button color="light" onClick={() => review('request-changes')} disabled={Boolean(busy)}>Request changes</Button>
                    <Button onClick={() => review('approve')} disabled={Boolean(busy)}>{busy === 'approve' ? 'Approving...' : 'Approve host'}</Button>
                  </div>
                </section>
              )}

              {selected.reviewNote && selected.status !== 'SUBMITTED' && (
                <section className="rounded-xl border border-border bg-surface p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-navy">Reviewer note</h3>
                    <p className="mt-1 text-xs text-muted">Shared with the applicant.</p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal">{selected.reviewNote}</p>
                </section>
              )}

              {selected.auditLogs?.length > 0 && (
                <section className="rounded-xl border border-border bg-surface p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-navy">Review history</h3>
                    <p className="mt-1 text-xs text-muted">Immutable actions recorded for this application.</p>
                  </div>
                  <div className="mt-3 space-y-3">
                    {selected.auditLogs.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-sm text-navy">
                            <strong className="font-semibold">{String(entry.action).replace(/_/g, ' ')}</strong>
                            <small className="ml-1 text-xs text-muted">{formatDate(entry.createdAt, true)}</small>
                          </p>
                          {entry.note && <blockquote className="mt-1 border-l-2 border-border pl-3 text-xs text-muted">{entry.note}</blockquote>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </ModalBody>
          </>
        )}
      </Modal>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <strong className="text-right text-sm font-medium text-navy">{value === null || value === undefined || value === '' ? '-' : String(value)}</strong>
    </div>
  );
}

DetailSection.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
Detail.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.array]) };

export default AdminHostApplications;
