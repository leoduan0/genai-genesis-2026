import * as z from "zod"

export const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.string().min(1),
      content: z.string().min(1),
    }),
  ),
})

export type chatSchemaInput = z.infer<typeof chatSchema>
