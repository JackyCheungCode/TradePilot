import { useSyncExternalStore } from "react";
import { InlineNotification, ToastNotification } from "@carbon/react";
export type NotifyKind = "success"|"info"|"warning"|"error";
export type NotifyMessage = {kind:NotifyKind;title:string;subtitle?:string};
type ToastMessage=NotifyMessage & {id:number;timeout:number};
let nextId=1;
let toastMessages:ToastMessage[]=[];
const listeners=new Set<()=>void>();
function emitChange(){listeners.forEach(listener=>listener());}
function removeToast(id:number){const next=toastMessages.filter(message=>message.id!==id);if(next.length!==toastMessages.length){toastMessages=next;emitChange();}}
function subscribe(listener:()=>void){listeners.add(listener);return ()=>listeners.delete(listener);}
function getSnapshot(){return toastMessages;}
function getServerSnapshot():ToastMessage[]{return [];}
export const Notify={
 toast(message:NotifyMessage & {timeout?:number}){toastMessages=[...toastMessages,{...message,id:nextId++,timeout:message.timeout??5000}];emitChange();},
 inline(message:NotifyMessage){return <InlineNotification kind={message.kind} title={message.title} subtitle={message.subtitle}/>;}
};
export function NotifyViewport(){
 const messages=useSyncExternalStore(subscribe,getSnapshot,getServerSnapshot);
 if(messages.length===0)return null;
 return <div aria-label="系统通知" role="region" style={{position:"fixed",top:"var(--cds-spacing-05)",right:"var(--cds-spacing-05)",zIndex:9999,display:"flex",flexDirection:"column",gap:"var(--cds-spacing-03)"}}>
  {messages.map(message=><ToastNotification key={message.id} kind={message.kind} title={message.title} subtitle={message.subtitle} timeout={message.timeout} onClose={()=>removeToast(message.id)}/>)}
 </div>;
}