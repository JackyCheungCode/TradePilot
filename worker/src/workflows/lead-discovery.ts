import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { markRunFailed, processRun, type DiscoveryEnv, type DiscoveryRunInput } from "../routes/discovery";

interface Params { runId: string; ownerId: string; input: DiscoveryRunInput; }

async function syncAgentRun(env:DiscoveryEnv,runId:string,ownerId:string,patch:Record<string,unknown>):Promise<void>{
  try{
    const response=await fetch(env.SUPABASE_URL+"/rest/v1/agent_runs?id=eq."+runId+"&owner_id=eq."+ownerId,{
      method:"PATCH",
      headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY,"Content-Type":"application/json",Prefer:"return=minimal"},
      body:JSON.stringify({...patch,updated_at:new Date().toISOString()}),
    });
    if(!response.ok)console.error("AGENT_RUN_SYNC_FAILED",response.status,(await response.text()).slice(0,200));
  }catch(error){console.error("AGENT_RUN_SYNC_FAILED",String(error).slice(0,200));}
}

export class LeadDiscoveryWorkflow extends WorkflowEntrypoint<DiscoveryEnv, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    try {
      return await step.do(
        "execute-parallel-provider-discovery",
        {
          retries: { limit: 2, delay: "10 seconds", backoff: "exponential" },
          timeout: "30 minutes",
        },
        async () => {
          const result=await processRun(this.env,event.payload.runId,event.payload.ownerId,event.payload.input);
          await syncAgentRun(this.env,event.payload.runId,event.payload.ownerId,{
            status:result.status==="failed"?"failed":"succeeded",
            result,
            ...(result.status==="failed"?{error_message:"搜索提供商全部执行失败。"}:{}),
            completed_at:new Date().toISOString(),
          });
          return result;
        },
      );
    } catch (error) {
      await step.do("persist-discovery-failure", async () => {
        await markRunFailed(this.env, event.payload.runId, event.payload.ownerId, error);
        await syncAgentRun(this.env,event.payload.runId,event.payload.ownerId,{status:"failed",error_message:error instanceof Error?error.message:String(error).slice(0,500),completed_at:new Date().toISOString()});
        return { failed: true };
      });
      throw error;
    }
  }
}
