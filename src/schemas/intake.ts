import * as z from "zod"

export const intakeSchema = z.object({
  age: z.number().int().min(0).max(120),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
})

export type intakeSchemaInput = z.infer<typeof intakeSchema>
