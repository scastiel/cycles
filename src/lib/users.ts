import { clerkClient } from '@clerk/nextjs/server'

export interface OrganizationUser {
  userId: string
  name: string
  initials: string
  hasImage: boolean
  imageUrl: string
}

export async function getOrganizationUsers(
  organizationId?: string | null
): Promise<OrganizationUser[]> {
  if (!organizationId) return []

  const { data: memberships } =
    await clerkClient.organizations.getOrganizationMembershipList({
      organizationId,
      limit: 100,
    })
  console.log(memberships.map((m) => m.publicUserData))
  return memberships
    .map((m) => m.publicUserData)
    .filter(Boolean)
    .map<OrganizationUser>((publicUserData) => ({
      userId: publicUserData.userId,
      name:
        [publicUserData.firstName, publicUserData.lastName]
          .filter(Boolean)
          .join(' ') || publicUserData.identifier.replace(/@.*$/, '@…'),
      initials:
        [publicUserData.firstName?.[0], publicUserData.lastName?.[0]]
          .filter(Boolean)
          .join('')
          .toUpperCase() || publicUserData.identifier[0].toUpperCase() + '@',
      imageUrl: publicUserData.imageUrl,
      hasImage: publicUserData.hasImage,
    }))
    .sort((first, second) => first.name.localeCompare(second.name))
}
