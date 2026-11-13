import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { markRunFailed, processRun, type DiscoveryEnv, type DiscoveryRunInput } from "../routes/discovery";

interface Params { runId: string; ownerId: string; input: DiscoveryRunInput; }

export class LeadDiscoveryWorkflow extends WorkflowEntrypoint<DiscoveryEnv, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    try {
      return await step.do(
        "execute-parallel-provider-discovery",
        {
          retries: { limit: 2, delay: "10 seconds", backoff: "exponential" },
          timeout: "30 minutes",
        },
        async () => processRun(this.env, event.payload.runId, event.payload.ownerId, event.payload.input),
      );
    } catch (error) {
      await step.do("persist-discovery-failure", async () => {
        await markRunFailed(this.env, event.payload.runId, event.payload.ownerId, error);
        return { failed: true };
      });
      throw error;
    }
  }
}
