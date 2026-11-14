export type AgentAppearance = { shape:string; color:string; styleId:"vector"|"pixel"|"kaomoji"; variant:string; face:"cute"|"eyes"|"line" };
export type AgentAppearanceConfig = { default:AgentAppearance; agents:Record<string,AgentAppearance> };
export const DEFAULT_AGENT_APPEARANCE:AgentAppearance={shape:"mochi",color:"cream",styleId:"vector",variant:"soft",face:"cute"};
export const DEFAULT_AGENT_APPEARANCE_CONFIG:AgentAppearanceConfig={default:DEFAULT_AGENT_APPEARANCE,agents:{}};
export const AGENT_APPEARANCE_PROFILES=[
{id:"buyer_development",name:"全球买家开发 Agent",detail:"寻找全球进口商与采购商"},
{id:"market_research",name:"市场研究 Agent",detail:"分析国家、品类与竞争趋势"},
{id:"company_research",name:"企业调查 Agent",detail:"调查企业与联系方式"},
{id:"lead_scoring",name:"客户评估 Agent",detail:"评估潜客质量与采购潜力"},
{id:"multilingual_sales",name:"多语言销售 Agent",detail:"生成多语言销售内容"},
{id:"follow_up",name:"外贸跟进 Agent",detail:"整理跟进与下一步行动"},
{id:"trade_compliance",name:"贸易合规 Agent",detail:"辅助核查贸易合规风险"},
] as const;
