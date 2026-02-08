import { getOrganizationUsers } from '@/lib/users'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId, orgId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const users = await getOrganizationUsers(orgId)
  return NextResponse.json({ users })
}
