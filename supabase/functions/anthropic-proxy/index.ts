// Reverse-proxies the extension's Claude API calls to Anthropic, injecting
// the real API key server-side. The extension never sees
// ANTHROPIC_API_KEY — src/lib/chat/client.ts points the Anthropic SDK's
// baseURL at this function instead of api.anthropic.com, so every
// `client.messages.create(...)` call in the app is routed through here
// without the call sites knowing the difference.
//
// Deploy:            supabase functions deploy anthropic-proxy
// Configure the key:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Auth: deployed with JWT verification on (the Supabase CLI default) —
// callers must send `Authorization: Bearer <supabase anon or user key>`,
// the same key the extension already uses to talk to Supabase directly.
// This isn't a new trust boundary, it's the existing one extended to cover
// this call too.

const ANTHROPIC_API_BASE = 'https://api.anthropic.com';
const FUNCTION_PATH_PREFIX = '/anthropic-proxy';
const DEFAULT_ANTHROPIC_VERSION = '2023-06-01';

// Wildcard origin is deliberate: a Chrome extension's origin
// (chrome-extension://<id>) isn't something a whitelist buys much against,
// and every request still has to carry the Supabase anon/user key to get
// past JWT verification before this code even runs.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, anthropic-version, anthropic-beta',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: {
          type: 'configuration_error',
          message: 'ANTHROPIC_API_KEY is not configured on the server.',
        },
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }

  const incomingUrl = new URL(req.url);
  const anthropicPath = incomingUrl.pathname.startsWith(FUNCTION_PATH_PREFIX)
    ? incomingUrl.pathname.slice(FUNCTION_PATH_PREFIX.length)
    : incomingUrl.pathname;
  const targetUrl = `${ANTHROPIC_API_BASE}${anthropicPath}${incomingUrl.search}`;

  // Rebuilt from scratch rather than forwarded — the incoming request also
  // carries Supabase's own `apikey`/`Authorization` headers, which must
  // never reach Anthropic.
  const forwardHeaders = new Headers({
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version':
      req.headers.get('anthropic-version') || DEFAULT_ANTHROPIC_VERSION,
  });
  const anthropicBeta = req.headers.get('anthropic-beta');
  if (anthropicBeta) forwardHeaders.set('anthropic-beta', anthropicBeta);

  const anthropicResponse = await fetch(targetUrl, {
    method: req.method,
    headers: forwardHeaders,
    body:
      req.method === 'GET' || req.method === 'HEAD'
        ? undefined
        : await req.text(),
  });

  const responseHeaders = new Headers(anthropicResponse.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    responseHeaders.set(key, value);
  }

  // Pass the body through as a stream rather than buffering it — this is
  // what lets streaming requests (stream: true) work later with zero
  // changes here.
  return new Response(anthropicResponse.body, {
    status: anthropicResponse.status,
    headers: responseHeaders,
  });
});
