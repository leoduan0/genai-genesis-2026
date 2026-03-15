import { ROLES } from "@/generated/prisma/enums"
import { prisma } from "@/lib/prisma"

export async function ensureDoctorProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { doctor: true },
  })

  if (!user || user.role !== ROLES.DOCTOR) {
    return null
  }

  if (user.doctor) {
    return user.doctor
  }

  return prisma.doctor.create({
    data: {
      userId,
    },
  })
}