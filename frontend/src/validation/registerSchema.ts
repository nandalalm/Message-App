import { z } from "zod";

const usernameRequirementsMessage =
  "Username must be 4-20 characters, start with a letter, use only letters, numbers, dots, or underscores, and have no spaces or consecutive dots/underscores";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, usernameRequirementsMessage)
    .min(4, usernameRequirementsMessage)
    .max(20, usernameRequirementsMessage)
    .regex(/^[a-zA-Z]/, "Username must start with a letter")
    .regex(/[a-zA-Z0-9]$/, "Username must end with a letter or number")
    .regex(/^[a-zA-Z0-9._]*$/, "Username can only contain letters, numbers, dots, and underscores with no spaces")
    .refine(s => !/[._]{2,}/.test(s), "Username cannot have consecutive dots or underscores"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email format"),
  password: z
    .string()
    .min(1, "Password is required")
    .refine((val) => val.length >= 6, "Password must be at least 6 characters long")
    .refine((val) => /[A-Z]/.test(val), "Password must contain at least 1 uppercase letter")
    .refine((val) => /[a-z]/.test(val), "Password must contain at least 1 lowercase letter")
    .refine((val) => /[0-9]/.test(val), "Password must contain at least 1 number")
    .refine((val) => /[^A-Za-z0-9]/.test(val), "Password must contain at least 1 special character"),
  confirmPassword: z
    .string()
    .min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
