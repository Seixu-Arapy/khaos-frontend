import { useState } from 'react';
import type { ReactNode } from 'react';
import { KhaosTitle } from '../common/KhaosLogo';

const HASH = import.meta.env.VITE_APP_PASSWORD_HASH;
const SESSION_KEY = 'khaos.auth.v1';

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function isAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === HASH;
  } catch {
    return false;
  }
}

interface PasswordGateProps {
  children: ReactNode;
}

// If no password hash is configured (dev mode), skip the gate entirely.
export function PasswordGate({ children }: PasswordGateProps) {
  const [authed, setAuthed] = useState(() => !HASH || isAuthenticated());
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  if (authed) return children;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setChecking(true);
    setError(false);
    const hash = await sha256(value);
    if (hash === HASH) {
      try {
        sessionStorage.setItem(SESSION_KEY, HASH);
      } catch {
        // storage unavailable
      }
      setAuthed(true);
    } else {
      setError(true);
      setValue('');
    }
    setChecking(false);
  }

  return (
    <div className="bg-nyx-900 flex h-dvh flex-col items-center justify-center px-4">
      <div className="mb-8 flex flex-col items-center gap-2 select-none">
        <span className="animate-spin-slow text-eros-400 text-5xl">✷</span>
        <KhaosTitle className="text-2xl" />
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          placeholder="Password"
          className={`bg-nyx-800 text-nyx-100 placeholder:text-nyx-500 w-full rounded-lg border px-4 py-3 text-center text-sm transition-colors focus:outline-hidden ${
            error
              ? 'border-tartarus-500 focus:border-tartarus-500'
              : 'border-nyx-600 focus:border-eros-400'
          }`}
        />
        {error && (
          <p className="text-tartarus-500 text-center text-xs">
            Incorrect password
          </p>
        )}
        <button
          type="submit"
          disabled={checking || !value.trim()}
          className="bg-eros-500 text-nyx-900 hover:bg-eros-400 w-full rounded-lg py-3 text-sm font-medium transition-colors disabled:opacity-40"
        >
          {checking ? 'Checking…' : 'Enter'}
        </button>
      </form>

      <p className="text-nyx-600 mt-8 text-xs">Ordo ab chao</p>
    </div>
  );
}
