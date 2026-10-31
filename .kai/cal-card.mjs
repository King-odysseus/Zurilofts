import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/pages/HostCalendarPage.jsx';
let s = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const before = s;

const swap = (from, to) => {
  if (!s.includes(from)) throw new Error(`missing: ${from.slice(0, 70)}`);
  s = s.replace(from, to);
};

// --- constants -------------------------------------------------------------
swap(`const CARD = 'rounded-2xl border border-border bg-elevated shadow-sm';\nconst PANEL_HEAD = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600';`,
     `const ROW_PADDING = 6;`);

swap(`// A booking bar sits below the date/price line, one 22px lane per stay, so a
// week with two bookings never hides one behind the other. The matching cell
// height lives in the .zl-cal-cell rule in index.css.`,
     `// A booking bar sits below the date/price line, one 22px lane per stay, so a
// week with two bookings never hides one behind the other. The week's cells
// reserve that much height through the --cal-min custom property below.`);

// --- cell: height from the week's lane count, navy instead of bronze --------
swap(`              className={\`zl-cal-cell relative flex flex-col border-l border-border px-1 pb-1 pt-1 text-left transition-colors first:border-l-0 sm:px-2 sm:pb-1.5 sm:pt-1.5 \${`,
     `              className={\`relative flex min-h-[54px] flex-col border-l border-border px-1 pb-1 pt-1 text-left transition-colors first:border-l-0 sm:min-h-[var(--cal-min,72px)] sm:px-2 sm:pb-1.5 sm:pt-1.5 \${`);

swap(`                  ? 'bg-primary-50 ring-2 ring-inset ring-primary'`,
     `                  ? 'bg-[#EEF2F8] ring-2 ring-inset ring-navy'`);

swap(`\${isSelected ? 'bg-primary text-white' : isToday`,
     `\${isSelected ? 'bg-navy text-white' : isToday`);

swap(`                isSelected
                  ? 'bg-[#EEF2F8] ring-2 ring-inset ring-navy'
                  : stay
                    ? 'cursor-default bg-[#EDF1F7]'
                    : blocked
                      ? 'bg-surface'
                      : \`\${outside ? 'bg-surface/40' : 'bg-elevated'} hover:bg-surface/70\``,
     `                isSelected
                  ? 'bg-[#EEF2F8] ring-2 ring-inset ring-navy'
                  : stay
                    ? 'cursor-default bg-[#EFF3F9]'
                    : blocked
                      ? 'bg-surface'
                      : \`\${outside ? 'bg-surface/40' : 'bg-elevated'} hover:bg-surface/70\``);

// The week grid owns the reserved height; cells stretch to it.
swap(`      return <div key={weekStart.toISOString()} className="relative border-b border-border last:border-b-0">
        <div className="grid grid-cols-7">`,
     `      // Two rows of a bare date need no extra lane, so the floor (72px) covers
      // an empty week and each bar past the first adds its own lane.
      const weekMinHeight = Math.max(72, 48 + barRows * BAR_STEP);

      return <div key={weekStart.toISOString()} className="relative border-b border-border last:border-b-0">
        <div className="grid grid-cols-7" style={{ '--cal-min': \`\${weekMinHeight}px\` }}>`);

// Padding-bottom inside the cell goes: the lane height now lives on the row.
swap(`              }`}
              style={{ '--cal-rows': barRows }}
            >`, `              }`}
            >`);

// --- page shell ------------------------------------------------------------
swap(`import { Alert, Button, Label, TextInput, ToggleSwitch } from 'flowbite-react';`,
     `import { Alert, Button, Label, TextInput, ToggleSwitch } from 'flowbite-react';\nimport HostCard, { HOST_EYEBROW } from '../components/HostCard.jsx';`);

swap(`        <p className={PANEL_HEAD}>HOST WORKSPACE</p>`, `        <p className={HOST_EYEBROW}>HOST WORKSPACE</p>`);

swap(`const BTN_PRIMARY = 'h-9 !items-center !rounded-full !border-0 !bg-primary !px-4 !text-sm !font-semibold !text-white hover:!bg-primary-hover hover:!text-white';\n`, ``);

swap(`<Button as={Link} to="/host/properties/new" className={\`mx-auto mt-4 w-fit \${BTN_PRIMARY}\`}>Add a listing</Button>`,
     `<Button as={Link} to="/host/properties/new" size="sm" className="mx-auto mt-4 w-fit">Add a listing</Button>`);

swap(`    {loading ? <div className={\`\${CARD} p-5\`} aria-label="Loading calendar">
      <span className="block h-[420px] animate-pulse rounded-lg bg-surface" />
    </div> : !activePropertyId ? <div className={\`\${CARD} px-5 py-12 text-center\`}>`,
     `    {loading ? <HostCard aria-label="Loading calendar">
      <span className="block h-[420px] animate-pulse rounded-lg bg-surface" />
    </HostCard> : !activePropertyId ? <HostCard className="py-12 text-center">`);

swap(`      <Button as={Link} to="/host/properties/new" size="sm" className="mx-auto mt-4 w-fit">Add a listing</Button>
    </div> : <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
      <section className={\`\${CARD} overflow-hidden\`} aria-label="Month calendar">`,
     `      <Button as={Link} to="/host/properties/new" size="sm" className="mx-auto mt-4 w-fit">Add a listing</Button>
    </HostCard> : <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
      {/* Flush: the grid and the totals strip run edge to edge, while the head
          keeps its own padding so it still lines up with the side panel. */}
      <HostCard as="section" aria-label="Month calendar" flush className="overflow-hidden">`);

swap(`          onToggle={toggleDay}
        />
      </section>

      <aside className={\`\${CARD} h-fit overflow-hidden\`} aria-label="Calendar settings">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-navy">Pricing and availability</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">Changes here apply to this stay only.</p>
        </div>

        {selectionCount > 0 && <div className="mb-3 rounded-xl border border-primary/30 bg-primary-50/70 p-3">`,
     `          onToggle={toggleDay}
        />
      </HostCard>

      <HostCard as="aside" aria-label="Calendar settings" flush className="h-fit">
        {selectionCount > 0 && <div className="border-b border-border bg-[#F7F9FC] px-4 py-3">`);

writeFileSync(path, s.replace(/\n/g, '\r\n'));
console.log('calendar card swap done', before.length, '->', s.length);
