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
// Auth: verify_jwt is OFF for this function (see supabase/config.toml) —
// the platform-level JWT gate also blocks the browser's CORS preflight
// (OPTIONS carries no Authorization header, so the gateway would 401 it
// before this code's own CORS headers ever get attached, which the browser
// reports as a CORS failure rather than a clean 401). The same check is
// done here instead: callers must send `Authorization: Bearer <supabase
// anon key>`, matching it against the project's own anon key (auto-injected
// as SUPABASE_ANON_KEY). This isn't a new trust boundary, it's the existing
// one — just enforced in code instead of the gateway.
//
// Gotcha: SUPABASE_ANON_KEY here always reflects the project's *default*
// publishable key. If VITE_SUPABASE_ANON_KEY (client-side) is ever set to a
// different, secondary publishable key — Supabase's newer key system
// allows more than one active key per project — this check fails even
// though the client's key is otherwise perfectly valid. Keep them the same
// key if this ever starts 401ing again for no obvious reason. (This is also
// why simply renaming things to match Supabase's newer "publishable key"
// terminology isn't safe on its own — the auto-injected variable Edge
// Functions actually receive is still named SUPABASE_ANON_KEY regardless of
// the key's own format.)

const ANTHROPIC_API_BASE = 'https://api.anthropic.com';
const FUNCTION_PATH_PREFIX = '/anthropic-proxy';
const DEFAULT_ANTHROPIC_VERSION = '2023-06-01';

// Wildcard origin is deliberate: a Chrome extension's origin
// (chrome-extension://<id>) isn't something a whitelist buys much against,
// and every non-OPTIONS request still has to carry the Supabase anon/user
// key to pass the check below.
//
// Allow-Headers echoes back whatever the browser's preflight says the real
// request will send (Access-Control-Request-Headers), rather than a fixed
// list — the Anthropic SDK attaches its own diagnostic headers
// (x-stainless-os, x-stainless-lang, etc.) that vary by SDK version and
// runtime, so hardcoding today's set just breaks again on the next update.
function corsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      req.headers.get('access-control-request-headers') ||
      'authorization, content-type, anthropic-version, anthropic-beta',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

Deno.serve(async (req: Request) => {
  const CORS_HEADERS = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // verify_jwt is off for this function (see supabase/config.toml) so the
  // CORS preflight above isn't blocked by the platform gateway — this is
  // that same gate, done here instead. See the file header for the
  // default-vs-secondary-key gotcha if this ever 401s unexpectedly.
  const expectedAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const presentedToken = (req.headers.get('authorization') || '').replace(
    /^Bearer\s+/i,
    ''
  );
  if (!expectedAnonKey || presentedToken !== expectedAnonKey) {
    return new Response(
      JSON.stringify({
        error: {
          type: 'authentication_error',
          message: 'Missing or invalid authorization.',
        },
      }),
      {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
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
