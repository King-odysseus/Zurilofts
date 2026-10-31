import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Button, Label, TextInput } from 'flowbite-react';
import { CircleAlert, CircleCheck, CigaretteOff, Eye, PawPrint, Users } from 'lucide-react';
import apiClient from '../api/client.js';
import SelectMenu from '../components/SelectMenu.jsx';
import ListingEditorTabs from '../components/ListingEditorTabs.jsx';

// The arrival guide answers the questions a guest has after booking: how to get
// in, the wifi, the manual and the rules. It lives beside the listing editor
// because it is the same listing seen from the guest's side.

const CHECK_IN_OPTIONS = [
  { value: 'Lockbox', label: 'Lockbox' },
  { value: 'Keypad', label: 'Keypad' },
  { value: 'Smart lock', label: 'Smart lock' },
  { value: 'Building staff', label: 'Building staff' },
  { value: 'Host greets', label: 'Host greets you' },
];

const CARD = 'rounded-2xl bg-elevated p-5 text-left shadow-sm sm:p-6';
const TITLE = 'block text-base font-semibold text-navy';
const VALUE = 'mt-1 block whitespace-pre-line text-sm leading-relaxed text-muted';
const PLACEHOLDER = 'mt-1 block text-sm text-muted';
const FIELD = 'mt-3 flex flex-col gap-3';

/** Rules carry an icon chosen from their own wording, as the reference does. */
function ruleIcon(rule) {
  const text = rule.toLowerCase();
  if (/pet|dog|cat|animal/.test(text)) return PawPrint;
  if (/smok|cigarette|vape/.test(text)) return CigaretteOff;
  if (/guest|people|person|occupan/.test(text)) return Users;
  return CircleCheck;
}

function ReadCard({ title, lines, onEdit, extra }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className={`${CARD} w-full transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35`}
    >
      <span className={TITLE}>{title}</span>
      {lines.length === 0 ? <span className={PLACEHOLDER}>Add details</span> : null}
      {lines.map((line) => (
        <span key={line} className={VALUE}>{line}</span>
      ))}
      {extra}
    </button>
  );
}

ReadCard.propTypes = {
  title: PropTypes.string.isRequired,
  lines: PropTypes.arrayOf(PropTypes.string).isRequired,
  onEdit: PropTypes.func.isRequired,
  extra: PropTypes.node,
};

function EditActions({ saving, onSave, onCancel }) {
  return (
    <span className="mt-4 flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onClick={onSave} disabled={saving} isProcessing={saving}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
      <Button type="button" size="sm" color="light" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
    </span>
  );
}

