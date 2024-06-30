import {
  Scope,
  ScopeColor,
  TaskStatus,
  scopeColors,
  useMutation,
  useOthers,
  useStorage,
  useUpdateMyPresence,
} from '@/liveblocks.config'
import { LiveObject } from '@liveblocks/client'
import assert from 'assert'
import { nanoid } from 'nanoid'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import {
  CSSProperties,
  MutableRefObject,
  PointerEvent,
  PropsWithChildren,
  forwardRef,
  useRef,
} from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Calendar, Ellipsis, ExternalLink, Plus } from 'lucide-react'
import { ArchiveCollapsible } from '@/app/boards/[roomId]/archive-collapsible'
import { TaskView } from './task-view'
import { match } from 'ts-pattern'
import { PitchDashboard } from '@/app/boards/[roomId]/hill-chart'
import { ScopeIcon } from './scope-icon'
import Cursor from '@/app/boards/[roomId]/cursor'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { SnapshotsDialogContent } from '@/app/boards/[roomId]/snapshots-dialog'
import { countBy, uniq } from 'lodash'
import { ScopeDropdownMenu } from '@/app/boards/[roomId]/scope-dropdown-menu'
import { PitchDropdownMenu } from './pitch-dropdown-menu'

export function PitchView({ pitchId }: { pitchId: string }) {
  const pitch = useStorage((root) =>
    root.pitches.find((pitch) => pitch.id === pitchId)
  )
  assert(pitch, 'Pitch does not exist')

  const divRef = useRef<HTMLDivElement | null>(null)
  const updateCursorProps = useUpdateMyCursor(divRef)

  const archivedScopesCount = useStorage(
    (root) =>
      root.scopes.filter(
        (scope) => scope.pitchId === pitch.id && scope.archived
      ).length
  )

  return (
    <div
      ref={divRef}
      className="flex-1 relative mt-10 overflow-auto w-full px-4 py-2 flex flex-col gap-2"
      {...updateCursorProps}
    >
      <OthersCursors pitchId={pitchId} />
      <div className="sticky left-0 flex flex-col gap-1 my-2 group">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-lg">{pitch.title}</h2>
          <PitchDropdownMenu pitch={pitch}>
            <Button
              size="icon"
              variant="ghost"
              className="size-6 opacity-10 group-hover:opacity-100"
            >
              <Ellipsis className="size-4" />
            </Button>
          </PitchDropdownMenu>
          <div className="flex gap-2 items-center">
            {pitch.link && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                asChild
              >
                <a href={pitch.link} target="_blank">
                  <ExternalLink className="size-3 mr-2" />
                  Pitch
                </a>
              </Button>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                >
                  <Calendar className="size-3 mr-2" />
                  Snapshots
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[1266px] max-w-[calc(100vw-4rem)]">
                <SnapshotsDialogContent pitchId={pitch.id} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {pitch.description && (
          <p className="text-sm text-muted-foreground max-w-screen-sm">
            {pitch.description}
          </p>
        )}
      </div>

      <PitchDashboard pitchId={pitch.id} />

      <div className="flex-1">
        <ActiveScopeList pitchId={pitchId} />
      </div>

      {archivedScopesCount > 0 && (
        <ArchiveCollapsible
          label={<>Archived scopes ({archivedScopesCount})</>}
        >
          <ArchivedScopeList pitchId={pitchId} />
        </ArchiveCollapsible>
      )}
    </div>
  )
}

function useUpdateMyCursor(divRef: MutableRefObject<HTMLDivElement | null>) {
  const updateMyPresence = useUpdateMyPresence()

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!divRef.current) return
    const bounds = divRef.current.getBoundingClientRect()
    const x = event.clientX - bounds.left + divRef.current.scrollLeft
    const y = event.clientY - bounds.top + divRef.current.scrollTop
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
          info: { name, username },
        }) => {
          if (!cursor) return null
          if (activePitchId !== pitchId) return

          return (
            <Cursor
              key={connectionId}
              x={cursor.x}
              y={cursor.y}
              name={name ?? username}
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
          }
        }}
      >
        {scopes.map((scope) => (
          <ScopeView key={scope.id} scope={scope} />
        ))}
      </DndContext>
    </>
  )
}

export function useCreateScopeMutation(pitchId: string) {
  const colorsWithUsage = useStorage((root) =>
    countBy(
      root.scopes
        .filter((scope) => scope.pitchId === pitchId && !scope.archived)
        .map((scope) => scope.color),
      (a) => a
    )
  )
  const colorsSortedByUsage = Object.entries(colorsWithUsage)
    .sort(([color1, count1], [color2, count2]) => count1 - count2)
    .map(([color]) => color)
  const firstAvailableColor =
    scopeColors.find((color) => !colorsSortedByUsage.includes(color)) ??
    colorsSortedByUsage[0]

  return useMutation(
    ({ storage }) => {
      storage.get('scopes').push(
        new LiveObject<Scope>({
          id: nanoid(),
          pitchId,
          title: 'New scope',
          color: firstAvailableColor as ScopeColor,
        })
      )
    },
    [pitchId, firstAvailableColor]
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
export const useArchiveScopeMutation =
  createUseChangeScopeArchivedMutation(true)
export const useRestoreScopeMutation =
  createUseChangeScopeArchivedMutation(false)

const ScopeView = forwardRef<
  HTMLDivElement,
  { scope: Scope; style?: CSSProperties }
>(({ scope, style }, forwardedRef) => {
  return (
    <div
      className="flex-1 flex flex-col gap-2 mt-4"
      style={style}
      ref={forwardedRef}
    >
      <div className="sticky w-fit left-0 group">
        <div className="flex gap-2">
          <div className="mt-1">
            <ScopeIcon scope={scope} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{scope.title}</span>
              <ScopeDropdownMenu scope={scope}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 opacity-10 group-hover:opacity-100"
                >
                  <Ellipsis className="size-4" />
                </Button>
              </ScopeDropdownMenu>
            </div>
            <p className="text-muted-foreground text-sm">
              {scope.description ||
                'If we only ship this scope, the user will be able to…'}
            </p>
          </div>
        </div>
      </div>
      <div>
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
  const createTask = useCreateTaskMutation(scopeId)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 border-2 border-dashed bg-slate-50 dark:bg-slate-900 ${droppableHoverClass1} ${droppableHoverClass2}`}
      style={{
        padding,
        width,
      }}
    >
      <div className="flex justify-between">
        <div className="text-xs uppercase text-muted-foreground">
          {match(status)
            .with('todo', () => 'To do')
            .with('in_progress', () => 'In progress')
            .with('done', () => 'Done')
            .exhaustive()}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 -m-1 text-muted-foreground"
          onClick={() => createTask(status)}
        >
          <Plus className="size-4" />
        </Button>
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
    ({ storage }, status: TaskStatus = 'todo') => {
      storage.get('tasks').push(
        new LiveObject({
          id: nanoid(),
          title: '',
          scopeId,
          status,
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
