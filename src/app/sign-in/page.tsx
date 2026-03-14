"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { getRole } from "@/actions/profile"
import { signIn } from "@/actions/sign-in"
import { SiteNav } from "@/components/site-nav"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LinkButton } from "@/components/ui/link-button"
import { Spinner } from "@/components/ui/spinner"
import { ROLES } from "@/generated/prisma/enums"
import { signInSchema, type signInSchemaInput } from "@/schemas/sign-in"

export default function LoginPage() {
  const router = useRouter()
  const [isSigningIn, startSigningIn] = useTransition()

  const form = useForm<signInSchemaInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(formData: signInSchemaInput) {
    startSigningIn(async () => {
      const result = await signIn({
        email: formData.email,
        password: formData.password,
      })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      const userRole = await getRole()

      if (userRole === ROLES.PATIENT) {
        router.push("/patient")
      } else {
        router.push("/doctor")
      }
    })
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f5f2,transparent_55%),radial-gradient(circle_at_bottom,#e8f0ec,transparent_45%)]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
        <SiteNav />

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Need an account?</span>
            <LinkButton
              href="/sign-up"
              className="h-7 border-border bg-background text-foreground hover:bg-muted"
            >
              Create one here
            </LinkButton>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/">Back home</LinkButton>
          </div>
        </div>

        <Card className="w-full sm:max-w-md bg-background/80">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Use the email you registered with.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="form-sign-in" onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="form-sign-in-email">
                        Email
                      </FieldLabel>
                      <Input
                        {...field}
                        id="form-sign-in-email"
                        aria-invalid={fieldState.invalid}
                        placeholder="example@example.com"
                        autoComplete="off"
                        type="email"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="form-sign-in-password">
                        Password
                      </FieldLabel>
                      <Input
                        {...field}
                        id="form-sign-in-password"
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                        type="password"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
            </form>
          </CardContent>
          <CardFooter>
            <Field>
              <div>
                <Button
                  type="submit"
                  disabled={isSigningIn}
                  form="form-sign-in"
                >
                  {isSigningIn && <Spinner className="mr-2" />}
                  {isSigningIn ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </Field>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
