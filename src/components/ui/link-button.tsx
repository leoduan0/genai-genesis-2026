import type { ReactNode } from "react"
import Link, { type LinkProps } from "next/link"

import { cn } from "@/lib/utils"

type LinkButtonProps = LinkProps & {
  className?: string
  children: ReactNode
}

const baseClassName =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"

export function LinkButton({ className, children, ...props }: LinkButtonProps) {
  return (
    <Link className={cn(baseClassName, className)} {...props}>
      {children}
    </Link>
  )
}
