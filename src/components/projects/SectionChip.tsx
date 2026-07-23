import { Rows3, ChevronRight } from 'lucide-react';
import { ProjectChip } from '../common/ui';

interface SectionChipProps {
  name: string;
  projectName?: string | null;
  projectField?: string | null;
}

// A section is never read on its own -- it's always shown with the project
// it belongs to, so this isn't a chip/row pair like Project has. One
// breadcrumb-shaped mark covers both compact and list contexts: the
// section's own icon + name, then its parent project (already-established
// ProjectChip, icon-on-left). No color of its own -- Rows3 is a plain
// Nyx glyph, since sections don't carry field/status identity the way
// projects and tasks do; the color only shows up via the project half.
export default function SectionChip({
  name,
  projectName,
  projectField,
}: SectionChipProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-caption">
      <Rows3 size={12} className="text-nyx-500 shrink-0" />
      <span className="text-nyx-200 truncate">{name}</span>
      <ChevronRight size={12} className="text-nyx-700 shrink-0" />
      <ProjectChip name={projectName} fieldName={projectField} />
    </span>
  );
}
