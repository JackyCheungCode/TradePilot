import { useEffect,useState } from "react";
import { agentApi } from "../../infrastructure/agent-api";
import { DEFAULT_AGENT_APPEARANCE_CONFIG,type AgentAppearance,type AgentAppearanceConfig } from "../../domain/appearance";
let cachedConfig:AgentAppearanceConfig=DEFAULT_AGENT_APPEARANCE_CONFIG;
let loadPromise:Promise<AgentAppearanceConfig>|null=null;
const listeners=new Set<()=>void>();
function normalize(value:AgentAppearanceConfig|null|undefined):AgentAppearanceConfig{
 if(!value||typeof value!=="object"||!value.default)return DEFAULT_AGENT_APPEARANCE_CONFIG;
 return {default:{...DEFAULT_AGENT_APPEARANCE_CONFIG.default,...value.default},agents:value.agents??{}};
}
function notify(){listeners.forEach(listener=>listener());}
export async function loadAgentAppearanceConfig():Promise<AgentAppearanceConfig>{
 if(loadPromise)return loadPromise;
 loadPromise=agentApi.getAppearance().then(value=>{cachedConfig=normalize(value);notify();return cachedConfig;}).catch(()=>cachedConfig).finally(()=>{loadPromise=null;});
 return loadPromise;
}
export async function saveAgentAppearanceConfig(value:AgentAppearanceConfig):Promise<AgentAppearanceConfig>{
 cachedConfig=normalize(await agentApi.saveAppearance(value));notify();return cachedConfig;
}
export function useAgentAppearance(agentKey="default"):AgentAppearance{
 const [config,setConfig]=useState(cachedConfig);
 useEffect(()=>{const update=()=>setConfig(cachedConfig);listeners.add(update);void loadAgentAppearanceConfig();return()=>{listeners.delete(update);};},[]);
 return config.agents[agentKey]??config.default;
}
