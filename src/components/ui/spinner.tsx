import type { HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

type SpinnerProps = HTMLAttributes<HTMLSpanElement>

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      {...props}
    />
  )
}
