import { ChevronRight } from 'lucide-react';
import { StatusBadge, PriorityBadge, DueBadge, TargetBadge, FieldBadge } from '../common/ui';
import { getFieldMeta } from '../../lib/fieldsConfig';
import type { Section } from '../../lib/types';

interface SectionRowProps {
  section: Section;
  projectName?: string | null;
  fieldName?: string | null;
  onClick?: () => void;
}

// The row-form sibling to SectionChip's breadcrumb, same shape as
// ProjectRow (status + name + priority/target/due) since a section is
// really a project-shaped container one level down -- no section/task
// count, though, since a section has nothing of its own to count.
export default function SectionRow({
  section,
  projectName,
  fieldName,
  onClick,
}: SectionRowProps) {
  const fieldColor = getFieldMeta(fieldName).color;

  return (
    <button
      onClick={onClick}
      style={{ borderLeftColor: fieldColor }}
      className="group hover:bg-nyx-900 flex w-full items-center gap-1.5 rounded-md border-l-2 py-1.5 pr-2 pl-2.5 text-left"
    >
      <FieldBadge fieldName={fieldName} size="xs" />
      <StatusBadge status={section.status} />
      <span className="text-nyx-500 shrink-0 truncate text-body">
        {projectName}
      </span>
      <ChevronRight size={12} className="text-nyx-700 shrink-0" />
      <span className="text-nyx-100 min-w-0 flex-1 truncate text-body">
        {section.name}
      </span>
      <PriorityBadge priority={section.priority} />
      <TargetBadge target={section.target as string | null} />
      <DueBadge due={section.due} status={section.status} />
    </button>
  );
}
