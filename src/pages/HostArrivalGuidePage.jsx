import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from 'flowbite-react';
import { ChevronLeft, CircleAlert } from 'lucide-react';
import apiClient from '../api/client.js';
import ListingEditorTabs from '../components/ListingEditorTabs.jsx';
import ArrivalSectionList from '../components/ArrivalSectionList.jsx';
import CheckInCheckoutFields from '../components/CheckInCheckoutFields.jsx';
import {
  EditorFieldGroup,
  EditorTextAreaRow,
  EditorTextRow,
} from '../components/EditorFieldGroup.jsx';

// The arrival guide is the guest's instructions for arriving and settling in:
// directions, how to get in, the wifi, the manual and the rules. It lives beside
// the listing editor because it is the same listing seen from the guest's side.
//
// Two panes on a wide screen, as the reference does it: the sections on the left,
// the open section's form on the right, and a Save that only lights up once
// something has actually changed. A phone shows one pane at a time, because two
// columns of this would leave neither readable.

const SECTIONS = [
  { key: 'directions', title: 'Directions' },
  // The card names the field a host recognises; the pane it opens covers the
  // whole arrival and departure window, hence the different heading.
  { key: 'checkIn', title: 'Check-in method', paneTitle: 'Check-in & checkout' },
  { key: 'wifi', title: 'Wifi details' },
  { key: 'manual', title: 'House manual' },
  { key: 'rules', title: 'House rules and requests', paneTitle: 'House rules and requests' },
];

// Which drafted fields each section owns. A save sends only its own section's
// fields, so text left unsaved in another section can never be overwritten by it.
const SECTION_FIELDS = {
  directions: ['directions'],
  checkIn: ['checkInMethod', 'checkInWindowStart', 'checkInWindowEnd', 'checkOutTime'],
  wifi: ['wifiNetwork', 'wifiPassword'],
  manual: ['houseManual'],
  rules: ['rulesText'],
};

const HINT = 'mt-1.5 text-xs text-muted';

function draftFrom(property) {
  const rules = Array.isArray(property?.houseRules) ? property.houseRules : [];
  return {
    directions: property?.directions || '',
    checkInMethod: property?.checkInMethod || '',
    checkInWindowStart: property?.checkInWindowStart || '',
    checkInWindowEnd: property?.checkInWindowEnd || '',
    checkOutTime: property?.checkOutTime || '',
    wifiNetwork: property?.wifiNetwork || '',
    wifiPassword: property?.wifiPassword || '',
    houseManual: property?.houseManual || '',
    rulesText: rules.join('\n'),
  };
}

