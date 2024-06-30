import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { OrganizationUser } from '@/lib/users'
import { Portal } from '@radix-ui/react-tooltip'

export function UserAvatar({
  user,
}: {
  user: Pick<OrganizationUser, 'hasImage' | 'imageUrl' | 'initials' | 'name'>
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar className="shadow size-5 -my-1">
          <AvatarImage src={user.hasImage ? user.imageUrl : undefined} />
          <AvatarFallback className="text-[10px]">
            {user.initials}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <Portal>
        <TooltipContent className="z-50">{user.name}</TooltipContent>
      </Portal>
    </Tooltip>
  )
}
