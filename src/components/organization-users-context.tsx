import { OrganizationUser } from '@/lib/users'
import { PropsWithChildren, createContext, useContext } from 'react'

const UsersContext = createContext<OrganizationUser[] | null>(null)

export function useOrganizationUsers() {
  const users = useContext(UsersContext)

  if (!users) throw new Error('Missing context')

  return users
}

export function OrganizationUsersProvider({
  organizationUsers,
  children,
}: PropsWithChildren<{ organizationUsers: OrganizationUser[] }>) {
  return (
    <UsersContext.Provider value={organizationUsers}>
      {children}
    </UsersContext.Provider>
  )
}
