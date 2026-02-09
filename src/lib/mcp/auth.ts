import { clerkClient } from '@clerk/nextjs/server'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'

/**
 * Extract userId from MCP authInfo (set by verifyClerkToken).
 */
export function getUserId(authInfo?: AuthInfo): string {
  const userId = authInfo?.extra?.userId
  if (!userId || typeof userId !== 'string') {
    throw new Error('Not authenticated')
  }
  return userId
}

/**
 * Verify that a user is a member of the given organization.
 */
export async function verifyOrgMembership(
  userId: string,
  orgId: string
): Promise<void> {
  const client = await clerkClient()
  const { data: memberships } =
    await client.users.getOrganizationMembershipList({ userId })

  const isMember = memberships.some((m) => m.organization.id === orgId)
  if (!isMember) {
    throw new Error(
      `User is not a member of organization ${orgId}`
    )
  }
}

/**
 * List organizations the user belongs to.
 */
export async function listUserOrgs(userId: string) {
  const client = await clerkClient()
  const { data: memberships } =
    await client.users.getOrganizationMembershipList({ userId })

  return memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
  }))
}

/**
 * Build a Liveblocks room ID from orgId and board slug.
 */
export function roomId(orgId: string, boardSlug: string): string {
  return `${orgId}:${boardSlug}`
}
