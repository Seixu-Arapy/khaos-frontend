import { Chamber } from './vaultUI';
import FoundationsSection from './FoundationsSection';

export default function WellspringPage() {
  return (
    <Chamber
      index="III"
      name="The Wellspring"
      tagline="Radii and shadows — everything else is born from these"
    >
      <FoundationsSection />
    </Chamber>
  );
}
