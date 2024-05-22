import {
  Scope,
  ScopeColor,
  TaskStatus,
  scopeColors,
  useMutation,
  useMyPresence,
  useOthers,
  useOthersMapped,
  useStorage,
  useUpdateMyPresence,
} from '@/liveblocks.config'
import { LiveObject } from '@liveblocks/client'
import assert from 'assert'
import { nanoid } from 'nanoid'
import { CSS } from '@dnd-kit/utilities'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  CSSProperties,
  MutableRefObject,
  PointerEvent,
  PropsWithChildren,
  ReactNode,
  Ref,
  forwardRef,
  useRef,
  useState,
} from 'react'
import { StringViewAndEditor } from './string-view-and-editor'
import { useDroppable } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronRight,
  Circle,
  Ellipsis,
  GripVertical,
  Plus,
} from 'lucide-react'
import { ArchiveCollapsible } from '@/app/boards/[roomId]/archive-collapsible'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { TaskView } from './task-view'
import { match } from 'ts-pattern'
import { PitchDashboard } from '@/app/boards/[roomId]/hill-chart'
import { ScopeIcon, getScopeColorClasses } from './scope-icon'
import Cursor from '@/app/boards/[roomId]/cursor'

export function PitchView({ pitchId }: { pitchId: string }) {
  const pitch = useStorage((root) =>
    root.pitches.find((pitch) => pitch.id === pitchId)
  )
  assert(pitch, 'Pitch does not exist')

  const updateTitle = useMutation(({ storage }, title: string) => {
    storage
      .get('pitches')
      .find((pitch) => pitch.get('id') === pitchId)
      ?.set('title', title)
  }, [])

  const createScope = useCreateScopeMutation(pitchId)

  const divRef = useRef<HTMLDivElement | null>(null)
  const updateCursorProps = useUpdateMyCursor(divRef)

  return (
    <div
      ref={divRef}
      className="relative mt-10 overflow-auto w-full h-full p-2 flex flex-col gap-2"
      {...updateCursorProps}
    >
      <OthersCursors pitchId={pitchId} />
      <div className="sticky left-0 flex items-baseline gap-2">
        <StringViewAndEditor value={pitch.title} updateValue={updateTitle}>
          {(edit) => (
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-lg">{pitch.title}</h2>
              <div>
                <Button onClick={createScope} variant="ghost" size="icon">
                  <Plus className="size-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <Ellipsis className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={edit}>
                      Rename pitch
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </StringViewAndEditor>
      </div>

      <PitchDashboard pitchId={pitch.id} />

      <div className="flex-1">
        <ActiveScopeList pitchId={pitchId} />
      </div>

      <ArchiveCollapsible label="Archived scopes">
        <ArchivedScopeList pitchId={pitchId} />
      </ArchiveCollapsible>
    </div>
  )
}

function useUpdateMyCursor(divRef: MutableRefObject<HTMLDivElement | null>) {
  const updateMyPresence = useUpdateMyPresence()

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!divRef.current) return
    const bounds = divRef.current.getBoundingClientRect()
    const x = event.clientX - bounds.left
    const y = event.clientY - bounds.top
    updateMyPresence({
      cursor: { x, y },
    })
  }
  const onPointerLeave = () => {
    updateMyPresence({ cursor: null })
  }

  return { onPointerMove, onPointerLeave }
}

function OthersCursors({ pitchId }: { pitchId: string }) {
  const others = useOthers()

  return (
    <>
      {others.map(
        ({
          connectionId,
          presence: { cursor, activePitchId },
          info: { fullName, username },
        }) => {
          if (!cursor) return null
          if (activePitchId !== pitchId) return

          return (
            <Cursor
              key={connectionId}
              x={cursor.x}
              y={cursor.y}
              name={fullName ?? username}
            />
          )
        }
      )}
    </>
  )
}

function ActiveScopeList({ pitchId }: { pitchId: string }) {
  const scopes = useStorage((root) =>
    root.scopes.filter((scope) => scope.pitchId === pitchId && !scope.archived)
  )
  const createScope = useCreateScopeMutation(pitchId)

  return (
    <div className="flex flex-col">
      {scopes.length > 0 ? (
        <ScopeList scopes={scopes} />
      ) : (
        <div>
          <span className="text-sm">No scope yet.</span>
          <Button variant="link" size="sm" type="button" onClick={createScope}>
            Create the first one
          </Button>
        </div>
      )}
    </div>
  )
}

