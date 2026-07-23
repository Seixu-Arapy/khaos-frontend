/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_LLM_MODEL?: string;
  readonly VITE_APP_PASSWORD_HASH?: string;
  readonly VITE_KHAOS_FRONTEND_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
