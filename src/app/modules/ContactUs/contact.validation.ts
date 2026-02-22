import { z } from "zod";

export const contactValidation = z.object({
    body: z.object({
        name: z
            .string()
            .min(3, "Name must be at least 3 characters"),

        sender: z
            .string()
            .email("Sender must be a valid email address"),

        message: z
            .string()
            .min(10, "Message must be at least 10 characters"),
    }),
});
