// Browser entry point for the chat agent's `search_schema` tool.
//
// The parsing logic lives in schemaSearchCore.ts (dependency-free, so the
// Telegram bot Edge Function can reuse it too). This file only supplies the
// schema text: the repo's own `schema.sql` dump, imported by Vite as a raw
// string. It's committed alongside every migration, so it's never more stale
// than the code, and it already carries richer column/enum descriptions than
// PostgREST's OpenAPI spec ever did.
import schemaSql from '../../../schema.sql?raw';
import { searchSchema as searchSchemaCore } from './schemaSearchCore';

export function searchSchema(query: string) {
  return searchSchemaCore(schemaSql, query);
}
