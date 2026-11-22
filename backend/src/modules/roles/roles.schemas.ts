import { z } from "zod";

export const roleSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional().nullable(),
  permissions: z.array(z.string().trim().min(1).max(100)).max(100),
});
export const roleUpdateSchema = roleSchema.partial();
export type RoleInput = z.infer<typeof roleSchema>;
