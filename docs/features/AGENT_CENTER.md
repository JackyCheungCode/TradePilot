# TradePilot Agent Center

## Navigation and product scope
The first-level entry **TradePilot Agent 智能体** precedes 潜客发现. Seven sections: Agent 工作台、Agent 市场、Agent 编排、外部 Agent 接入、执行记录、审批中心、Agent 设置. The sidebar mark is a custom animated AI orb.

## External integrations
Open ecosystem: REST API, MCP and Webhook. REST connections use an OpenAPI 3.x JSON document URL for operation discovery; MCP uses initialize/tools/list; webhook registrations expose a controlled trigger capability. Credentials are encrypted using AES-256-GCM with a Worker-only `AGENT_ENCRYPTION_KEY` (configured as a Cloudflare Worker secret); plaintext credentials are never returned to clients. Private/local endpoints are rejected to reduce SSRF exposure. Connections remain pending until protocol-specific verification succeeds. Discovered MCP tools and OpenAPI operations are stored as protocol tool metadata; read-only GET operations can be marked for automatic execution, while non-GET operations and non-read-only MCP tools require approval by default.

## Xiaoya chat
- `/api/v1/agent/chat` provides model-backed multi-turn conversation using the configured `agent_chat` task model (falls back to `agent_planning`, then the system default).
- Conversations and message history are persisted in `agent_conversations` and `agent_chat_messages`; the Worker authenticates the Supabase user and scopes every query by `owner_id`.
- Xiaoya returns a task suggestion only when it has enough information. The user must confirm the generated task card before any search or external tool starts. Chat history is currently persisted server-side; conversation list/resume UI is a follow-up.

## Data model
- `agent_connections`: external endpoint metadata and encrypted credentials.
- `agent_runs`: user-owned parent/child execution records, plan, status, result and cost.
- `agent_run_events`: append-only run timeline.
- `agent_approvals`: immutable operation snapshot, SHA-256 digest, decision and expiry.
All tables have RLS enabled. Direct anon/authenticated table grants are revoked; Worker service role accesses data after verifying the user's Supabase JWT and filtering by owner_id.

## Permission policy
Search/discovery/enrichment/research/scoring/analysis are intended for automatic execution within budget limits. Sending email, bulk CRM imports, bulk changes, deletion and merges require explicit approval. Approval must bind to the exact operation snapshot and expire; changed parameters require a new approval.

## Delivery boundary
The Agent center now supports model-backed multi-turn Xiaoya chat, persistent conversation messages, task clarification and task-card suggestions; user confirmation is required before execution. The task planner can select one internal discovery workflow or one discovered external REST/MCP tool per run. External write operations remain approval-gated. Full multi-agent sequential orchestration, automatic continuation between specialist agents, webhook callback verification, durable resume after approval, and conversation list/resume UI remain subsequent milestones. Email sending and CRM import are not represented as automatically executable capabilities.
