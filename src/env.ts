import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_LIVEBLOCKS_API_KEY: z.string().min(1),
  LIVEBLOCKS_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
})

const envObj = {
  NEXT_PUBLIC_LIVEBLOCKS_API_KEY: process.env.NEXT_PUBLIC_LIVEBLOCKS_API_KEY,
  LIVEBLOCKS_SECRET_KEY: process.env.LIVEBLOCKS_SECRET_KEY,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
}

export const env = (
  global.document !== undefined ? envObj : envSchema.parse(envObj)
) as z.infer<typeof envSchema>
