import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Label, Select, Textarea, TextInput } from 'flowbite-react';
import { FileBadge, FileText, Search } from 'lucide-react';
import apiClient from '../api/client.js';

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
  return STATUS_META[status] || { label: String(status || 'Unknown').replaceAll('_', ' '), tone: 'neutral' };
}

function SearchIcon() {
  return <Search strokeWidth={1.8} aria-hidden="true" />;
}

function DocumentIcon({ kind }) {
  const business = kind === 'BUSINESS_REGISTRATION';
  return business
    ? <FileBadge strokeWidth={1.6} aria-hidden="true" />
    : <FileText strokeWidth={1.6} aria-hidden="true" />;
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
    <div className="op-admin-overview op-admin-host-apps" data-openpencil-frame="0:7228">
      <div className="op-admin-heading op-admin-host-apps-heading">
        <div>
          <p className="op-admin-eyebrow">ZURILOFTS · ADMIN · VERIFICATION</p>
          <h1>Host applications</h1>
          <p>Verify identity, authority, and hosting details before granting workspace access.</p>
        </div>
      </div>

      <div className="op-admin-metrics op-admin-host-app-metrics">
        <article><span>APPLICATIONS IN VIEW</span><strong>{visibleApplications.length}</strong><small>Matching the current review filter</small></article>
        <article><span>ENCRYPTED FILES</span><strong>{viewTotals.documents}</strong><small>Documents available to review</small></article>
        <article><span>LOCATIONS</span><strong>{viewTotals.locations}</strong><small>Distinct primary areas</small></article>
        <article><span>LAST UPDATE</span><strong className="op-admin-host-app-date">{formatDate(viewTotals.latest)}</strong><small>Most recent application activity</small></article>
      </div>

      <section className="op-admin-host-app-queue">
        <div className="op-admin-host-app-toolbar">
          <div className="op-admin-host-app-search">
            <SearchIcon />
            <TextInput
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search applicant, business, email or area"
              aria-label="Search host applications"
            />
          </div>
          <Select
            aria-label="Filter host applications by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="op-admin-host-app-filter"
          >
            {STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
          </Select>
        </div>

        {message && <div className={`op-admin-people-message ${messageTone === 'error' ? 'is-error' : 'is-success'}`} role="status">{message}</div>}

        {loading ? (
          <div className="op-admin-host-app-empty">
            <span className="op-admin-booking-spinner" aria-hidden="true" />
            <strong>Loading applications</strong>
            <p>Fetching the verification queue and encrypted document records.</p>
          </div>
        ) : visibleApplications.length === 0 ? (
          <div className="op-admin-host-app-empty">
            <span aria-hidden="true"><SearchIcon /></span>
            <strong>No applications in this view</strong>
            <p>Nothing is waiting under the selected status and search. Try another filter.</p>
          </div>
        ) : (
          <div className="op-admin-host-app-list" role="table" aria-label="Host applications">
            <div className="op-admin-host-app-columns" role="row">
              <span role="columnheader">APPLICANT</span>
              <span role="columnheader">BUSINESS</span>
              <span role="columnheader">HOSTING</span>
              <span role="columnheader">DOCUMENTS</span>
              <span role="columnheader">UPDATED</span>
              <span role="columnheader">STATUS</span>
              <span role="columnheader">ACTION</span>
            </div>
            {visibleApplications.map((application) => {
              const meta = statusMeta(application.status);
              return (
                <article key={application.id} className="op-admin-host-app-row" role="row">
                  <div className="op-admin-host-app-applicant" role="cell">
                    <span className="op-admin-host-app-avatar" aria-hidden="true">{initials(application)}</span>
                    <div>
                      <strong>{application.legalName || `${application.user?.firstName || ''} ${application.user?.lastName || ''}`.trim() || 'Unnamed applicant'}</strong>
                      <span>{application.contactEmail || application.user?.email || 'Email not provided'}</span>
                      <small>{application.contactPhone || 'Phone not provided'}</small>
                    </div>
                  </div>
                  <div className="op-admin-host-app-cell" role="cell">
                    <small>BUSINESS</small>
                    <strong>{application.businessName || 'Individual host'}</strong>
                    <span>{application.businessType ? String(application.businessType).replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Type not set'}</span>
                  </div>
                  <div className="op-admin-host-app-cell" role="cell">
                    <small>HOSTING</small>
                    <strong>{application.city || 'Area not set'}</strong>
                    <span>{application.propertyCount ? `${application.propertyCount} propert${application.propertyCount === 1 ? 'y' : 'ies'}` : 'Count not set'}</span>
                  </div>
                  <div className="op-admin-host-app-cell" role="cell">
                    <small>DOCUMENTS</small>
                    <strong>{application.documents?.length || 0} encrypted</strong>
                    <span>{application.documents?.length ? 'Ready to inspect' : 'No files uploaded'}</span>
                  </div>
                  <div className="op-admin-host-app-cell" role="cell">
                    <small>UPDATED</small>
                    <strong>{formatDate(application.updatedAt || application.submittedAt)}</strong>
                    <span>{application.reviewedAt ? `Reviewed ${formatDate(application.reviewedAt)}` : 'Not reviewed yet'}</span>
                  </div>
                  <div role="cell"><span className={`op-admin-host-app-status is-${meta.tone}`}>{meta.label}</span></div>
                  <div className="op-admin-host-app-action" role="cell">
                    <Button size="xs" onClick={() => openApplication(application.id)} disabled={busy === application.id}>
                      {busy === application.id ? 'Loading...' : 'Review'}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selected && (
        <div className="op-admin-dialog-backdrop" role="presentation" onMouseDown={closeApplication}>
          <div className="op-admin-host-app-dialog" role="dialog" aria-modal="true" aria-labelledby="host-application-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="op-admin-host-app-dialog-head">
              <div>
                <p className="op-admin-eyebrow">HOST APPLICATION · {selected.status.replaceAll('_', ' ')}</p>
                <h2 id="host-application-title">{selected.legalName || 'Host application'}</h2>
                <span>{selected.contactEmail || selected.user?.email}</span>
              </div>
              <button type="button" onClick={closeApplication} aria-label="Close host application">&times;</button>
            </div>

            <div className="op-admin-host-app-dialog-body">
              {message && <div className={`op-admin-people-message ${messageTone === 'error' ? 'is-error' : 'is-success'}`} role="status">{message}</div>}

              <div className="op-admin-host-app-detail-grid">
                <DetailSection title="Identity & contact">
                  <Detail label="Legal name" value={selected.legalName} />
                  <Detail label="Date of birth" value={selected.dateOfBirth} />
                  <Detail label="Nationality" value={selected.nationality} />
                  <Detail label="Identity type" value={selected.identityType} />
                  <Detail label="KRA PIN" value={selected.kraPin} />
                  <Detail label="Contact phone" value={selected.contactPhone} />
                  <Detail label="Contact email" value={selected.contactEmail} />
                  <Detail label="Preferred payout" value={selected.preferredPayoutMethod} />
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

              <section className="op-admin-host-app-section">
                <div className="op-admin-host-app-section-heading">
                  <div><h3>Experience</h3><p>Applicant notes supplied for verification.</p></div>
                </div>
                <p className="op-admin-host-app-experience">{selected.experience || 'No additional hosting notes were supplied.'}</p>
              </section>

              <section className="op-admin-host-app-section">
                <div className="op-admin-host-app-section-heading">
                  <div><h3>Encrypted documents</h3><p>Files are decrypted only for this authorised review download.</p></div>
                  <span>{selected.documents?.length || 0} files</span>
                </div>
                {selected.documents?.length ? (
                  <div className="op-admin-host-app-documents">
                    {selected.documents.map((document) => (
                      <Button key={document.id} color="light" onClick={() => downloadDocument(document)} disabled={busy === document.id}>
                        <DocumentIcon kind={document.kind} />
                        <span><strong>{DOCUMENT_LABELS[document.kind] || document.kind}</strong><small>{document.originalName} · {formatFileSize(document.size)}</small></span>
                      </Button>
                    ))}
                  </div>
                ) : <div className="op-admin-host-app-no-documents">No documents have been uploaded for this application.</div>}
              </section>

              {selected.status === 'SUBMITTED' && (
                <section className="op-admin-host-app-review">
                  <div>
                    <h3>Review decision</h3>
                    <p>Approve to grant host access, or return the application with a clear, applicant-visible note.</p>
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
                  <div className="op-admin-host-app-review-actions">
                    <Button color="light" onClick={() => review('reject')} disabled={Boolean(busy)} className="op-admin-host-app-reject">Reject</Button>
                    <Button color="light" onClick={() => review('request-changes')} disabled={Boolean(busy)}>Request changes</Button>
                    <Button onClick={() => review('approve')} disabled={Boolean(busy)} className="op-admin-bronze-button">{busy === 'approve' ? 'Approving...' : 'Approve host'}</Button>
                  </div>
                </section>
              )}

              {selected.reviewNote && selected.status !== 'SUBMITTED' && (
                <section className="op-admin-host-app-section">
                  <div className="op-admin-host-app-section-heading"><div><h3>Reviewer note</h3><p>Shared with the applicant.</p></div></div>
                  <p className="op-admin-host-app-experience">{selected.reviewNote}</p>
                </section>
              )}

              {selected.auditLogs?.length > 0 && (
                <section className="op-admin-host-app-section">
                  <div className="op-admin-host-app-section-heading"><div><h3>Review history</h3><p>Immutable actions recorded for this application.</p></div></div>
                  <div className="op-admin-host-app-audit">
                    {selected.auditLogs.map((entry) => (
                      <div key={entry.id}>
                        <span aria-hidden="true" />
                        <p><strong>{String(entry.action).replaceAll('_', ' ')}</strong><small>{formatDate(entry.createdAt, true)}</small></p>
                        {entry.note && <blockquote>{entry.note}</blockquote>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailSection({ title, children }) {
  return <section className="op-admin-host-app-detail-section"><h3>{title}</h3><div>{children}</div></section>;
}

function Detail({ label, value }) {
  return <div className="op-admin-host-app-detail"><span>{label}</span><strong>{value === null || value === undefined || value === '' ? '—' : String(value)}</strong></div>;
}

DetailSection.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
Detail.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.array]) };

export default AdminHostApplications;
