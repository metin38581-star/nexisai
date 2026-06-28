"use client";

import type { MouseEvent, ReactNode } from "react";
import { ExternalLink } from "lucide-react";

import {
  isSameSiteAdminLink,
  resolveAdminLinkForClient,
} from "@/lib/admin-link-url";

interface AdminLiveLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  title?: string;
  showIcon?: boolean;
}

export default function AdminLiveLink({
  href,
  children,
  className,
  title,
  showIcon = false,
}: AdminLiveLinkProps) {
  const resolvedHref = resolveAdminLinkForClient(href);
  const sameSite = isSameSiteAdminLink(href);
  const linkTitle = title ?? resolvedHref;

  const stopBubble = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  return (
    <a
      href={resolvedHref}
      target={sameSite ? "_self" : "_blank"}
      rel={sameSite ? undefined : "noopener noreferrer"}
      className={className}
      title={linkTitle}
      onClick={stopBubble}
      onMouseDown={stopBubble}
    >
      {children}
      {showIcon ? <ExternalLink className="h-3 w-3 shrink-0" /> : null}
    </a>
  );
}
