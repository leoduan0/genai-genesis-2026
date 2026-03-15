import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

type FieldProps = HTMLAttributes<HTMLDivElement>

type FieldLabelProps = LabelHTMLAttributes<HTMLLabelElement>

type FieldErrorProps = {
  errors?: Array<{ message?: string } | undefined>
  className?: string
}

type FieldDescriptionProps = HTMLAttributes<HTMLParagraphElement>

type FieldContentProps = HTMLAttributes<HTMLDivElement>

type FieldGroupProps = HTMLAttributes<HTMLDivElement>

type FieldContainerProps = HTMLAttributes<HTMLDivElement>

export function Field({ className, ...props }: FieldProps) {
  return (
    <div
      data-slot="field"
      className={cn("space-y-2", className)}
      {...props}
    />
  )
}

export function FieldGroup({ className, ...props }: FieldGroupProps) {
  return (
    <div
      data-slot="field-group"
      className={cn("space-y-4", className)}
      {...props}
    />
  )
}

export function FieldLabel({ className, ...props }: FieldLabelProps) {
  return (
    <label
      data-slot="field-label"
      className={cn("text-xs font-medium text-foreground", className)}
      {...props}
    />
  )
}

export function FieldDescription({ className, ...props }: FieldDescriptionProps) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

export function FieldContent({ className, ...props }: FieldContentProps) {
  return (
    <div
      data-slot="field-content"
      className={cn("space-y-1", className)}
      {...props}
    />
  )
}

export function FieldError({ errors, className }: FieldErrorProps) {
  const messages = (errors ?? [])
    .map((error) => error?.message)
    .filter((message): message is string => Boolean(message))

  if (!messages.length) {
    return null
  }

  return (
    <p
      data-slot="field-error"
      className={cn("text-xs text-destructive", className)}
    >
      {messages.join(" ")}
    </p>
  )
}

export function FieldContainer({ className, ...props }: FieldContainerProps) {
  return (
    <div
      data-slot="field-container"
      className={cn("space-y-2", className)}
      {...props}
    />
  )
}

export function FieldFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-slot="field-footer" className={cn("space-y-2", className)}>
      {children}
    </div>
  )
}
