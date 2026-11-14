import type { ReactNode } from "react";
import { Breadcrumb, BreadcrumbItem, Heading, Section, Stack } from "@carbon/react";
export type PageBreadcrumb = { label: string; href?: string };
export type PageHeaderProps = { breadcrumbs?: PageBreadcrumb[]; title: string; actions?: ReactNode };
export function PageHeader({ breadcrumbs = [], title, actions }: PageHeaderProps) {
  return <Section as="header" level={1}><Stack gap={6}><Stack gap={3}>
    {breadcrumbs.length > 0 ? <Breadcrumb>{breadcrumbs.map((item,index) => {
      const isCurrentPage = index === breadcrumbs.length - 1;
      return <BreadcrumbItem key={item.label + "-" + index} href={isCurrentPage ? undefined : item.href} isCurrentPage={isCurrentPage}>{item.label}</BreadcrumbItem>;
    })}</Breadcrumb> : null}
    <Heading className="cds--type-productive-heading-04">{title}</Heading>
  </Stack>{actions ? <div>{actions}</div> : null}</Stack></Section>;
}