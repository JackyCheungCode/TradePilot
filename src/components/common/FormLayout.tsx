import type { ReactNode } from "react";
import { Column, Grid, Stack } from "@carbon/react";
export type FormLayoutProps = {children:ReactNode};
export type FormGroupProps = {children:ReactNode};
export function FormLayout({children}:FormLayoutProps) {
 return <Grid><Column sm={4} md={8} lg={8} xlg={8} max={8}><Stack gap={7}>{children}</Stack></Column></Grid>;
}
export function FormGroup({children}:FormGroupProps) { return <Stack gap={6}>{children}</Stack>; }