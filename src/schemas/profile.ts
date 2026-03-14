import * as z from "zod"
import { ROLES } from "@/generated/prisma/enums"

export const profileSchema = z.object({
  role: z.enum(ROLES),
  email: z.email("Invalid email"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  userId: z.string().uuid("Invalid user id"),
})

export type profileSchemaInput = z.infer<typeof profileSchema>