EditActions.propTypes = {
  saving: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default function HostArrivalGuidePage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Only one card edits at a time, so a half-typed wifi password cannot be lost
  // by opening a second card, and a single Save cannot overwrite two fields.
  const [openCard, setOpenCard] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [draft, setDraft] = useState({ directions: '', checkInMethod: '', wifiNetwork: '', wifiPassword: '', houseManual: '', rulesText: '' });
  const [showAllRules, setShowAllRules] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    try {
      const response = await apiClient.get(`/properties/${id}`);
      setProperty(response.data.data);
    } catch {
      setLoadError('Could not load this listing. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(card) {
    const rules = Array.isArray(property?.houseRules) ? property.houseRules : [];
    setDraft({
      directions: property?.directions || '',
      checkInMethod: property?.checkInMethod || '',
      wifiNetwork: property?.wifiNetwork || '',
      wifiPassword: property?.wifiPassword || '',
      houseManual: property?.houseManual || '',
      rulesText: rules.join('\n'),
    });
    setSaveError('');
    setOpenCard(card);
  }

  // A partial PUT: only the fields this card owns, so an untouched card can
  // never be overwritten with stale text from when the page was loaded.
  async function save(payload) {
    setSaving(true);
    setSaveError('');
    try {
      const response = await apiClient.put(`/properties/${id}`, payload);
      setProperty((previous) => ({ ...previous, ...payload, ...(response.data?.data || {}) }));
      setOpenCard('');
    } catch (error) {
      setSaveError(error.response?.data?.error || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3" role="status" aria-label="Loading arrival guide">
        <span className="block h-12 animate-pulse rounded-2xl bg-inset" />
        <span className="block h-24 animate-pulse rounded-2xl bg-inset" />
        <span className="block h-24 animate-pulse rounded-2xl bg-inset" />
        <span className="block h-32 animate-pulse rounded-2xl bg-inset" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <ListingEditorTabs listingId={id || ''} active="arrival" />
        <div className={`${CARD} mt-4 text-center`}>
          <CircleAlert className="mx-auto h-6 w-6 text-muted" strokeWidth={1.8} aria-hidden="true" />
          <p className="mt-2 text-sm text-muted">{loadError}</p>
          <Button className="mt-4" size="sm" onClick={load}>Try again</Button>
        </div>
      </div>
    );
  }

  const rules = Array.isArray(property?.houseRules) ? property.houseRules : [];
  const visibleRules = showAllRules ? rules : rules.slice(0, 3);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-8">
      <ListingEditorTabs listingId={id || ''} active="arrival" />

      {saveError ? <p className="text-xs text-red-600" role="alert">{saveError}</p> : null}

      {/* Directions */}
      {openCard === 'directions' ? (
        <div className={CARD}>
          <Label htmlFor="guide-directions" className={TITLE}>Directions</Label>
          <div className={FIELD}>
            <textarea
              id="guide-directions"
              rows={4}
              value={draft.directions}
              onChange={(event) => setDraft((previous) => ({ ...previous, directions: event.target.value }))}
              placeholder="Landmarks, the gate colour, where to park, which floor."
            />
          </div>
          <EditActions saving={saving} onSave={() => save({ directions: draft.directions.trim() || null })} onCancel={() => setOpenCard('')} />
        </div>
      ) : (
        <ReadCard title="Directions" lines={property?.directions ? [property.directions] : []} onEdit={() => startEdit('directions')} />
      )}

      {/* Check-in method */}
      {openCard === 'checkIn' ? (
        <div className={CARD}>
          <Label htmlFor="guide-checkin" className={TITLE}>Check-in method</Label>
          <div className={FIELD}>
            <SelectMenu
              id="guide-checkin"
              value={draft.checkInMethod}
              onChange={(next) => setDraft((previous) => ({ ...previous, checkInMethod: next }))}
              options={CHECK_IN_OPTIONS}
              placeholder="Choose how guests get in"
              ariaLabel="Check-in method"
            />
          </div>
          <EditActions saving={saving} onSave={() => save({ checkInMethod: draft.checkInMethod || null })} onCancel={() => setOpenCard('')} />
        </div>
      ) : (
        <ReadCard title="Check-in method" lines={property?.checkInMethod ? [property.checkInMethod] : []} onEdit={() => startEdit('checkIn')} />
      )}

      {/* Wifi details */}
      {openCard === 'wifi' ? (
        <div className={CARD}>
          <Label htmlFor="guide-wifi-network" className={TITLE}>Wifi details</Label>
          <div className={FIELD}>
            <TextInput
              id="guide-wifi-network"
              value={draft.wifiNetwork}
              onChange={(event) => setDraft((previous) => ({ ...previous, wifiNetwork: event.target.value }))}
              placeholder="Network name"
            />
            <TextInput
              id="guide-wifi-password"
              value={draft.wifiPassword}
              onChange={(event) => setDraft((previous) => ({ ...previous, wifiPassword: event.target.value }))}
              placeholder="Password"
            />
          </div>
          <EditActions
            saving={saving}
            onSave={() => save({
              wifiNetwork: draft.wifiNetwork.trim() || null,
              wifiPassword: draft.wifiPassword.trim() || null,
            })}
            onCancel={() => setOpenCard('')}
          />
        </div>
      ) : (
        <ReadCard
          title="Wifi details"
          lines={[
            property?.wifiNetwork ? `Network: ${property.wifiNetwork}` : '',
            property?.wifiPassword ? `Password: ${property.wifiPassword}` : '',
          ].filter(Boolean)}
          onEdit={() => startEdit('wifi')}
        />
      )}

      {/* House manual */}
      {openCard === 'manual' ? (
        <div className={CARD}>
          <Label htmlFor="guide-manual" className={TITLE}>House manual</Label>
          <div className={FIELD}>
            <textarea
              id="guide-manual"
              rows={5}
              value={draft.houseManual}
              onChange={(event) => setDraft((previous) => ({ ...previous, houseManual: event.target.value }))}
              placeholder="Appliances, hot water, bins, anything that is not obvious."
            />
          </div>
          <EditActions saving={saving} onSave={() => save({ houseManual: draft.houseManual.trim() || null })} onCancel={() => setOpenCard('')} />
        </div>
      ) : (
        <ReadCard title="House manual" lines={property?.houseManual ? [property.houseManual] : []} onEdit={() => startEdit('manual')} />
      )}

      {/* House rules and requests */}
      <section className={CARD}>
        <span className={TITLE}>House rules and requests</span>

        {openCard === 'rules' ? (
          <>
            <div className={FIELD}>
              {/* One rule per line: a textarea is the fastest thing to edit on a
                  phone, and removing a line is just deleting it. */}
              <textarea
                id="guide-rules"
                rows={5}
                value={draft.rulesText}
                onChange={(event) => setDraft((previous) => ({ ...previous, rulesText: event.target.value }))}
                placeholder={'Up to 2 overnight guests\nNo pets\nNo smoking'}
              />
            </div>
            <EditActions
              saving={saving}
              onSave={() => save({
                houseRules: draft.rulesText.split('\n').map((line) => line.trim()).filter(Boolean),
              })}
              onCancel={() => setOpenCard('')}
            />
          </>
        ) : (
          <>
            {rules.length === 0 ? <span className={PLACEHOLDER}>Add details</span> : null}
            <ul className="mt-2 flex flex-col">
              {visibleRules.map((rule) => {
                const Icon = ruleIcon(rule);
                return (
                  <li key={rule} className="flex items-center gap-3 py-2">
                    <Icon className="h-5 w-5 shrink-0 text-navy" strokeWidth={1.8} aria-hidden="true" />
                    <span className="text-sm text-navy">{rule}</span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-2 flex items-end justify-between gap-3">
              <span className="flex items-center gap-3 text-xs">
                {/* The reference reads "+ N more" next to the pill; keep that and
                    put the way to change the rules beside it. */}
                {rules.length > 3 && !showAllRules ? (
                  <span className="text-muted">+ {rules.length - 3} more</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => startEdit('rules')}
                  className="font-semibold text-muted underline underline-offset-2 hover:text-navy"
                >
                  {rules.length === 0 ? 'Add house rules' : 'Edit'}
                </button>
              </span>

              {/* The pill only makes sense when there is something hidden. */}
              {rules.length > 3 ? (
                <button
                  type="button"
                  onClick={() => setShowAllRules((previous) => !previous)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-navy-bg px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-hover"
                >
                  <Eye className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  {showAllRules ? 'Show less' : 'View'}
                </button>
              ) : null}
            </div>
          </>
        )}
      </section>

      <p className="text-xs text-muted">
        Saved to this listing. <Link to={`/host/properties/${id}/edit`} className="font-semibold text-navy underline underline-offset-2">Back to your space</Link>
      </p>
    </div>
  );
}
