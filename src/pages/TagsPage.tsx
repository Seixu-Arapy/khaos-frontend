import { useState } from 'react';
import { Plus, Trash2, Tags as TagsIcon } from 'lucide-react';
import { useTags, useTagLinks, useTagMutations } from '../hooks/useTags';
import { TextInput, Button, EmptyState } from '../components/common/ui';

export default function TagsPage() {
  const { data: tags = [] } = useTags();
  const { data: links = [] } = useTagLinks();
  const { create, remove } = useTagMutations();
  const [name, setName] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(name.trim());
    setName('');
  }

  return (
    <div className="px-6 py-5">
      <h1 className="font-display text-ink-100 mb-1 text-display-lg">Tags</h1>
      <p className="text-ink-500 mb-5 text-body">
        Tags can be attached to any project, section, or task — use them to
        filter across project boundaries.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mb-5 flex max-w-sm items-center gap-2"
      >
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New tag name…"
        />
        <Button type="submit">
          <Plus size={14} /> Add
        </Button>
      </form>

      {!tags.length && (
        <EmptyState
          icon={TagsIcon}
          title="No tags yet"
          hint="Create one above to start tagging things."
        />
      )}

      <div className="divide-ink-700 border-ink-700 max-w-md divide-y rounded-lg border">
        {tags.map((tag) => {
          const count = links.filter((l) => l.work_tag_id === tag.id).length;
          return (
            <div
              key={tag.id}
              className="flex items-center justify-between px-3.5 py-2.5"
            >
              <span className="text-ink-100 text-body">{tag.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-ink-500 text-caption">{count} linked</span>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete tag "${tag.name}"?`))
                      remove.mutate(tag.id);
                  }}
                  className="text-ink-500 hover:text-rust-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
