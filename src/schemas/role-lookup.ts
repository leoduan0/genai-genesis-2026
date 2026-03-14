import * as z from "zod"

export const roleLookupSchema = z.object({
  email: z.email("Invalid email"),
})

export type roleLookupSchemaInput = z.infer<typeof roleLookupSchema>
