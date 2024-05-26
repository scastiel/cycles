import { env } from '@/env'
import { Liveblocks } from '@liveblocks/node'

export const liveblocks = new Liveblocks({
  secret: env.LIVEBLOCKS_SECRET_KEY,
})