function ArchivedScopeList({ pitchId }: { pitchId: string }) {
  const scopes = useStorage((root) =>
    root.scopes.filter((scope) => scope.pitchId === pitchId && scope.archived)
  )

  return scopes.length > 0 ? (
    <ul className="flex flex-col">
      {scopes.map((scope) => (
        <ScopeView key={scope.id} scope={scope} />
      ))}
    </ul>
  ) : (
    <p>No archived scope yet.</p>
  )
}

function ScopeList({ scopes }: { scopes: Scope[] }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const moveScope = useMutation(
    ({ storage }, activeId: string, overId: string) => {
      if (activeId !== overId) {
        const getScopeIndex = (id: string) =>
          storage.get('scopes').findIndex((pitch) => pitch.get('id') === id)
        const activeIndex = getScopeIndex(activeId)
        if (activeIndex !== -1) {
          const overIndex = getScopeIndex(overId)
          storage.get('scopes').move(activeIndex, overIndex)
        }
      }
    },
    []
  )

  const updateTaskStatus = useUpdateTaskStatus()

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event

          switch (over?.data.current?.type) {
            case 'scope-status': {
              if (active.data.current?.type === 'task') {
                const taskId = active.id as string
                const { scopeId, status } = over.data.current as {
                  scopeId: string
                  status: TaskStatus
                }
                updateTaskStatus(taskId, scopeId, status)
              }
              break
            }
            case 'scope': {
              if (
                active.data.current?.type === 'scope' &&
                over &&
                active.id !== over.id
              ) {
                moveScope(String(active.id), String(over.id))
              }
            }
          }
        }}
      >
        <SortableContext items={scopes} strategy={verticalListSortingStrategy}>
          {scopes.map((scope) => (
            <SortableScopeView key={scope.id} scope={scope} />
          ))}
        </SortableContext>
      </DndContext>
    </>
  )
}

function useCreateScopeMutation(pitchId: string) {
  return useMutation(
    ({ storage }) => {
      storage.get('scopes').push(
        new LiveObject<Scope>({
          id: nanoid(),
          pitchId,
          title: 'New scope',
        })
      )
    },
    [pitchId]
  )
}

function createUseChangeScopeArchivedMutation(archived: boolean) {
  return (scopeId: string) => {
    return useMutation(
      ({ storage }) => {
        storage
          .get('scopes')
          .find((scope) => scope.get('id') === scopeId)
          ?.set('archived', archived)
      },
      [scopeId, archived]
    )
  }
}
const useArchiveScopeMutation = createUseChangeScopeArchivedMutation(true)
const useRestoreScopeMutation = createUseChangeScopeArchivedMutation(false)

function SortableScopeView({ scope }: { scope: Scope }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: scope.id,
      data: {
        type: 'scope',
        scopeId: scope.id,
      },
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <ScopeView
        scope={scope}
        grip={
          <div className="cursor-move" {...listeners} {...attributes}>
            <GripVertical className="size-4" />
          </div>
        }
      />
    </div>
  )
}

const ScopeView = forwardRef<
  HTMLDivElement,
  { scope: Scope; grip?: ReactNode; style?: CSSProperties }
