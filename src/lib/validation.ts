import { z } from "zod";

export const symptomOptions = [
  "Anxiety",
  "Depressed mood",
  "Insomnia",
  "Panic attacks",
  "Low energy",
  "Difficulty concentrating",
  "Substance use",
  "Self-harm thoughts",
] as const;

export const intakeSchema = z.object({
  fullName: z.string().min(2, "Please provide a name"),
  age: z.coerce.number().int().min(13, "Must be 13 or older").max(120),
  gender: z.string().min(1, "Select a gender identity"),
  email: z.string().email().optional().or(z.literal("")),
  symptoms: z
    .array(z.enum(symptomOptions))
    .min(1, "Select at least one symptom"),
});

export type IntakeFormValues = z.infer<typeof intakeSchema>;
