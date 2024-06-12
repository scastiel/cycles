import { Task, TaskType, useMutation } from '@/liveblocks.config'
import { ReactNode, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Ellipsis, Grip } from 'lucide-react'
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-1 -m-1"
            >
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={task.type}
              onValueChange={(value) => updateTaskType(value as TaskType)}
            >
              <DropdownMenuRadioItem value="task">Normal</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="optional">
                Optional
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="bug">Bug</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={archiveTask}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <TaskTitleViewAndEditor value={task.title} updateValue={updateTaskTitle}>
        {(edit) => (
          <div className="flex flex-col gap-1 hover:bg-muted hover:bg-opacity-5">
            <div
              role="button"
              onClick={edit}
              className="text-sm overflow-hidden hyphens-auto"
            >
              {task.title}
            </div>
          </div>
        )}
      </TaskTitleViewAndEditor>
    </div>
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
