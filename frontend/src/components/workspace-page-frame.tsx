import type { HTMLAttributes, ReactNode } from "react";

type DivDataAttributes = {
  [key: `data-${string}`]: boolean | number | string | undefined;
};

type WorkspacePageFrameProps = {
  actions?: ReactNode;
  children: ReactNode;
  copyProps?: HTMLAttributes<HTMLDivElement> & DivDataAttributes;
  eyebrow: string;
  mainClassName?: string;
  subtitle?: string;
  title: string;
};

export function WorkspacePageFrame({
  actions,
  children,
  copyProps,
  eyebrow,
  mainClassName,
  subtitle,
  title
}: WorkspacePageFrameProps) {
  const copyClassName = [
    "workspace-topbar-copy",
    copyProps?.className
  ]
    .filter(Boolean)
    .join(" ");
  const contentClassName = ["workspace-main", mainClassName].filter(Boolean).join(" ");

  return (
    <div className="workspace-shell-main">
      <header className="workspace-topbar">
        <div {...copyProps} className={copyClassName}>
          <span className="workspace-topbar-eyebrow">{eyebrow}</span>
          <div className="workspace-topbar-heading">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>

        {actions ? <div className="workspace-topbar-actions">{actions}</div> : null}
      </header>

      <section className={contentClassName}>{children}</section>
    </div>
  );
}
