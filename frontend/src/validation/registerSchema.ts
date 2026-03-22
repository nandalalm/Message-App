import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(4, "Username must be 4-20 characters long")
    .max(20, "Username must be 4-20 characters long")
    .regex(/^[a-zA-Z]/, "Username must start with a letter")
    .regex(/[a-zA-Z0-9]$/, "Username must end with a letter or number")
    .regex(/^[a-zA-Z0-9._]*$/, "Username can only contain letters, numbers, dots, and underscores")
    .refine(s => !/[._]{2,}/.test(s), "Username cannot have consecutive special characters (.. or __)"),
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
