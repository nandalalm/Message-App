import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(4, "Username must be at least 4 characters")
    .max(20, "Username cannot exceed 20 characters")
    .regex(/^[a-zA-Z][a-zA-Z._]{2,}[a-zA-Z]$/, "Username must be at least 4 characters, start and end with a letter, and contain only letters, dots, or underscores (no numbers or spaces allowed)"),
  email: z
    .string()
    .trim()
    .refine((val) => val.length > 0, "This field cannot be empty")
    .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Invalid email format"),
  password: z
    .string()
    .refine((val) => val.length > 0, "This field cannot be empty")
    .refine((val) => val.length >= 6, "Password must be at least 6 characters long")
    .refine((val) => /[A-Z]/.test(val), "Password must contain at least 1 uppercase letter")
    .refine((val) => /[a-z]/.test(val), "Password must contain at least 1 lowercase letter")
    .refine((val) => /[0-9]/.test(val), "Password must contain at least 1 number")
    .refine((val) => /[^A-Za-z0-9]/.test(val), "Password must contain at least 1 special character"),
  confirmPassword: z
    .string()
    .refine((val) => val.length > 0, "This field cannot be empty"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
