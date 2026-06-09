import type { AnchorHTMLAttributes, ReactNode } from "react";

type HardNavLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

/** Full document navigation — avoids client RSC transitions stuck on proxy redirects. */
export function HardNavLink({ href, children, className, ...rest }: HardNavLinkProps) {
  return (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  );
}
