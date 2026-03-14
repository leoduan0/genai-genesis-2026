import * as z from "zod"

export const therapySchema = z.object({
  patientEmail: z.email("Enter a valid email."),
  title: z.string().optional(),
  transcript: z.string().optional(),
  summary: z.string().optional(),
})

export type therapySchemaInput = z.infer<typeof therapySchema>
