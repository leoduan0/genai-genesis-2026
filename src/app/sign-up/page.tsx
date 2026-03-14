"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { signUp } from "@/actions/sign-up"
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LinkButton } from "@/components/ui/link-button"
import { Spinner } from "@/components/ui/spinner"
import { ROLES } from "@/generated/prisma/enums"
import { signUpSchema, type signUpSchemaInput } from "@/schemas/sign-up"

export default function SignUpPage() {
  const router = useRouter()
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [isSigningUp, startSigningUp] = useTransition()

  const form = useForm<signUpSchemaInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      role: ROLES.PATIENT,
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  })

  async function onSubmit(formData: signUpSchemaInput) {
    setSubmitMessage(null)

    startSigningUp(async () => {
      const response = await signUp(formData)

      if (response.ok) {
        toast.success("Account created. You can sign in now.")

        if (formData.role === ROLES.PATIENT) {
          router.push("/patient/intake")
        } else {
          router.push("/doctor")
        }
      } else {
        toast.error(response.error)
      }
    })
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f5f2,transparent_55%),radial-gradient(circle_at_bottom,#e8f0ec,transparent_45%)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
        <SiteNav />

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Sign up</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Have an account?</span>
            <LinkButton
              href="/sign-in"
              className="h-7 border-border bg-background text-foreground hover:bg-muted"
            >
              Sign in
            </LinkButton>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/">Back home</LinkButton>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="w-full bg-background/80">
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>
                Secure access for patients and clinicians.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form id="form-sign-up" onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="role"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="form-sign-up-role">
                          Role
                        </FieldLabel>
                        <select
                          id="form-sign-up-role"
                          className="h-8 rounded-none border border-input bg-transparent px-2.5 text-xs"
                          value={field.value}
                          onChange={field.onChange}
                        >
                          <option value={ROLES.PATIENT}>Patient</option>
                          <option value={ROLES.DOCTOR}>Doctor</option>
                        </select>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Controller
                      name="firstName"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="form-sign-up-firstName">
                            First name
                          </FieldLabel>
                          <Input
                            {...field}
                            id="form-sign-up-firstName"
                            aria-invalid={fieldState.invalid}
                            placeholder="Alex"
                            autoComplete="off"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                    <Controller
                      name="lastName"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="form-sign-up-lastName">
                            Last name
                          </FieldLabel>
                          <Input
                            {...field}
                            id="form-sign-up-lastName"
                            aria-invalid={fieldState.invalid}
                            placeholder="Lee"
                            autoComplete="off"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Controller
                      name="email"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="form-sign-up-email">
                            Email
                          </FieldLabel>
                          <Input
                            {...field}
                            id="form-sign-up-email"
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
                          <FieldLabel htmlFor="form-sign-up-password">
                            Password
                          </FieldLabel>
                          <Input
                            {...field}
                            id="form-sign-up-password"
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
                  </div>
                </FieldGroup>
              </form>
            </CardContent>
            <CardFooter>
              <Field>
                <div>
                  <Button
                    type="submit"
                    disabled={isSigningUp}
                    form="form-sign-up"
                  >
                    {isSigningUp && <Spinner className="mr-2" />}
                    {isSigningUp ? "Signing up..." : "Sign up"}
                  </Button>
                </div>
                {submitMessage && (
                  <FieldDescription>{submitMessage}</FieldDescription>
                )}
              </Field>
            </CardFooter>
          </Card>

          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>What you get</CardTitle>
              <CardDescription></CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Secure Supabase Auth account tied to your clinical workflow.
              </p>
              <p>Role-based setup for patient or clinician dashboards.</p>
              <p>Instant access to transcripts and session summaries.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
