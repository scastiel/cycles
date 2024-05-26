import { liveblocks } from '@/lib/liveblocks'
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { userId, orgId } = auth()
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
  session.allow(`${orgId ?? userId}:*`, session.FULL_ACCESS)

  // Authorize the user and return the result
  const { status, body } = await session.authorize()
  return new Response(body, { status })
}
