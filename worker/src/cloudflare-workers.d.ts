declare module "cloudflare:workers" {
  export interface WorkflowEvent<Params> { payload: Params; instanceId: string; }
  export interface WorkflowStep {
    do<T>(name: string, callback: () => Promise<T>): Promise<T>;
    do<T>(name: string, config: { retries?: { limit?: number; delay?: string | number; backoff?: "constant" | "linear" | "exponential" }; timeout?: string }, callback: () => Promise<T>): Promise<T>;
  }
  export abstract class WorkflowEntrypoint<Env = unknown, Params = unknown> {
    protected env: Env;
    constructor(ctx: unknown, env: Env);
    abstract run(event: WorkflowEvent<Params>, step: WorkflowStep): Promise<unknown>;
  }
}
