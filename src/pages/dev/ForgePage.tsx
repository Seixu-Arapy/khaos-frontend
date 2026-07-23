import { useState } from 'react';
import { Bug, Plus, X } from 'lucide-react';
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
      index="V"
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
      </Section>

      <Section title="Labels">
        {/* From every field label in TaskDetailModal (Due, Target, Tags). */}
        <Swatch label="field label">
          <label className="text-nyx-500 mb-1 block text-caption font-medium">
            Estimate
          </label>
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
        <Swatch label="remove / close (×)">
          {/* From checklist item rows and chip removal -- bare icon,
              hover reveals danger. */}
          <button type="button" aria-label="Remove" className="hover:text-tartarus-500">
            <X size={13} className="text-nyx-500" />
          </button>
        </Swatch>
      </Section>

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
      </Section>
    </Chamber>
  );
}
