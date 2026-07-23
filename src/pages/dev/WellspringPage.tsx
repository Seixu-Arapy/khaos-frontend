import { Chamber } from './vaultUI';
import FoundationsSection from './FoundationsSection';
import SpacingSection from './SpacingSection';

export default function WellspringPage() {
  return (
    <Chamber
      index="III"
      name="The Wellspring"
      tagline="Radii, shadows, spacing — everything else is born from these"
    >
      <FoundationsSection />
      <SpacingSection />
    </Chamber>
  );
}
