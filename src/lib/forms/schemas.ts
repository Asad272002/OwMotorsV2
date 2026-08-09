import { z } from "zod";

const phone = z.string().trim().regex(/^[+]?[0-9][0-9 ()-]{6,24}$/, "Enter a valid phone number.");
const optionalPhone = z.preprocess((value) => value === "" ? undefined : value, phone.optional());

export const contactInquirySchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  phone: optionalPhone,
  email: z.string().trim().email("Enter a valid email address.").max(254),
  subject: z.string().trim().min(2, "Enter a subject.").max(180),
  message: z.string().trim().min(10, "Please provide at least 10 characters.").max(4_000),
  website: z.string().max(200).optional(),
});
