import { Button, DataTableSkeleton, Heading, InlineNotification, Section, Stack, Tile } from "@carbon/react";
export type TableLoadingProps = {columnCount?:number;rowCount?:number;showHeader?:boolean;size?:"sm"|"md"|"lg"};
export function TableLoading({columnCount=5,rowCount=5,showHeader=true,size="md"}:TableLoadingProps) {
 return <DataTableSkeleton columnCount={columnCount} rowCount={rowCount} showHeader={showHeader} size={size}/>;
}
export type EmptyStateProps = {title?:string;description?:string};
export function EmptyState({title="暂无数据",description}:EmptyStateProps) {
 return <Tile><Stack gap={3}><Section level={2}><Heading className="cds--type-productive-heading-02">{title}</Heading></Section>{description ? <p>{description}</p> : null}</Stack></Tile>;
}
export type ErrorStateProps = {title?:string;message?:string;onRetry?:()=>void;retryText?:string};
export function ErrorState({title="加载失败",message,onRetry,retryText="重试"}:ErrorStateProps) {
 return <Stack gap={3}><InlineNotification kind="error" title={title} subtitle={message} hideCloseButton/>{onRetry ? <div><Button kind="tertiary" onClick={onRetry}>{retryText}</Button></div> : null}</Stack>;
}