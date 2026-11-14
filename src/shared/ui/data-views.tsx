import type { ReactNode } from "react";
import { Search, Close } from "@carbon/icons-react";
import { cn } from "@/shared/lib/utils";
import { Tag as CarbonTag } from "@carbon/react";
import { Button, Input } from "@/shared/ui/primitives";

export function SearchControlPanel({
  search,
  onSearchChange,
  searchPlaceholder = "搜索…",
  filters,
  actions,
  activeFilters = false,
  onClear,
  resultCount,
  className,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  activeFilters?: boolean;
  onClear?: () => void;
  resultCount?: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label="搜索与筛选" className={cn("tp-search-control-panel flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {onSearchChange ? (
          <div className="relative min-w-[180px] flex-1 sm:max-w-[320px]">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search ?? ""} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="h-9 pl-9" />
          </div>
        ) : null}
        {filters}
        {activeFilters && onClear ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear} className="h-9">
            <Close aria-hidden="true" className="h-3.5 w-3.5" />清除筛选
          </Button>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {resultCount ? <span className="text-xs tabular-nums text-muted-foreground">{resultCount}</span> : null}
        {actions}
      </div>
    </section>
  );
}

export function ListViewShell({ children, footer, className }: { children: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <section className={cn("tp-list-view min-w-0", className)}>
      <div className="min-w-0">{children}</div>
      {footer ? <footer className="mt-3 flex flex-wrap items-center justify-between gap-3 bg-muted/25 px-3 py-2.5">{footer}</footer> : null}
    </section>
  );
}

export function FormLayout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("tp-form-layout space-y-5", className)}>{children}</div>;
}

export function FormSection({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("tp-form-section space-y-3", className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function FormField({ label, required = false, description, error, children, className }: {
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="flex items-center gap-1 text-[13px] font-medium text-foreground">
          {label}
          {required ? <span aria-label="必填" className="text-destructive">*</span> : null}
        </span>
        {children}
      </div>
      {description ? <p className="text-xs leading-5 text-muted-foreground">{description}</p> : null}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

const statusTagType: Record<string, "gray" | "blue" | "cyan" | "green" | "red" | "magenta" | "purple" | "teal" | "warm-gray"> = {
  draft: "gray",
  planned: "gray",
  queued: "warm-gray",
  running: "blue",
  partial: "warm-gray",
  succeeded: "green",
  awaiting_approval: "warm-gray",
  approved: "green",
  rejected: "red",
  expired: "gray",
  pending: "warm-gray",
  review: "warm-gray",
  active: "green",
  completed: "green",
  issued: "blue",
  cancelled: "gray",
  void: "gray",
  archived: "gray",
  failed: "red",
};

export function StatusBadge({ status, label, className }: { status: string; label: string; className?: string }) {
  return <CarbonTag data-status={status} type={statusTagType[status] ?? "gray"} size="sm" className={className}>{label}</CarbonTag>;
}
