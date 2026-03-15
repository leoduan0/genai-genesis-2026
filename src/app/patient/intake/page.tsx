"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { saveIntake } from "@/actions/patient"
import { SiteNav } from "@/components/site-nav"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LinkButton } from "@/components/ui/link-button"
import { GENDER } from "@/generated/prisma/enums"
import { intakeSchema, type intakeSchemaInput } from "@/schemas/intake"

export default function PatientIntakePage() {
  const router = useRouter()
  const [loading, setLoading] = useState<boolean>(false)

  const form = useForm<intakeSchemaInput>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      age: 18,
      gender: GENDER.MALE,
    },
  })

  async function onSubmit(formData: intakeSchemaInput) {
    setLoading(true)

    const response = await saveIntake(formData)

    if (response.ok) {
      router.push("/patient/chat")
      toast.success("Successfully filled questionnaire!")
    } else {
      toast.error(response.error)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f5f2,transparent_55%),radial-gradient(circle_at_bottom,#e8f0ec,transparent_45%)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
        <SiteNav />
        <header className="flex flex-col gap-4">
          <Badge className="border-foreground/20 text-foreground">
            Patient intake
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground font-display">
            Begin with what feels safe to share
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Share basic demographics before starting the non-therapy chat. The
            assistant only listens and will never provide treatment advice.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <LinkButton href="/patient">Back to dashboard</LinkButton>
            <LinkButton
              href="/patient"
              className="border-border bg-background text-foreground hover:bg-muted"
            >
              Close questionnaire
            </LinkButton>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>Quick questionnaire</CardTitle>
              <CardDescription>
                Basic demographic information to personalize the experience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="28"
                              value={field.value ?? ""}
                              onChange={(event) =>
                                field.onChange(
                                  event.target.value === ""
                                    ? undefined
                                    : Number(event.target.value),
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage>
                            {form.formState.errors.age?.message}
                          </FormMessage>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <FormControl>
                            <select
                              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                              value={field.value}
                              onChange={field.onChange}
                            >
                              <option value="MALE">Male</option>
                              <option value="FEMALE">Female</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </FormControl>
                          <FormMessage>
                            {form.formState.errors.gender?.message}
                          </FormMessage>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Saving..." : "Continue to chat"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-background/80">
              <CardHeader>
                <CardTitle>What happens next</CardTitle>
                <CardDescription>
                  You will move into a listening-only chat.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  The assistant follows a non-therapy protocol and only asks
                  reflective questions.
                </p>
                <p>You can stop at any time and return to your dashboard.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
