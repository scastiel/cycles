'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOrganization, useOrganizationList, useUser } from '@clerk/nextjs'

export function OrganizationSelector() {
  const { isLoaded, userMemberships } = useOrganizationList({
    userMemberships: true,
  })
  const { organization } = useOrganization()
  const { user } = useUser()

  if (!isLoaded) return null

  return (
    <Select name="orgId" defaultValue={organization?.id ?? user?.id}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent id="orgId">
        {user && <SelectItem value={user.id}>{user.fullName}</SelectItem>}
        {userMemberships.data.map((membership) => (
          <SelectItem
            key={membership.organization.id}
            value={membership.organization.id}
          >
            {membership.organization.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