>(({ scope, grip, style }, forwardedRef) => {
  const updateTitle = useMutation(({ storage }, title: string) => {
    storage
      .get('scopes')
      .find((s) => s.get('id') === scope.id)
      ?.set('title', title)
  }, [])
  const updateCore = useMutation(({ storage }, core: boolean) => {
    storage
      .get('scopes')
      .find((s) => s.get('id') === scope.id)
      ?.set('core', core)
  }, [])
  const updateColor = useMutation(({ storage }, color: ScopeColor) => {
    storage
      .get('scopes')
      .find((s) => s.get('id') === scope.id)
      ?.set('color', color)
  }, [])

  const archiveScope = useArchiveScopeMutation(scope.id)
  const restoreScope = useRestoreScopeMutation(scope.id)
  const createTask = useCreateTaskMutation(scope.id)

  return (
    <div
      className="flex-1 flex flex-col gap-2"
      style={style}
      ref={forwardedRef}
    >
      <div className="sticky w-fit left-0 flex items-center gap-4">
        <StringViewAndEditor value={scope.title} updateValue={updateTitle}>
          {(edit) => (
            <>
              <div className="flex items-center gap-2">
                {grip}
                <ScopeIcon scope={scope} />
                <span className="text-sm font-semibold">{scope.title}</span>
              </div>
              <div>
                <Button variant="ghost" size="icon" onClick={createTask}>
                  <Plus className="size-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Ellipsis className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={edit}>Rename</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={scope.core === true}
                      onCheckedChange={updateCore}
                    >
                      Core scope
                    </DropdownMenuCheckboxItem>
                    <div className="grid grid-cols-4">
                      {scopeColors.map((color) => (
                        <DropdownMenuItem
                          key={color}
                          onClick={() => updateColor(color)}
                          className="group"
                        >
                          <Circle
                            className={cn(
                              'size-4 group-hover:opacity-100',
                              scope.color !== color && 'opacity-20',
                              getScopeColorClasses(color)
                            )}
                          />
                        </DropdownMenuItem>
                      ))}
                    </div>
                    <DropdownMenuSeparator />
                    {scope.archived ? (
                      <DropdownMenuItem onClick={restoreScope}>
                        Restore
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={archiveScope}>
                        Archive
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </StringViewAndEditor>
      </div>
      <div className="mb-4">
        <ScopeTasksList scopeId={scope.id} />
      </div>
    </div>
  )
})
ScopeView.displayName = 'ScopeView'

function ScopeTasksList({ scopeId }: { scopeId: string }) {
  const tasks = useStorage((root) =>
    root.tasks.filter((task) => task.scopeId === scopeId && !task.archived)
  )
  return (
    <div className="flex gap-2 w-fit">
      <ScopeStatusTaskList colCount={3} scopeId={scopeId} status="todo">
        {tasks
          .filter((t) => t.status === 'todo')
          .map((task) => (
            <TaskView key={task.id} task={task} />
          ))}
        {tasks.length === 0 && (
          <div className="text-muted-foreground text-xs">
            No task yet in this scope.
          </div>
        )}
      </ScopeStatusTaskList>
      <ScopeStatusTaskList colCount={2} scopeId={scopeId} status="in_progress">
        {tasks
          .filter((t) => t.status === 'in_progress')
          .map((task) => (
            <TaskView key={task.id} task={task} />
          ))}
      </ScopeStatusTaskList>
      <ScopeStatusTaskList colCount={3} scopeId={scopeId} status="done">
        {tasks
          .filter((t) => t.status === 'done')
          .map((task) => (
            <div key={task.id}>
              <TaskView task={task} />
            </div>
          ))}
      </ScopeStatusTaskList>
    </div>
  )
}

function ScopeStatusTaskList({
  children,
  colCount,
  scopeId,
  status,
}: PropsWithChildren<{
  colCount: number
  scopeId: string
  status: TaskStatus
}>) {
  const taskWidth = 200
  const gap = 8
  const padding = 8
  const width = taskWidth * colCount + gap * (colCount - 1) + 2 * padding

  const { isOver, active, setNodeRef } = useDroppable({
    id: `${scopeId}/${status}`,
    data: {
      type: 'scope-status',
      scopeId,
      status,
    },
  })
  const accepts = active?.data.current?.type === 'task'
  const droppableHoverClass1 = accepts
    ? 'border-slate-200'
    : 'border-transparent'
  const droppableHoverClass2 = accepts && isOver ? 'border-slate-500' : ''

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 border-2 border-dashed bg-slate-50 ${droppableHoverClass1} ${droppableHoverClass2}`}
      style={{
        padding,
        width,
      }}
    >
      <div className="text-xs uppercase text-muted-foreground -m-1">
        {match(status)
          .with('todo', () => 'To do')
          .with('in_progress', () => 'In progress')
          .with('done', () => 'Done')
          .exhaustive()}
      </div>
      <div
        className="grid items-start"
        style={{
          gap,
          gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

function useCreateTaskMutation(scopeId: string) {
  return useMutation(
    ({ storage }) => {
      storage.get('tasks').push(
        new LiveObject({
          id: nanoid(),
          title: 'New task',
          scopeId,
          status: 'todo',
          type: 'task',
        })
      )
    },
    [scopeId]
  )
}

function useUpdateTaskStatus() {
  return useMutation(
    ({ storage }, taskId: string, scopeId: string, status: TaskStatus) => {
      storage
        .get('tasks')
        .find((t) => t.get('id') === taskId)
        ?.update({ status, scopeId })
      const taskIndex = storage
        .get('tasks')
        .findIndex((t) => t.get('id') === taskId)
      const newTaskIndex = storage.get('tasks').length - 1
      storage.get('tasks').move(taskIndex, newTaskIndex)
    },
    []
  )
}
