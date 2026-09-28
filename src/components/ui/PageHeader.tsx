import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Consistent page header: micro-copy breadcrumb trail, system page title and
 * an optional action cluster. Every dashboard/admin page opens with one so
 * users always know where they are in the app.
 */

export interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  crumbs?: Crumb[];
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ crumbs, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={className}>
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
            {crumbs.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight className="h-3 w-3 text-slate-600" aria-hidden="true" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-slate-200">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-300">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h1>
          {description && <div className="mt-2 max-w-2xl text-sm text-slate-400 md:text-base">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
    </div>
  );
}
