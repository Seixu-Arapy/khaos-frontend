// Static per-field visual identity (icon + color), keyed by the field's
// `name` exactly as stored in the `fields` table. This mirrors a previous
// frontend's FIELDS_CONFIG, ported from Heroicons to lucide-react.
//
// Fields are user-managed rows in the DB (see ProjectsPage "New field"),
// so a field created outside this list — or renamed — falls back to
// DEFAULT_FIELD_META below rather than breaking the badge.

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
  type LucideIcon,
  Brush,
} from 'lucide-react';
import StagingAcademyIcon from '../components/icons/StagingAcademyIcon';

export interface FieldMeta {
  icon: LucideIcon;
  color: string; // Tailwind color token, e.g. "red", "teal" — kept for reference/debugging
  classes: {
    border: string;
    bg: string;
    text: string;
    muted: string;
  };
}

export const FIELDS_CONFIG: Record<string, FieldMeta> = {
  Artes: {
    icon: Sparkles,
    color: 'red',
    classes: {
      border: 'border-red-500/20',
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      muted: 'text-red-400/60',
    },
  },
  Design: {
    icon: Box,
    color: 'orange',
    classes: {
      border: 'border-orange-500/20',
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      muted: 'text-orange-400/60',
    },
  },
  Caligrafia: {
    icon: Brush,
    color: 'amber',
    classes: {
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      muted: 'text-amber-400/60',
    },
  },
  Costura: {
    icon: Scissors,
    color: 'lime',
    classes: {
      border: 'border-lime-500/20',
      bg: 'bg-lime-500/10',
      text: 'text-lime-400',
      muted: 'text-lime-400/60',
    },
  },
  Pessoal: {
    icon: User,
    color: 'emerald',
    classes: {
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      muted: 'text-emerald-400/60',
    },
  },
  Pesquisa: {
    icon: GraduationCap,
    color: 'teal',
    classes: {
      border: 'border-teal-500/20',
      bg: 'bg-teal-500/10',
      text: 'text-teal-400',
      muted: 'text-teal-400/60',
    },
  },
  Imagem: {
    icon: Layers,
    color: 'sky',
    classes: {
      border: 'border-sky-500/20',
      bg: 'bg-sky-500/10',
      text: 'text-sky-400',
      muted: 'text-sky-400/60',
    },
  },
  Som: {
    icon: Radio,
    color: 'blue',
    classes: {
      border: 'border-blue-500/20',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      muted: 'text-blue-400/60',
    },
  },
  Programação: {
    icon: Code2,
    color: 'indigo',
    classes: {
      border: 'border-indigo-500/20',
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
      muted: 'text-indigo-400/60',
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
};

// Used for any field name not present in FIELDS_CONFIG above (new fields
// created via the "New field" button aren't guaranteed to match this list).
export const DEFAULT_FIELD_META: FieldMeta = {
  icon: Folder,
  color: 'ink',
  classes: {
    border: 'border-ink-600/40',
    bg: 'bg-ink-700/40',
    text: 'text-ink-300',
    muted: 'text-ink-400/60',
  },
};

export function getFieldMeta(fieldName?: string | null): FieldMeta {
  if (!fieldName) return DEFAULT_FIELD_META;
  return FIELDS_CONFIG[fieldName] ?? DEFAULT_FIELD_META;
}