function rulesFromText(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

// What the stored listing says for one drafted field. Rules are held as an array
// and edited as text, so both sides are compared in their text form.
function storedValue(property, field) {
  if (field === 'rulesText') {
    const rules = Array.isArray(property?.houseRules) ? property.houseRules : [];
    return rules.join('\n');
  }
  return property?.[field] || '';
}

function payloadFor(key, draft) {
  const trimmed = (value) => String(value || '').trim();
  switch (key) {
    case 'directions':
      return { directions: trimmed(draft.directions) || null };
    case 'checkIn':
      return {
        checkInMethod: draft.checkInMethod || null,
        checkInWindowStart: draft.checkInWindowStart || null,
        checkInWindowEnd: draft.checkInWindowEnd || null,
        checkOutTime: draft.checkOutTime || null,
      };
    case 'wifi':
      return {
        wifiNetwork: trimmed(draft.wifiNetwork) || null,
        wifiPassword: trimmed(draft.wifiPassword) || null,
      };
    case 'manual':
      return { houseManual: trimmed(draft.houseManual) || null };
    case 'rules':
      return { houseRules: rulesFromText(draft.rulesText) };
    default:
      return {};
  }
}

/** The grey value lines under a section's title in the list. */
function summaryFor(key, property) {
  switch (key) {
    case 'directions':
      return [String(property?.directions || '').trim()].filter(Boolean);
    case 'checkIn': {
      const lines = [property?.checkInMethod].filter(Boolean);
      if (property?.checkInWindowStart) {
        lines.push(
          `Check-in from ${property.checkInWindowStart}${
            property.checkInWindowEnd ? ` until ${property.checkInWindowEnd}` : ''
          }`
        );
      }
      if (property?.checkOutTime) lines.push(`Check-out by ${property.checkOutTime}`);
      return lines;
    }
    case 'wifi':
      return [
        property?.wifiNetwork ? `Network: ${property.wifiNetwork}` : '',
        property?.wifiPassword ? `Password: ${property.wifiPassword}` : '',
      ].filter(Boolean);
    case 'manual':
      return [String(property?.houseManual || '').trim()].filter(Boolean);
    default:
      return [];
  }
}

export default function HostArrivalGuidePage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Directions open first: it is the section a host fills in before a guest sets
  // off, so an empty pane is never the first thing they see.
  const [activeKey, setActiveKey] = useState('directions');
  const [draft, setDraft] = useState(() => draftFrom(null));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [showAllRules, setShowAllRules] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    try {
      const response = await apiClient.get(`/properties/${id}`);
      setProperty(response.data.data);
      setDraft(draftFrom(response.data.data));
    } catch {
      setLoadError('Could not load this listing. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Compared trimmed, so a stray space at the end of a field does not present a
  // Save button that would change nothing.
  const dirty = useMemo(() => {
    if (!property) return false;
    const fields = SECTION_FIELDS[activeKey] || [];
    return fields.some(
      (field) => String(draft[field] || '').trim() !== String(storedValue(property, field) || '').trim()
    );
  }, [activeKey, draft, property]);

  function update(field, value) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setSavedNote('');
  }

  function selectSection(key) {
    setActiveKey(key);
    setSaveError('');
    setSavedNote('');
  }

  async function save() {
    setSaving(true);
    setSaveError('');
    setSavedNote('');
    try {
      const response = await apiClient.put(`/properties/${id}`, payloadFor(activeKey, draft));
      const saved = response.data?.data;
      if (saved) {
        setProperty(saved);
        // Only this section's fields are taken from the server copy: anything
        // half-typed in a section the host has not saved yet stays on screen.
        const savedDraft = draftFrom(saved);
        setDraft((previous) => {
          const next = { ...previous };
          for (const field of SECTION_FIELDS[activeKey] || []) next[field] = savedDraft[field];
          return next;
        });
      }
      setSavedNote('Saved to this listing.');
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
        <span className="block h-40 animate-pulse rounded-2xl bg-inset" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <ListingEditorTabs listingId={id || ''} active="arrival" />
        <div className="mt-4 rounded-2xl bg-elevated p-6 text-center shadow-sm">
          <CircleAlert className="mx-auto h-6 w-6 text-muted" strokeWidth={1.8} aria-hidden="true" />
          <p role="alert" className="mt-2 text-sm text-muted">{loadError}</p>
          <Button className="mt-4" size="sm" onClick={load}>Try again</Button>
        </div>
      </div>
    );
  }

  const listSections = SECTIONS.map((section) => ({
    key: section.key,
    title: section.title,
    placeholder: 'Add details',
    ...(section.key === 'rules'
      ? { rules: Array.isArray(property?.houseRules) ? property.houseRules : [] }
      : { lines: summaryFor(section.key, property) }),
  }));

  const active = SECTIONS.find((section) => section.key === activeKey) || SECTIONS[0];
  const paneTitle = active.paneTitle || active.title;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-start lg:gap-10">
      {/* Section list. On a phone it is the whole screen, so it steps aside once
          a section is open and the back link in the pane brings it back. The
          column pins the header and scrolls only the cards, so "Listing editor"
          and the two tabs never slide away behind a long rules list. */}
      <div
        className={`${activeKey ? 'hidden' : 'flex'} min-w-0 flex-col gap-5 lg:sticky lg:top-20 lg:flex lg:max-h-[calc(100dvh-7rem)]`}
      >
        <ListingEditorTabs listingId={id || ''} active="arrival" />
        <div className="min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-4 lg:pr-1">
          <ArrivalSectionList
            sections={listSections}
            activeKey={activeKey}
            onSelect={selectSection}
            showAllRules={showAllRules}
            onToggleRules={() => setShowAllRules((previous) => !previous)}
          />
        </div>
      </div>

      {/* Capped rather than stretched: the reference keeps the form a readable
          column and lets the rest of the pane stay empty. The pane is also at
          least a screen tall so the Save bar rests at its foot, not under the
          last field. */}
      <div
        className={`${activeKey ? 'flex' : 'hidden'} min-w-0 flex-col gap-6 lg:flex lg:min-h-[calc(100dvh-7rem)] lg:max-w-[680px] lg:border-l lg:border-border lg:pl-10`}
      >
        <button
          type="button"
          onClick={() => selectSection('')}
          className="inline-flex items-center gap-1 self-start text-sm font-semibold text-muted transition-colors hover:text-navy lg:hidden"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          All sections
        </button>

        <h2 className="text-2xl font-semibold tracking-tight text-navy sm:text-3xl">{paneTitle}</h2>

        <div className="flex flex-col gap-2 pb-2">
          {activeKey === 'directions' && (
            <EditorFieldGroup>
              <EditorTextAreaRow
                id="guide-directions"
                label="Directions"
                rows={6}
                value={draft.directions}
                onChange={(next) => update('directions', next)}
                placeholder="Landmarks, the gate colour, where to park, which floor."
              />
            </EditorFieldGroup>
          )}

          {activeKey === 'checkIn' && (
            <CheckInCheckoutFields
              value={{
                checkInMethod: draft.checkInMethod,
                checkInWindowStart: draft.checkInWindowStart,
                checkInWindowEnd: draft.checkInWindowEnd,
                checkOutTime: draft.checkOutTime,
              }}
              onChange={update}
            />
          )}

          {activeKey === 'wifi' && (
            <EditorFieldGroup>
              <EditorTextRow
                id="guide-wifi-network"
                label="Network name"
                value={draft.wifiNetwork}
                onChange={(next) => update('wifiNetwork', next)}
                placeholder="The name a guest picks from the wifi list"
              />
              <EditorTextRow
                id="guide-wifi-password"
                label="Password"
                value={draft.wifiPassword}
                onChange={(next) => update('wifiPassword', next)}
                placeholder="Case matters, as it does on the router"
              />
            </EditorFieldGroup>
          )}

          {activeKey === 'manual' && (
            <EditorFieldGroup>
              <EditorTextAreaRow
                id="guide-manual"
                label="House manual"
                rows={8}
                value={draft.houseManual}
                onChange={(next) => update('houseManual', next)}
                placeholder="Appliances, hot water, bins, anything that is not obvious."
              />
            </EditorFieldGroup>
          )}

          {activeKey === 'rules' && (
            <>
              <EditorFieldGroup>
                <EditorTextAreaRow
                  id="guide-rules"
                  label="House rules"
                  rows={6}
                  value={draft.rulesText}
                  onChange={(next) => update('rulesText', next)}
                  placeholder={'Up to 2 overnight guests\nNo pets\nNo smoking'}
                />
              </EditorFieldGroup>
              <p className={HINT}>One rule per line. The section card shows the first three.</p>
            </>
          )}
        </div>

        {/* The bar stays put at the bottom of the pane, as the reference does, so
            Save is reachable however far down the form sits. */}
        <div className="sticky bottom-0 z-10 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border bg-canvas py-4">
          <span className="min-w-0 text-xs" role="status">
            {saveError ? <span className="text-red-600">{saveError}</span> : null}
            {!saveError && savedNote ? <span className="text-muted">{savedNote}</span> : null}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-7 text-sm font-semibold transition-colors ${
              dirty && !saving
                ? 'bg-navy-bg text-white hover:bg-navy-hover'
                : 'cursor-not-allowed bg-inset text-muted'
            }`}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
