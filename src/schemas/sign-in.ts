import * as z from "zod"

export const signInSchema = z.object({
  email: z.email("Invalid email"),
  password: z
    .string("Invalid password")
    .min(8, "Password must be at least 8 characters long"),
})

export type signInSchemaInput = z.infer<typeof signInSchema>
