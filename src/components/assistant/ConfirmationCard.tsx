import { ShieldAlert, Trash2, Plus } from 'lucide-react';
import { Button } from '../common/ui';
import { InlineEntityPreview } from './InlineEntityPreview';
import { ChangeBadge } from './ChangeBadge';
import type { ConfirmationPreview } from '../../lib/chat/confirmationPreview';

interface ConfirmationCardProps {
  preview: ConfirmationPreview;
  actionName: string;
  onResolve: (approved: boolean) => void;
}

export default function ConfirmationCard({
  preview,
  actionName,
  onResolve,
}: ConfirmationCardProps) {
  const isDelete = preview.kind === 'delete';
  const isInsert = preview.kind === 'insert';
  const hasFormattedEntities =
    Boolean(preview.entityType) && preview.entities.length > 0;

  return (
    <div className="border-eros-500/40 bg-nyx-800 ml-9 max-w-[85%] rounded-lg border p-3.5">
      <div className="text-eros-400 mb-2.5 flex items-center gap-1.5 text-caption font-semibold tracking-wide uppercase">
        <ShieldAlert size={13} />
        Confirm before running
      </div>

      {preview.kind === 'generic' && (
        <p className="text-nyx-300 mb-3 font-mono text-caption leading-relaxed">
          {preview.summaryText}
        </p>
      )}

      {hasFormattedEntities && (
        <div className="mb-3 space-y-1.5">
          {preview.entities.map((entity, i) => (
            <div key={i} className="flex items-center gap-2">
              {isDelete && (
                <Trash2 size={12} className="text-tartarus-500 shrink-0" />
              )}
              {isInsert && (
                <Plus size={12} className="text-gaia-500 shrink-0" />
              )}
              <InlineEntityPreview
                entityType={preview.entityType!}
                data={entity}
              />
            </div>
          ))}
        </div>
      )}

      {preview.kind === 'update' && Boolean(preview.changes?.length) && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {preview.changes!.map((change) => (
            <ChangeBadge key={change.field} change={change} />
          ))}
        </div>
      )}

      {!preview.entityType && preview.kind !== 'generic' && (
        <p className="text-nyx-500 mb-3 text-caption">
          {actionName.replace(/_/g, ' ')} on an entity outside tasks/projects.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => onResolve(false)}>
          Cancel
        </Button>
        <Button
          variant={isDelete ? 'danger' : 'default'}
          size="sm"
          onClick={() => onResolve(true)}
        >
          {isDelete ? 'Delete' : 'Confirm'}
        </Button>
      </div>
    </div>
  );
}
