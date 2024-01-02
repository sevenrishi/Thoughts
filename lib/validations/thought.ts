import * as z from "zod";

export const ThoughtValidation = z.object({
  thought: z.string().nonempty().min(3, { message: "Minimum 3 characters." }),
  accountId: z.string(),
});

export const CommentValidation = z.object({
  thought: z.string().nonempty().min(3, { message: "Minimum 3 characters." }),
});
