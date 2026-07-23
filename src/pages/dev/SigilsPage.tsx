import { useState } from 'react';
import { Chamber, Section, Swatch } from './vaultUI';
import {
  StatusBadge,
  PriorityBadge,
  StatusPicker,
  PriorityPicker,
  FieldBadge,
  ProjectChip,
  DueBadge,
  TargetBadge,
  ScheduledBadge,
  TaskProgressBar,
  Tag,
} from '../../components/common/ui';
import { ChangeBadge } from '../../components/assistant/ChangeBadge';
import { STATUSES, PRIORITIES } from '../../lib/constants';
import { FIELDS_CONFIG } from '../../lib/fieldsConfig';
import type { Status, Priority } from '../../lib/types';

const SAMPLE_CHANGES = [
  { field: 'status' as const, label: 'Status', from: 'todo', to: 'in_progress' },
  { field: 'priority' as const, label: 'Priority', from: 'medium', to: 'urgent' },
  { field: 'due' as const, label: 'Due', from: null, to: '2026-07-20' },
  { field: 'estimate' as const, label: 'Estimate', from: null, to: '120' },
];

export default function SigilsPage() {
  const [status, setStatus] = useState<Status>('in_progress');
  const [priority, setPriority] = useState<Priority>('medium');
  const fieldNames = Object.keys(FIELDS_CONFIG);
  const sampleField = fieldNames[0];

  return (
    <Chamber
      index="V"
      name="The Sigils"
      tagline="Status, priority, fields, dates, tags — marks that carry meaning"
    >
      <div className="mb-10">
        <h2 className="font-serif text-nyx-100 mb-3 text-2xl">
          Part I — The Entities
        </h2>
        <p className="text-nyx-400 mb-8 max-w-prose text-caption leading-relaxed">
          The real rows saved in tables (<code className="text-eros-400">
            fields
          </code>
          , <code className="text-eros-400">projects</code>,{' '}
          <code className="text-eros-400">sections</code>,{' '}
          <code className="text-eros-400">tasks</code>, and the rest), each
          with its own identity — not just a value pulled from a fixed
          vocabulary (that&rsquo;s Part II, below).
        </p>
        <p className="text-nyx-400 mb-8 max-w-prose text-caption leading-relaxed">
          <b className="text-nyx-200">Chip vs. badge, where it matters:</b> a{' '}
          <b>chip</b> stands in for a specific saved record — it has an
          identity, so it can be clicked through to that record or removed
          from where it&rsquo;s attached (<code className="text-eros-400">
            ProjectChip
          </code>
          , <code className="text-eros-400">Tag</code>). A <b>badge</b> just
          renders one field&rsquo;s current value — no identity of its own
          beyond that value, nothing to click through to (
          <code className="text-eros-400">StatusBadge</code>,{' '}
          <code className="text-eros-400">FieldBadge</code>). Field is the
          one entity styled as a badge rather than a chip — it reads as a
          tag-shaped label on other things (a project&rsquo;s field, a
          task&rsquo;s field) more often than as a thing in its own right,
          so it kept the badge shape it already had rather than being
          forced into a chip.
        </p>

        <Section title="Entities with a chip or badge">
          <Swatch label="project — chip">
            <ProjectChip name="Roadmap Q3" fieldName={sampleField} />
          </Swatch>
          <Swatch label="tag (work_tags) — chip">
            <Tag onRemove={() => {}}>design</Tag>
          </Swatch>
          <Swatch label="field — badge">
            <FieldBadge fieldName={sampleField} size="sm" />
          </Swatch>
        </Section>

        <p className="text-nyx-400 mb-3 mt-2 max-w-prose text-caption leading-relaxed">
          <b className="text-nyx-200">
            Entities that still don&rsquo;t have a defined chip or badge
          </b>{' '}
          of their own — shown elsewhere today, but not as a compact,
          reusable mark:
        </p>
        <Section title="Entities without one yet">
          <Swatch label="task">
            <span className="text-nyx-600 border-nyx-700 rounded border border-dashed px-2 py-1 text-caption italic">
              full row only (TaskRow) / rich card in chat
            </span>
          </Swatch>
          <Swatch label="section">
            <span className="text-nyx-600 border-nyx-700 rounded border border-dashed px-2 py-1 text-caption italic">
              header row only (SectionColumn)
            </span>
          </Swatch>
          <Swatch label="event">
            <span className="text-nyx-600 border-nyx-700 rounded border border-dashed px-2 py-1 text-caption italic">
              rich card in chat only (InlineEventPreview)
            </span>
          </Swatch>
          <Swatch label="task log (time entry)">
            <span className="text-nyx-600 border-nyx-700 rounded border border-dashed px-2 py-1 text-caption italic">
              folded into TaskProgressBar, no own mark
            </span>
          </Swatch>
          <Swatch label="routine">
            <span className="text-nyx-600 border-nyx-700 rounded border border-dashed px-2 py-1 text-caption italic">
              list row only (RoutinesPage)
            </span>
          </Swatch>
          <Swatch label="task item (checklist item)">
            <span className="text-nyx-600 border-nyx-700 rounded border border-dashed px-2 py-1 text-caption italic">
              checkbox + text row only
            </span>
          </Swatch>
        </Section>

        <p className="text-nyx-200 mb-4 mt-2 max-w-prose text-caption font-semibold tracking-wide uppercase">
          What each entity is, and why it looks the way it does
        </p>
        <dl className="max-w-prose space-y-4 text-caption leading-relaxed">
          <div>
            <dt className="text-nyx-200 font-semibold">Project</dt>
            <dd className="text-nyx-400">
              The container tasks belong to — the level users actually
              organize around. <code className="text-eros-400">ProjectChip</code>{' '}
              keeps the project&rsquo;s own name in plain Nyx-grey and lets
              only its <code className="text-eros-400">FieldBadge</code>{' '}
              icon carry color. <em>Question:</em> is that restraint
              deliberate (color belongs to the field, not the project), or
              did the project just never get its own color and this
              reads that way by accident?
            </dd>
          </div>
          <div>
            <dt className="text-nyx-200 font-semibold">Field</dt>
            <dd className="text-nyx-400 mb-3">
              The top-level life-domain a project (and by extension its
              tasks) belongs to — Design, Costura, Programação, etc. It
              carries the strongest, most saturated color signal of any
              entity (all 11, below) because it&rsquo;s the highest
              grouping level in the app; every other color system
              (status, priority) is deliberately more restrained by
              comparison.
            </dd>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {fieldNames.map((name) => (
                <div key={name} className="flex items-center gap-1.5">
                  <FieldBadge fieldName={name} size="xs" />
                  <span className="text-nyx-400 text-label font-light">
                    {name}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-nyx-500 mt-3 text-label leading-relaxed font-light">
              All 11 form one full hue circle, anchored on Staging
              Academy&rsquo;s existing brand blue (fixed, doesn&rsquo;t
              move) with the other 10 spaced evenly around it in this
              order — adjacent fields here are adjacent hues. Saturation
              and lightness held constant except where a hue fell under
              WCAG AA against the background (Som, lightened to clear
              it) — nothing else tuned by eye.{' '}
              <code className="text-eros-400">Textos</code> had no config
              entry at all before this pass: the app has 11 real fields,
              this list only carried 10 of them.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-nyx-600 text-label font-light">
                e.g. a project in Design:
              </span>
              <ProjectChip name="Roadmap Q3" fieldName="Design" />
            </div>

            <p className="text-nyx-200 mb-2 mt-6 text-label font-semibold tracking-wide uppercase">
              Field, everywhere it needs to render
            </p>
            <p className="text-nyx-400 mb-3 text-caption leading-relaxed">
              In chat: the same <code className="text-eros-400">FieldBadge</code>{' '}
              the app already uses — no new component needed, chat already
              renders real React (<code className="text-eros-400">EntityChip</code>{' '}
              does this for task/project/event today). <em>Not yet wired:</em>{' '}
              <code className="text-eros-400">ChatEntityType</code> only
              recognizes <code className="text-eros-400">task</code>/
              <code className="text-eros-400">project</code>/
              <code className="text-eros-400">event</code> tokens — adding{' '}
              <code className="text-eros-400">field</code> is a real follow-up,
              not done here.
            </p>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-nyx-600 text-label font-light">chat:</span>
              <FieldBadge fieldName="Design" size="md" />
            </div>
            <p className="text-nyx-400 mb-3 text-caption leading-relaxed">
              On Telegram, color and icons don&rsquo;t exist — plain text/
              markdown only. Proposal: one emoji per field (reusing the same
              identity, just translated to an emoji instead of a lucide
              icon) plus the name in caps, e.g.{' '}
              <code className="text-eros-400">🎨 DESIGN</code>. All 11:
            </p>
            <p className="text-nyx-400 max-w-prose text-caption leading-relaxed">
              🧑 PESSOAL · 🎓 PESQUISA · 📄 TEXTOS · 🖌️ CALIGRAFIA · ✨ ARTES
              · 📦 DESIGN · ✂️ COSTURA · 🏫 STAGING ACADEMY · 🎧 SOM · 🖼️
              IMAGEM · 💻 PROGRAMAÇÃO
            </p>
            <p className="text-nyx-500 mt-2 text-label leading-relaxed font-light">
              Real small-caps isn&rsquo;t reliable on Telegram (no universal
              unicode small-caps font support), so this uses plain caps
              instead of trying to fake it. Not wired into{' '}
              <code className="text-eros-400">telegram-bot</code>/
              <code className="text-eros-400">telegram-notify</code> yet —
              proposal only.
            </p>
          </div>
          <div>
            <dt className="text-nyx-200 font-semibold">Tag (work_tags)</dt>
            <dd className="text-nyx-400">
              A freeform label a task can carry, many-to-many. Every tag
              renders in the same single Pontus tone regardless of what
              the tag says — text is what differentiates them, not color.
              Reasonable inference: this avoids needing to store or
              assign a color per tag (there could be dozens), unlike
              Field&rsquo;s fixed, small, curated set.
            </dd>
          </div>
          <div>
            <dt className="text-nyx-200 font-semibold">Task</dt>
            <dd className="text-nyx-400">
              The atomic unit of work — the entity everything else in
              this app ultimately organizes around. See &ldquo;Compact vs.
              expanded chips&rdquo; below for why it doesn&rsquo;t have a
              small pill form of its own.
            </dd>
          </div>
          <div>
            <dt className="text-nyx-200 font-semibold">Section</dt>
            <dd className="text-nyx-400">
              A named grouping of tasks inside one project (kanban-column
              shaped). Recently redesigned with collapse/expand and
              up/down reordering. <em>Question:</em> does it need a
              standalone mark outside its own column context, or is it
              only ever meaningful in place?
            </dd>
          </div>
          <div>
            <dt className="text-nyx-200 font-semibold">Event</dt>
            <dd className="text-nyx-400">
              A calendar entry, optionally linked to a task or project.
              The least-marked entity in the app today — no compact chip,
              no expanded row, only a rich card in chat and the full
              modal. <em>Question:</em> is that a real gap, or does an
              event only ever need to be read on the calendar itself?
            </dd>
          </div>
          <div>
            <dt className="text-nyx-200 font-semibold">Task log (time entry)</dt>
            <dd className="text-nyx-400">
              One logged span of time against a task. Never shown
              individually — always folded into{' '}
              <code className="text-eros-400">TaskProgressBar</code>&rsquo;s
              aggregate. Reasonable inference: a single time entry isn&rsquo;t
              a meaningful unit to a user on its own, only the running
              total is.
            </dd>
          </div>
          <div>
            <dt className="text-nyx-200 font-semibold">Routine</dt>
            <dd className="text-nyx-400">
              A recurring task template (frequency + preferred time).
              Shown only as a list row on its own page today.{' '}
              <em>Question:</em> same as Section — worth a standalone
              mark, or always read in its own list?
            </dd>
          </div>
          <div>
            <dt className="text-nyx-200 font-semibold">Task item (checklist item)</dt>
            <dd className="text-nyx-400">
              One row of a task&rsquo;s checklist. Reasonable inference:
              this one almost certainly never needs a mark of its own —
              it&rsquo;s never referenced from outside the task that owns
              it, unlike every other entity here.
            </dd>
          </div>
        </dl>
      </div>

      <div className="border-nyx-700 mb-10 border-t pt-10">
        <h2 className="font-serif text-nyx-100 mb-3 text-2xl">
          Part II — The Dominions
        </h2>
        <p className="text-nyx-400 mb-8 max-w-prose text-caption leading-relaxed">
          Every deity claims dominion over one field&rsquo;s values — Eros
          rules the calls-to-act statuses, Tartarus rules urgency, Gaia
          rules what&rsquo;s finished well. Not things with their own
          identity (that&rsquo;s Part I, above) — just the current value of
          one column, pulled from a fixed vocabulary.
        </p>

        <Section title="Status">
          {STATUSES.map((s) => (
            <Swatch key={s} label={s}>
              <StatusBadge status={s} />
            </Swatch>
          ))}
          <Swatch label="picker">
            <StatusPicker value={status} onChange={setStatus} />
          </Swatch>
        </Section>

        <div className="border-nyx-700 mb-10 max-w-prose border-t pt-6 text-caption leading-relaxed">
          <p className="text-nyx-200 mb-3 font-semibold tracking-wide uppercase">
            How status color reads
          </p>
          <p className="text-nyx-300 mb-3">
            Grouped by what each status asks of <em>you</em>, not by a flat
            per-status color — the dot answers &ldquo;does this need
            me?&rdquo; before the label does.
          </p>
          <p className="text-nyx-400 mb-1.5">
            <span className="text-eros-400 font-semibold">
              Calls you to act
            </span>{' '}
            — planning, todo, in progress share Eros, heat rising with
            proximity (600 → 500 → 400).
          </p>
          <p className="text-nyx-400 mb-1.5">
            <span className="text-pontus-400 font-semibold">
              Waiting, soft
            </span>{' '}
            — in review is Pontus: someone else is still moving.
          </p>
          <p className="text-nyx-400 mb-1.5">
            <span className="text-hypnos-400 font-semibold">
              Waiting, softer
            </span>{' '}
            — waiting-on-previous is Hypnos: asleep until its turn.
          </p>
          <p className="text-nyx-400 mb-1.5">
            <span className="text-nyx-300 font-semibold">Waiting, hard</span>{' '}
            — paused is Nyx 500: a stop you chose, drained of color.
          </p>
          <p className="text-nyx-400">
            <span className="text-gaia-500 font-semibold">Closed, well</span>{' '}
            — done is Gaia.{' '}
            <span className="text-nyx-600 font-semibold">Closed, dead</span>{' '}
            — cancelled is the deepest Nyx, <em>more</em> muted than paused —
            it&rsquo;s not dangerous, it&rsquo;s just gone. Tartarus/danger
            stays reserved for things still actively going wrong.
          </p>
        </div>

        <Section title="Priority">
          {PRIORITIES.map((p) => (
            <Swatch key={p} label={p}>
              <PriorityBadge priority={p} />
            </Swatch>
          ))}
          <Swatch label="picker">
            <PriorityPicker value={priority} onChange={setPriority} />
          </Swatch>
        </Section>

        <Section title="Dates, estimate &amp; progress">
          <Swatch label="due (upcoming)">
            <DueBadge due="2026-08-01" status="todo" />
          </Swatch>
          <Swatch label="due (overdue)">
            <DueBadge due="2026-01-01" status="todo" />
          </Swatch>
          <Swatch label="target range">
            <TargetBadge target='["2026-07-01 00:00:00+00","2026-07-15 00:00:00+00")' />
          </Swatch>
          <Swatch label="scheduled">
            {/* Added to TaskRow in the recent redesign -- a small marker
                for "already has a calendar event", not a full badge. */}
            <ScheduledBadge scheduled />
          </Swatch>
          <Swatch label="progress (compact)">
            <TaskProgressBar
              progress={{ loggedMinutes: 90, estimateMinutes: 120, pct: 75, level: 'ok' }}
            />
          </Swatch>
          <Swatch label="progress (over)">
            <TaskProgressBar
              progress={{ loggedMinutes: 150, estimateMinutes: 120, pct: 125, level: 'over' }}
            />
          </Swatch>
        </Section>

        <Section title="Tags &amp; change badges">
          <Swatch label="tag">
            <Tag onRemove={() => {}}>design</Tag>
          </Swatch>
          {SAMPLE_CHANGES.map((c) => (
            <Swatch key={c.field} label={c.field}>
              <ChangeBadge change={c} />
            </Swatch>
          ))}
        </Section>

        <p className="text-nyx-500 max-w-prose text-caption leading-relaxed">
          <b className="text-nyx-300">Not yet a mark of its own:</b> sequence
          (previous/next task dependency, currently a bespoke{' '}
          <code className="text-eros-400">SequenceChip</code> local to
          TaskDetailModal after the sequencing redesign) and moments/notes
          (an entity list, not a single value — closer to Part I&rsquo;s
          territory than a column badge).
        </p>
      </div>

      <div className="border-nyx-700 border-t pt-10">
        <h2 className="font-serif text-nyx-100 mb-3 text-2xl">
          Compact vs. expanded chips
        </h2>
        <p className="text-nyx-400 mb-3 max-w-prose text-caption leading-relaxed">
          Not every entity&rsquo;s natural mark is a small pill. Some
          already have a denser, multi-field <b>expanded</b> form that
          plays the same role a compact chip would elsewhere — the{' '}
          <b className="text-nyx-200">task row is an expanded task chip</b>:
          no atomic <code className="text-eros-400">TaskChip</code> exists
          or is obviously needed, because a task without its status/
          priority/due showing usually isn&rsquo;t useful at a glance the
          way a bare project name is.
        </p>
        <p className="text-nyx-400 max-w-prose text-caption leading-relaxed">
          Reading the rest of Part I against that lens: Section&rsquo;s
          header row and Routine&rsquo;s list row are arguably their own
          expanded chips too, same reasoning as the task row. Event has
          neither a compact nor an expanded standalone mark yet — only the
          chat preview card and the full modal. <em>Open question:</em>{' '}
          does <code className="text-eros-400">ENT</code> need to design
          new expanded forms, or mainly recognize and consolidate the ones
          that already exist (TaskRow, section header, routine row) onto
          shared building blocks?
        </p>

        <p className="text-nyx-200 mb-3 mt-8 text-caption font-semibold tracking-wide uppercase">
          Proposal: a Project row
        </p>
        <p className="text-nyx-400 mb-6 max-w-prose text-caption leading-relaxed">
          Project has a chip (<code className="text-eros-400">ProjectChip</code>)
          but no expanded form at all — <code className="text-eros-400">
            ProjectCard
          </code>{' '}
          is a grid tile, not a row, and today only shows status/priority/due
          plus a section/task count line; <code className="text-eros-400">
            target
          </code>{' '}
          exists on the real{' '}
          <code className="text-eros-400">projects</code> table but isn&rsquo;t
          shown anywhere yet. A row version, TaskRow-shaped, would carry:
          status, priority, due, target, section count, task count.
        </p>

        <Section title="Option A — one line">
          <Swatch label="everything inline, TaskRow-shaped">
            <div className="border-nyx-700 flex w-[420px] items-center gap-1.5 rounded-md border border-transparent px-2 py-1.5 hover:border-current">
              <StatusBadge status="in_progress" />
              <span className="text-nyx-100 min-w-0 flex-1 truncate text-body">
                Roadmap Q3
              </span>
              <PriorityBadge priority="high" />
              <TargetBadge target='["2026-07-01 00:00:00+00","2026-09-30 00:00:00+00")' />
              <DueBadge due="2026-09-30" status="in_progress" />
              <span className="text-nyx-600 shrink-0 text-caption">
                3 sections · 12 tasks
              </span>
            </div>
          </Swatch>
        </Section>

        <Section title="Option B — two lines">
          <Swatch label="identity on top, badges below">
            <div className="border-nyx-700 flex w-[420px] flex-col gap-0.5 rounded-md border border-transparent px-2 py-1.5 hover:border-current">
              <div className="flex items-center gap-1.5">
                <StatusBadge status="in_progress" />
                <span className="text-nyx-100 min-w-0 flex-1 truncate text-body">
                  Roadmap Q3
                </span>
              </div>
              <div className="flex items-center gap-1.5 pl-0.5">
                <PriorityBadge priority="high" />
                <TargetBadge target='["2026-07-01 00:00:00+00","2026-09-30 00:00:00+00")' />
                <DueBadge due="2026-09-30" status="in_progress" />
                <span className="text-nyx-600 text-caption">
                  3 sections · 12 tasks
                </span>
              </div>
            </div>
          </Swatch>
        </Section>

        <p className="text-nyx-400 max-w-prose text-caption leading-relaxed">
          <b className="text-nyx-200">My take:</b> Option A. TaskRow already
          established the one-line pattern (status + name + badges, wrapping
          to two lines only on narrow viewports via its own responsive
          classes) — a Project row splitting into two lines <em>by
          default</em> would read as a different, heavier kind of row next
          to task rows in the same list context (e.g. a combined
          projects-and-tasks view), when a project row realistically has
          the same or less information density than a task row does. Two
          lines only makes sense if projects end up needing more fields
          than tasks show, which target/section-count/task-count don&rsquo;t
          push past.
        </p>
      </div>
    </Chamber>
  );
}
