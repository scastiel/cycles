import { env } from '@/env'
import { auth, currentUser } from '@clerk/nextjs/server'
import { Liveblocks } from '@liveblocks/node'
import { NextResponse } from 'next/server'

const liveblocks = new Liveblocks({
  secret: env.LIVEBLOCKS_SECRET_KEY,
})

export async function POST(request: Request) {
  const { userId } = auth()
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const user = await currentUser()

  // Start an auth session inside your endpoint
  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      fullName: user?.fullName,
      username: user?.username,
    },
  })

  // Use a naming pattern to allow access to rooms with wildcards
  // Giving the user read access on their org, and write access on their group
  session.allow(`demo:*`, session.FULL_ACCESS)

  // Authorize the user and return the result
  const { status, body } = await session.authorize()
  return new Response(body, { status })
}
