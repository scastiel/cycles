import {
  HoveredScopeContextProvider,
  PitchDashboardView,
} from '@/app/boards/[roomId]/hill-chart'
import { Button } from '@/components/ui/button'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useStorage,
  useMutation,
  PitchSnapshot,
  Scope,
} from '@/liveblocks.config'
import { LiveList, LiveObject } from '@liveblocks/client'
import { Ellipsis } from 'lucide-react'
import { nanoid } from 'nanoid'
import { format, isSameDay, isThisWeek, isToday, isYesterday } from 'date-fns'

export function SnapshotsDialogContent({ pitchId }: { pitchId: string }) {
  const scopes = useStorage((root) =>
    root.scopes.filter((scope) => scope.pitchId === pitchId && !scope.archived)
  )
  const createSnapshot = useMutation(({ storage }, snapshot: PitchSnapshot) => {
    const snapshotsLiveList = storage.get('pitchSnapshots')
    if (!snapshotsLiveList) storage.set('pitchSnapshots', new LiveList())
    storage.get('pitchSnapshots')!.push(new LiveObject(snapshot))
  }, [])

  const snapshots = useStorage(
    (root) =>
      root.pitchSnapshots
        ?.filter(
          (snapshot) => snapshot.pitchId === pitchId && !snapshot.archived
        )
        .sort((first, second) => second.date.localeCompare(first.date)) ?? []
  )

  const archiveSnapshot = useMutation(({ storage }, snapshotId: string) => {
    storage
      .get('pitchSnapshots')
      ?.find((snapshot) => snapshot.get('id') === snapshotId)
      ?.set('archived', true)
  }, [])

  return (
    <HoveredScopeContextProvider>
      <DialogHeader className="flex-0">
        <DialogTitle className="flex items-baseline gap-4">
          <span>Snapshots</span>
          <Button
            variant="link"
            onClick={() => {
              createSnapshot({
                id: nanoid(),
                pitchId: pitchId,
                date: new Date().toISOString(),
                scopes: scopes as Scope[],
              })
            }}
          >
            Create
          </Button>
        </DialogTitle>
      </DialogHeader>
      <div className="-mx-6 overflow-y-auto max-h-[calc(100dvh-10rem)]">
        <div className="flex flex-col gap-4 w-fit">
          {snapshots.map((snapshot) => (
            <div key={snapshot.id} className="flex flex-col gap-4">
              <div className="border-t border-b sticky top-0 bg-muted z-10 px-6 py-1">
                <h3 className="sticky left-0 w-fit font-semibold text-sm flex items-center gap-2">
                  <div>{formatDate(new Date(snapshot.date))}</div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-6">
                        <Ellipsis className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => archiveSnapshot(snapshot.id)}
                      >
                        Delete snapshot
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </h3>
              </div>
              <div className="px-6">
                <PitchDashboardView
                  disableEdit
                  pitchId={snapshot.pitchId}
                  scopes={snapshot.scopes}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </HoveredScopeContextProvider>
  )
}

function formatDate(date: Date) {
  const time = date.toLocaleTimeString('en-US', {
    timeStyle: 'short',
  })
  if (isToday(date)) {
    return `Today at ${time}`
  }
  if (isYesterday(date)) {
    return `Yesterday at ${time}`
  }
  if (isThisWeek(date)) {
    return `Last ${format(date, 'EEEE')} at ${time}`
  }
  return `${format(date, 'LLLL do')} at ${time}`
}
