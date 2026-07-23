import { useMemo, useState } from 'react';
import { Globe } from 'lucide-react';
import { getTimezone, setTimezone, getAllTimezones } from '../../lib/timezone';
import { Modal, Button } from './ui';

export default function TimezonePicker() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(getTimezone);
  const [search, setSearch] = useState('');

  const current = getTimezone();

  // "America/Sao_Paulo" → "Sao Paulo"
  const cityLabel = (current.split('/').pop() ?? current).replace(/_/g, ' ');

  // Use Intl's native offset: "GMT-3", "GMT+5:30", etc.
  const offsetLabel = useMemo(() => {
    try {
      return (
        new Intl.DateTimeFormat('en', {
          timeZone: current,
          timeZoneName: 'shortOffset',
        })
          .formatToParts(new Date())
          .find((p) => p.type === 'timeZoneName')?.value ?? ''
      );
    } catch {
      return '';
    }
  }, [current]);

  const all = useMemo(() => getAllTimezones(), []);
  const filtered = useMemo(
    () =>
      search.trim()
        ? all.filter((tz) =>
            tz.toLowerCase().includes(search.trim().toLowerCase())
          )
        : all,
    [all, search]
  );

  function handleSave() {
    setTimezone(selected); // triggers a page reload
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="border-nyx-700 text-nyx-400 hover:border-nyx-500 hover:text-nyx-200 flex items-center gap-1.5 rounded-full border px-2 py-1 text-caption transition-colors"
        title="Change timezone"
      >
        <Globe size={12} />
        <span className="hidden sm:inline">{cityLabel}</span>
        <span className="text-nyx-600">{offsetLabel}</span>
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setSearch('');
        }}
        title="Timezone"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setSearch('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={selected === current}>
              Save & reload
            </Button>
          </>
        }
      >
        <p className="text-nyx-400 mb-3 text-body">
          All dates and times will be shown in this timezone.{' '}
          <span className="text-nyx-200">{current}</span>
        </p>
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search timezones…"
          className="border-nyx-600 bg-nyx-900 text-nyx-100 placeholder:text-nyx-500 focus:border-eros-400 mb-2 w-full rounded border px-3 py-2 text-body focus:outline-hidden"
        />
        <div className="border-nyx-700 max-h-72 overflow-y-auto rounded border">
          {filtered.map((tz) => (
            <button
              key={tz}
              onClick={() => setSelected(tz)}
              className={`hover:bg-nyx-700 flex w-full items-center justify-between px-3 py-2 text-left text-body transition-colors ${
                selected === tz
                  ? 'bg-eros-500/10 text-eros-400'
                  : 'text-nyx-200'
              }`}
            >
              <span>{tz.replace(/_/g, ' ')}</span>
              {selected === tz && (
                <span className="text-eros-500 text-caption">✓</span>
              )}
            </button>
          ))}
          {!filtered.length && (
            <p className="text-nyx-600 px-3 py-4 text-body">No results</p>
          )}
        </div>
      </Modal>
    </>
  );
}
