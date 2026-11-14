import { cloneElement, type ReactElement, type ReactNode } from "react";
import { Pagination, Stack, type PaginationProps } from "@carbon/react";
export type DataTableRowSize = "sm"|"md"|"lg";
export type DataTablePageProps = {toolbar?:ReactNode;dataTable:ReactElement<{size?:DataTableRowSize}>;pagination?:PaginationProps;rowSize?:DataTableRowSize};
export function DataTablePage({toolbar,dataTable,pagination,rowSize="md"}:DataTablePageProps) {
 const table=cloneElement(dataTable,{size:rowSize});
 return <Stack>{toolbar ? <div>{toolbar}</div> : null}{table}{pagination ? <Pagination {...pagination}/> : null}</Stack>;
}