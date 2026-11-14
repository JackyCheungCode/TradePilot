# TradePilot Agent Center

## Navigation and product scope
The first-level entry **TradePilot Agent 智能体** precedes 潜客发现. Seven sections: Agent 工作台、Agent 市场、Agent 编排、外部 Agent 接入、执行记录、审批中心、Agent 设置. The sidebar mark is a custom animated AI orb.

## External integrations
Open ecosystem: REST API, MCP and Webhook. A connection is registered with protocol, public HTTPS endpoint, auth mode and capabilities. Credentials are encrypted using AES-256-GCM with a Worker-only `AGENT_ENCRYPTION_KEY` (configured as a Cloudflare Worker secret); plaintext credentials are never returned to clients. Private/local endpoints are rejected to reduce SSRF exposure. Connections remain pending until protocol-specific verification is implemented.

## Data model
- `agent_connections`: external endpoint metadata and encrypted credentials.
- `agent_runs`: user-owned parent/child execution records, plan, status, result and cost.
- `agent_run_events`: append-only run timeline.
- `agent_approvals`: immutable operation snapshot, SHA-256 digest, decision and expiry.
All tables have RLS enabled. Direct anon/authenticated table grants are revoked; Worker service role accesses data after verifying the user's Supabase JWT and filtering by owner_id.

## Permission policy
Search/discovery/enrichment/research/scoring/analysis are intended for automatic execution within budget limits. Sending email, bulk CRM imports, bulk changes, deletion and merges require explicit approval. Approval must bind to the exact operation snapshot and expire; changed parameters require a new approval.

## Delivery boundary
Current backend supports secure connection registration/list/delete and persistence of Agent task drafts plus run and approval list APIs. It does not yet execute third-party agents, send email, import CRM records, or mark a connection active. REST/MCP/Webhook invocation adapters, callback signature validation, execution orchestration and approval-gated side-effect handlers remain subsequent milestones.
