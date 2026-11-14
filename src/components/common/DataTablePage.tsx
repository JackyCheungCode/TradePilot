import { cloneElement, type ReactElement, type ReactNode } from "react";
import { Pagination, Stack, type PaginationProps } from "@carbon/react";
export type DataTableRowSize = "sm"|"md"|"lg";
export type DataTablePageProps = {toolbar?:ReactNode;dataTable:ReactElement<{size?:"xs"|"sm"|"md"|"lg"|"xl"}>;pagination?:PaginationProps;rowSize?:DataTableRowSize;className?:string};
export function DataTablePage({toolbar,dataTable,pagination,rowSize="md",className}:DataTablePageProps) {
 const table=cloneElement(dataTable,{size:rowSize});
 return <Stack gap={5} className={className}>{toolbar ? <div>{toolbar}</div> : null}{table}{pagination ? <Pagination {...pagination}/> : null}</Stack>;
}