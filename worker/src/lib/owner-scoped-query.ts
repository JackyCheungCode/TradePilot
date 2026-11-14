/**
 * Build an owner-scoped PostgREST filter for discovery task updates.
 * Workflow payloads carry both identifiers; always constrain both when using
 * the service-role client, which bypasses RLS.
 */
export function discoveryRunQuery(runId: string, ownerId: string): string {
  const params = new URLSearchParams({
    id: "eq." + runId,
    owner_id: "eq." + ownerId,
  });
  return "discovery_runs?" + params.toString();
}
