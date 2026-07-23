// Static per-field visual identity (icon + color), keyed by the field's
// `name` exactly as stored in the `fields` table. This mirrors a previous
// frontend's FIELDS_CONFIG, ported from Heroicons to lucide-react.
//
// Fields are user-managed rows in the DB (see ProjectsPage "New field"),
// so a field created outside this list — or renamed — falls back to
// DEFAULT_FIELD_META below rather than breaking the badge.
//
// Color model (ENT, Round 2): the 11 real fields form one full hue
// circle, anchored on Staging Academy's existing brand blue (#3772ff,
// hue ~222°) rather than an arbitrary starting point. The other 10 are
// spaced evenly around it (360°/11 ≈ 32.7° apart) in the order below,
// so adjacent fields in that list are adjacent in hue too. Saturation
// stays pinned at 100% and lightness at Staging Academy's own ~61% for
// every field except where that failed WCAG AA against nyx-900 (Som,
// landing in the blue-violet range where the same lightness reads
// darker to the eye) -- lightened just enough there to clear 4.5:1,
// nowhere else. Staging Academy itself sits at 4.13:1, under AA, but
// it's the fixed anchor (an existing brand color, not open to change
// here) rather than a new value to tune.
import {
  Sparkles,
  Box,
  Scissors,
  User,
  GraduationCap,
  Layers,
  Radio,
  Code2,
  Folder,
  FileText,
  type LucideIcon,
  Brush,
} from 'lucide-react';
import StagingAcademyIcon from '../components/icons/StagingAcademyIcon';

export interface FieldMeta {
  icon: LucideIcon;
  color: string; // hex, kept for reference/debugging
  classes: {
    border: string;
    bg: string;
    text: string;
    muted: string;
  };
}

// Classes are written out as full literal strings, not built from a
// helper -- Tailwind's scanner needs the exact `border-[#hex]/20` text
// present in source to generate it; a template-built class name is
// invisible to it and silently produces no CSS.
export const FIELDS_CONFIG: Record<string, FieldMeta> = {
  Pessoal: {
    icon: User,
    color: '#ff374e',
    classes: {
      border: 'border-[#ff374e]/20',
      bg: 'bg-[#ff374e]/10',
      text: 'text-[#ff374e]',
      muted: 'text-[#ff374e]/60',
    },
  },
  Pesquisa: {
    icon: GraduationCap,
    color: '#ff8d37',
    classes: {
      border: 'border-[#ff8d37]/20',
      bg: 'bg-[#ff8d37]/10',
      text: 'text-[#ff8d37]',
      muted: 'text-[#ff8d37]/60',
    },
  },
  // Was missing from the old 10-field list entirely -- the app has 11
  // real fields, this one just never got an entry.
  Textos: {
    icon: FileText,
    color: '#fffb37',
    classes: {
      border: 'border-[#fffb37]/20',
      bg: 'bg-[#fffb37]/10',
      text: 'text-[#fffb37]',
      muted: 'text-[#fffb37]/60',
    },
  },
  Caligrafia: {
    icon: Brush,
    color: '#96ff37',
    classes: {
      border: 'border-[#96ff37]/20',
      bg: 'bg-[#96ff37]/10',
      text: 'text-[#96ff37]',
      muted: 'text-[#96ff37]/60',
    },
  },
  Artes: {
    icon: Sparkles,
    color: '#37ff45',
    classes: {
      border: 'border-[#37ff45]/20',
      bg: 'bg-[#37ff45]/10',
      text: 'text-[#37ff45]',
      muted: 'text-[#37ff45]/60',
    },
  },
  Design: {
    icon: Box,
    color: '#37ffb2',
    classes: {
      border: 'border-[#37ffb2]/20',
      bg: 'bg-[#37ffb2]/10',
      text: 'text-[#37ffb2]',
      muted: 'text-[#37ffb2]/60',
    },
  },
  Costura: {
    icon: Scissors,
    color: '#37dfff',
    classes: {
      border: 'border-[#37dfff]/20',
      bg: 'bg-[#37dfff]/10',
      text: 'text-[#37dfff]',
      muted: 'text-[#37dfff]/60',
    },
  },
  'Staging Academy': {
    icon: StagingAcademyIcon,
    color: '#3772ff',
    classes: {
      border: 'border-[#3772ff]/20',
      bg: 'bg-[#3772ff]/10',
      text: 'text-[#3772ff]',
      muted: 'text-[#3772ff]/60',
    },
  },
  Som: {
    icon: Radio,
    color: '#8c66ff',
    classes: {
      border: 'border-[#8c66ff]/20',
      bg: 'bg-[#8c66ff]/10',
      text: 'text-[#8c66ff]',
      muted: 'text-[#8c66ff]/60',
    },
  },
  Imagem: {
    icon: Layers,
    color: '#d637ff',
    classes: {
      border: 'border-[#d637ff]/20',
      bg: 'bg-[#d637ff]/10',
      text: 'text-[#d637ff]',
      muted: 'text-[#d637ff]/60',
    },
  },
  Programação: {
    icon: Code2,
    color: '#ff37bb',
    classes: {
      border: 'border-[#ff37bb]/20',
      bg: 'bg-[#ff37bb]/10',
      text: 'text-[#ff37bb]',
      muted: 'text-[#ff37bb]/60',
    },
  },
};

// Used for any field name not present in FIELDS_CONFIG above (new fields
// created via the "New field" button aren't guaranteed to match this list).
export const DEFAULT_FIELD_META: FieldMeta = {
  icon: Folder,
  color: 'ink',
  classes: {
    border: 'border-nyx-600/40',
    bg: 'bg-nyx-700/40',
    text: 'text-nyx-300',
    muted: 'text-nyx-400/60',
  },
};

export function getFieldMeta(fieldName?: string | null): FieldMeta {
  if (!fieldName) return DEFAULT_FIELD_META;
  return FIELDS_CONFIG[fieldName] ?? DEFAULT_FIELD_META;
}
