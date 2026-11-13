import { successResponse } from "../lib/http";

export function handleHealth(request: Request): Response {
  return successResponse(request, {
    status: "ok",
    service: "tradepilot-api",
    timestamp: new Date().toISOString(),
  });
}
