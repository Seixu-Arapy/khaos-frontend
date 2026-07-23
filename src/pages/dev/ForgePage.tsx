import { useState } from 'react';
import { Bug, Plus, Search, X } from 'lucide-react';
import { Chamber, Section, Swatch } from './vaultUI';
import { Button, IconButton, Select, TextInput } from '../../components/common/ui';

// The patterns below are copied verbatim from where they actually live
// (TaskDetailModal, CalendarView) -- deliberately not new shared
// components. Consolidating these into real primitives is CMP, parked
// for Round 2; this chamber shows what exists today so CMP has a real
// inventory to build from, not a guess.

export default function ForgePage() {
  const [text, setText] = useState('');
  const [checked, setChecked] = useState(true);
  const [toggled, setToggled] = useState(true);
  const [addActive, setAddActive] = useState(false);

  return (
    <Chamber
      index="IV"
      name="The Forge"
      tagline="Buttons, inputs, selects — tools built for the hand"
    >
      <Section title="Buttons">
        <Swatch label="default">
          <Button>Save</Button>
        </Swatch>
        <Swatch label="secondary">
          <Button variant="secondary">Cancel</Button>
        </Swatch>
        <Swatch label="ghost">
          <Button variant="ghost">Dismiss</Button>
        </Swatch>
        <Swatch label="danger">
          <Button variant="danger">Delete</Button>
        </Swatch>
        <Swatch label="sm">
          <Button size="sm">Small</Button>
        </Swatch>
        <Swatch label="icon button">
          <IconButton label="Close">
            <Bug size={16} />
          </IconButton>
        </Swatch>
        <Swatch label="disabled">
          <Button disabled>Save</Button>
        </Swatch>
      </Section>

      <Section title="Inputs">
        <Swatch label="text input">
          <TextInput
            placeholder="Type something…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Swatch>
        <Swatch label="select">
          {/* Was px-2/py-1.5 here vs px-3/py-2 on TextInput -- the two
              controls rendered at different heights side by side. Fixed
              to match. */}
          <Select defaultValue="b">
            <option value="a">Option A</option>
            <option value="b">Option B</option>
          </Select>
        </Swatch>
        <Swatch label="checkbox">
          {/* From TaskDetailModal's checklist items. */}
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="border-nyx-600 bg-nyx-800 accent-eros-500 h-4 w-4 rounded"
          />
        </Swatch>
        <Swatch label="text input, disabled">
          <TextInput value="Locked" disabled />
        </Swatch>
        <Swatch label="select, disabled">
          <Select defaultValue="b" disabled>
            <option value="b">Option B</option>
          </Select>
        </Swatch>
        <Swatch label="checkbox, disabled">
          <input
            type="checkbox"
            checked
            disabled
            readOnly
            className="border-nyx-600 bg-nyx-800 accent-eros-500 h-4 w-4 rounded disabled:cursor-not-allowed disabled:opacity-50"
          />
        </Swatch>
        <Swatch label="date">
          {/* From TaskDetailModal's due-date field, un-stripped -- the
              real usage overrides border/bg/padding to sit inline in a
              pill, but the base control is still TextInput. */}
          <div className="w-40">
            <TextInput type="date" defaultValue="2026-08-01" />
          </div>
        </Swatch>
        <Swatch label="number">
          {/* From the Estimate field's minutes input. */}
          <div className="w-20">
            <TextInput type="number" min="0" defaultValue="90" />
          </div>
        </Swatch>
        <Swatch label="password">
          {/* From PasswordGate -- otherwise identical to a text input. */}
          <div className="w-40">
            <TextInput type="password" defaultValue="••••••••" />
          </div>
        </Swatch>
        <Swatch label="textarea">
          {/* From the chat composer -- same field styling as TextInput,
              rounded-2xl instead of rounded, resize-none. */}
          <textarea
            rows={2}
            placeholder="Ask Khaos…"
            className="border-nyx-600 bg-nyx-800 text-nyx-100 placeholder:text-nyx-500 focus:border-eros-400 w-56 resize-none rounded-2xl border px-4 py-2 text-body leading-normal focus:outline-none"
          />
        </Swatch>
        <Swatch label="search (icon + pill)">
          {/* From QuickAddBar -- leading icon, fully rounded, no visible
              chevron/affordance since it's a free-text field, not a picker. */}
          <div className="relative w-56">
            <Search
              size={15}
              className="text-nyx-500 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
            />
            <input
              placeholder="Quick add…"
              className="border-nyx-600 bg-nyx-800 text-nyx-100 placeholder:text-nyx-500 focus:border-eros-400 w-full rounded-full border py-2 pr-3 pl-9 text-body focus:outline-none"
            />
          </div>
        </Swatch>
      </Section>

      <Section title="Labels">
        {/* From every field label in TaskDetailModal (Due, Target, Tags,
            Previous/Next tasks, Time logged, Moments) -- all-caps,
            tracking-wide, semibold. Was font-medium/no-caps here before,
            which didn't match a single real usage. */}
        <Swatch label="field label">
          <label className="text-nyx-500 mb-1 block text-caption font-semibold tracking-wide uppercase">
            Estimate
          </label>
        </Swatch>
      </Section>

      <Section title="Divider">
        {/* Not a real component today -- border-nyx-700 on a plain div,
            repeated across TaskDetailModal/AppShell/boards/Modal/
            CommandPalette. border-t and border-b aren't interchangeable
            picks for the same job -- checked real usage: border-t always
            separates stacked sibling sections *within* scrolling content
            (TaskDetailModal's field groups, applied to the top of each
            block after the first -- first:border-0 avoids a stray line
            before the first one). border-b always underlines a *fixed
            header bar* sitting above scrollable content (AppShell's top
            bar, Modal's header, CommandPalette's search row, TaskList's
            column header) -- never used between sibling sections. */}
        <Swatch label="section divider (border-t)">
          <div className="w-56">
            <div className="border-nyx-700 border-t pt-3.5">
              <span className="text-nyx-500 text-caption">Next section…</span>
            </div>
          </div>
        </Swatch>
        <Swatch label="header divider (border-b)">
          <div className="w-56">
            <div className="border-nyx-700 border-b pb-2">
              <span className="text-nyx-300 text-body">Fixed header</span>
            </div>
          </div>
        </Swatch>
      </Section>

      <Section title="Add / remove">
        <Swatch label="add button">
          {/* AddButton pattern from TaskDetailModal -- bordered pill,
              lights up eros when active. */}
          <button
            type="button"
            onClick={() => setAddActive((v) => !v)}
            className={`flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-label transition-colors ${
              addActive
                ? 'border-eros-500 text-eros-400 bg-eros-500/10'
                : 'border-nyx-700 text-nyx-500 hover:text-nyx-300'
            }`}
          >
            <Plus size={10} /> Add time
          </button>
        </Swatch>
        <Swatch label="add (inline, checklist)">
          {/* From the checklist's "add item" row. */}
          <div className="flex items-center gap-1.5">
            <Plus size={14} className="text-nyx-500" />
            <span className="text-nyx-500 text-body">Add a checklist item…</span>
          </div>
        </Swatch>
        <Swatch label="add (icon-only)">
          {/* IconAddButton, from TaskDetailModal's "Add previous/next
              task" -- genuinely icon-only, no visible label (aria-label
              only). This DOES exist, contradicting an earlier claim on
              this page that no icon-only add pattern exists anywhere. */}
          <button
            type="button"
            aria-label="Add previous task"
            title="Add previous task"
            className="bg-hypnos-400 text-nyx-900 hover:bg-hypnos-300 active:bg-hypnos-500 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors"
          >
            <Plus size={10} />
          </button>
        </Swatch>
        <Swatch label="remove / close (×)">
          {/* From checklist item rows and chip removal -- bare icon,
              hover reveals danger. Hover class must live on the icon
              itself, not the button -- the icon's own color class wins
              over a parent's hover otherwise. */}
          <button type="button" aria-label="Remove">
            <X size={13} className="text-nyx-500 hover:text-tartarus-500" />
          </button>
        </Swatch>
      </Section>

      <div className="border-nyx-700 mb-10 max-w-prose border-t pt-6 text-caption leading-relaxed">
        <p className="text-nyx-200 mb-3 font-semibold tracking-wide uppercase">
          Why add/remove stay this muted
        </p>
        <p className="text-nyx-400 mb-1.5">
          <em>Correction from an earlier pass:</em> icon-only add does
          exist — <code className="text-eros-400">IconAddButton</code>{' '}
          (Previous/Next tasks). It works there because the field label
          right next to it (&ldquo;Previous tasks&rdquo;) already says what&rsquo;s
          being added, and the row has no spare width for a second
          label. The checklist and add-time patterns keep their own text
          because they don&rsquo;t sit next to a labeled context the
          same way.
        </p>
        <p className="text-nyx-400">
          Add stays Nyx-grey rather than Eros so Eros keeps meaning one
          thing app-wide: <em>this needs you</em>. An always-visible add
          control isn&rsquo;t a call to act, it&rsquo;s just always there —
          coloring it would dilute the one signal Eros is supposed to carry.
          Remove earns its danger hover because deleting is the one
          add/remove action with real consequence.
        </p>
      </div>

      <Section title="Toggle">
        <Swatch label="switch">
          {/* From CalendarView's "show logged time" control. */}
          <button
            type="button"
            onClick={() => setToggled((v) => !v)}
            className="text-nyx-300 flex items-center gap-2 text-caption"
          >
            <span
              className={`relative inline-block h-[17px] w-[30px] shrink-0 rounded-full transition-colors ${
                toggled ? 'bg-pontus-500' : 'bg-nyx-700'
              }`}
            >
              <span
                className={`bg-nyx-100 absolute top-0.5 h-[13px] w-[13px] rounded-full transition-all ${
                  toggled ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </span>
            Show logged time
          </button>
        </Swatch>
        <Swatch label="switch, disabled">
          <button type="button" disabled className="text-nyx-300 flex items-center gap-2 text-caption disabled:cursor-not-allowed disabled:opacity-50">
            <span className="bg-pontus-500 relative inline-block h-[17px] w-[30px] shrink-0 rounded-full">
              <span className="bg-nyx-100 absolute top-0.5 right-0.5 h-[13px] w-[13px] rounded-full" />
            </span>
            Show logged time
          </button>
        </Swatch>
      </Section>

      <div className="max-w-prose text-caption leading-relaxed">
        <p className="text-nyx-200 mb-3 font-semibold tracking-wide uppercase">
          Why the toggle is Pontus
        </p>
        <p className="text-nyx-400 mb-1.5">
          <em>Correction from an earlier pass:</em> &ldquo;only one toggle
          in the app&rdquo; was too narrow — <code className="text-eros-400">TimeToggle</code>{' '}
          (Due&rsquo;s and Target&rsquo;s add/remove-time control, shown in
          Inputs above) is also a binary on/off toggle, just button-shaped
          instead of switch-shaped. The claim below is specifically about
          the <em>switch</em> (track + sliding thumb) pattern, which really
          is still one-of-one.
        </p>
        <p className="text-nyx-400">
          Not a deliberate REN choice — the switch inherited Pontus
          mechanically from the pre-rename teal. It reads fine (Pontus
          already means &ldquo;active/current&rdquo; elsewhere, e.g. the
          in-review status), but it hasn&rsquo;t been tested against a
          second switch yet. Worth revisiting once a second one exists to
          confirm the pattern rather than one sample.
        </p>
      </div>
    </Chamber>
  );
}
