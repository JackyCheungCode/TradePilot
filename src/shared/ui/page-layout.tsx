import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type PageControlPanelProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
  toolbar?: ReactNode;
  className?: string;
};

export function PageControlPanel({ title, description, eyebrow, breadcrumb, actions, toolbar, className }: PageControlPanelProps) {
  return (
    <header className={cn("tp-control-panel", className)}>
      <div className="tp-control-panel__main">
        <div className="min-w-0">
          {breadcrumb?.length ? (
            <nav aria-label="面包屑" className="tp-breadcrumb">
              {breadcrumb.map((item, index) => (
                <span key={item + index} className="contents">
                  {index > 0 && <span aria-hidden="true" className="tp-breadcrumb__separator">/</span>}
                  <span className={index === breadcrumb.length - 1 ? "tp-breadcrumb__current" : ""}>{item}</span>
                </span>
              ))}
            </nav>
          ) : eyebrow ? <p className="tp-control-panel__eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {description ? <p className="tp-control-panel__description">{description}</p> : null}
        </div>
        {actions ? <div className="tp-control-panel__actions">{actions}</div> : null}
      </div>
      {toolbar ? <div className="tp-control-panel__toolbar">{toolbar}</div> : null}
    </header>
  );
}

export function PageSection({ title, description, actions, children, className }: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("tp-page-section", className)}>
      {(title || description || actions) && (
        <div className="tp-page-section__header">
          <div className="min-w-0">
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="tp-page-section__actions">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("tp-page-toolbar", className)}>{children}</div>;
}
