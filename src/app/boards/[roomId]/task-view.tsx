import { Task, TaskType, useMutation } from '@/liveblocks.config'
import { ReactNode, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Cross, Ellipsis, Grip, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { match } from 'ts-pattern'
import { cn } from '@/lib/utils'
import { useOrganizationUsers } from '@/components/organization-users-context'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UserAvatar } from '@/app/boards/[roomId]/user-avatar'

export function TaskView({ task }: { task: Task }) {
  const updateTaskTitle = useMutation(
    ({ storage }, title: string) => {
      storage
        .get('tasks')
        .find((t) => t.get('id') === task.id)
        ?.set('title', title)
    },
    [task.id]
  )

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: {
      type: 'task',
      taskId: task.id,
    },
  })
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const bgColor = match(task.type)
    .with('task', () => 'bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-50')
    .with('optional', () => 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-50')
    .with('bug', () => 'bg-red-50 dark:bg-red-900 dark:bg-opacity-50')
    .otherwise(() => 'bg-white')

  return (
    <div
      className={cn(
        'border rounded p-2 text-sm bg-white flex flex-col gap-2',
        bgColor
      )}
      ref={setNodeRef}
      style={style}
    >
      <div className="flex justify-between">
        <Grip className="cursor-move size-4" {...listeners} {...attributes} />

        <TaskMenu task={task} />
      </div>
      <TaskTitleViewAndEditor value={task.title} updateValue={updateTaskTitle}>
        {(edit) => (
          <div className="flex flex-col gap-1 hover:bg-muted hover:bg-opacity-5">
            <div
              role="button"
              onClick={edit}
              className="text-sm overflow-hidden hyphens-auto"
            >
              {task.title || (
                <em className="text-muted-foreground">
                  Enter a task description
                </em>
              )}
            </div>
          </div>
        )}
      </TaskTitleViewAndEditor>
    </div>
  )
}

function TaskMenu({ task }: { task: Task }) {
  const users = useOrganizationUsers()
  const assignee = task.assignee
    ? users.find((u) => u.userId === task.assignee)
    : undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-auto w-auto p-1 -m-1 flex flex-row gap-1"
        >
          {assignee && <UserAvatar user={assignee} />}
          <Ellipsis className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <TaskMenuContent task={task} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TaskMenuContent({ task }: { task: Task }) {
  const archiveTask = useMutation(
    ({ storage }) => {
      storage
        .get('tasks')
        .find((t) => t.get('id') === task.id)
        ?.set('archived', true)
    },
    [task.id]
  )

  const updateTaskType = useMutation(
    ({ storage }, type: TaskType) => {
      storage
        .get('tasks')
        .find((t) => t.get('id') === task.id)
        ?.set('type', type)
    },
    [task.id]
  )

  const updateTaskAssignee = useMutation(
    ({ storage }, assignee: string | undefined) => {
      const storageTask = storage
        .get('tasks')
        .find((t) => t.get('id') === task.id)
      if (assignee) {
        storageTask?.set('assignee', assignee)
      } else {
        storageTask?.delete('assignee')
      }
    },
    [task.id]
  )

  const users = useOrganizationUsers()

  return (
    <>
      <DropdownMenuLabel>Type</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuRadioGroup
        value={task.type}
        onValueChange={(value) => updateTaskType(value as TaskType)}
      >
        <DropdownMenuRadioItem value="task">Normal</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="optional">Optional</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="bug">Bug</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      {users.length > 0 && (
        <>
          <DropdownMenuLabel>Assignee</DropdownMenuLabel>
          <div className="grid grid-cols-6 gap-1 px-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-2 group"
                  onClick={() => updateTaskAssignee(undefined)}
                >
                  <Avatar
                    className={cn(
                      'opacity-50 shadow w-8 h-8 border-2 border-transparent group-hover:opacity-100',
                      !task.assignee && 'border-slate-400 opacity-100'
                    )}
                  >
                    <AvatarFallback>
                      <X className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Unassign</TooltipContent>
            </Tooltip>
            {users.map((user) => (
              <Tooltip key={user.userId}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-2 group"
                    onClick={() => updateTaskAssignee(user.userId)}
                  >
                    <Avatar
                      className={cn(
                        'opacity-50 shadow w-8 h-8 border-2 border-transparent group-hover:opacity-100',
                        task.assignee === user.userId &&
                          'border-slate-400 opacity-100'
                      )}
                    >
                      <AvatarImage
                        src={user.hasImage ? user.imageUrl : undefined}
                      />
                      <AvatarFallback>{user.initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{user.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuItem onClick={archiveTask} className="text-destructive">
        Delete
      </DropdownMenuItem>
    </>
  )
}

function TaskTitleViewAndEditor({
  value,
  updateValue,
  children,
}: {
  value: string
  updateValue: (value: string) => void
  children?: (edit: () => void) => ReactNode
}) {
  const [editMode, setEditMode] = useState(false)

  if (editMode) {
    return (
      <TaskTitleEditor
        value={value}
        updateValue={updateValue}
        cancel={() => setEditMode(false)}
      />
    )
  }

  return children?.(() => setEditMode(true))
}

function TaskTitleEditor({
  value,
  updateValue,
  cancel,
}: {
  value: string
  updateValue: (name: string) => void
  cancel: () => void
}) {
  const [draftName, setDraftName] = useState(value)

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={() => {
        updateValue(draftName)
        cancel()
      }}
    >
      <Textarea
        className="px-2 py-1 border rounded"
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        autoFocus
        placeholder="Enter a task description"
      />
      <div className="flex justify-center gap-1">
        <Button size="sm" type="submit">
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={() => cancel()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
