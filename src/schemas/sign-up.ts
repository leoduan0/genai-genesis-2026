import * as z from "zod"
import { ROLES } from "@/generated/prisma/enums"

export const signUpSchema = z.object({
  email: z.email("Invalid email"),
  password: z
    .string("Invalid password")
    .min(8, "Password must be at least 8 characters long"),
  firstName: z
    .string("Invalid first name")
    .trim()
    .min(1, "First name must be at least 1 character long"),
  lastName: z
    .string("Invalid last name")
    .trim()
    .min(1, "Last name must be at least 1 character long"),
  role: z.enum(ROLES),
})

export type signUpSchemaInput = z.infer<typeof signUpSchema>
