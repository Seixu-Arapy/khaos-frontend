import { useState } from 'react';
import { DoorOpen, Bug } from 'lucide-react';
import { Chamber, Section, Swatch } from './vaultUI';
import { Button, Modal, EmptyState } from '../../components/common/ui';

export default function ThresholdPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Chamber
      glyph={<DoorOpen size={22} />}
      name="The Threshold"
      tagline="Modals, empty states — where the app pauses to ask"
    >
      <Section title="Overlays &amp; states">
        <Swatch label="modal">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Example modal"
            footer={<Button onClick={() => setModalOpen(false)}>Done</Button>}
          >
            Real Modal component, rendered with real props.
          </Modal>
        </Swatch>
        <Swatch label="empty state">
          <EmptyState
            icon={Bug}
            title="Nothing here yet"
            hint="This is the shared EmptyState component."
          />
        </Swatch>
      </Section>
    </Chamber>
  );
}
