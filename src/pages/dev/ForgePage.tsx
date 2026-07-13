import { useState } from 'react';
import { Bug } from 'lucide-react';
import { Chamber, Section, Swatch } from './vaultUI';
import { Button, IconButton, Select, TextInput } from '../../components/common/ui';

export default function ForgePage() {
  const [text, setText] = useState('');

  return (
    <Chamber
      index="V"
      name="The Forge"
      tagline="Buttons, inputs, selects — tools built for the hand"
    >
      <Section title="Buttons">
        <Swatch label="default">
          <Button>Save</Button>
        </Swatch>
        <Swatch label="secondary">
          <Button variant="secondary">Cancel</Button>
        </Swatch>
        <Swatch label="ghost">
          <Button variant="ghost">Dismiss</Button>
        </Swatch>
        <Swatch label="danger">
          <Button variant="danger">Delete</Button>
        </Swatch>
        <Swatch label="sm">
          <Button size="sm">Small</Button>
        </Swatch>
        <Swatch label="icon button">
          <IconButton label="Close">
            <Bug size={16} />
          </IconButton>
        </Swatch>
      </Section>

      <Section title="Inputs">
        <Swatch label="text input">
          <TextInput
            placeholder="Type something…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Swatch>
        <Swatch label="select">
          <Select defaultValue="b">
            <option value="a">Option A</option>
            <option value="b">Option B</option>
          </Select>
        </Swatch>
      </Section>
    </Chamber>
  );
}
