import { ArchiveCollapsible } from '@/app/boards/[roomId]/archive-collapsible'
import { BoardContextMenu } from '@/app/boards/board-context-menu'
import { CreateBoardDialog } from '@/app/boards/create-board-dialog'
import { OrganizationSelector } from '@/app/boards/organization-selector'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { liveblocks } from '@/lib/liveblocks'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { RoomInfo } from '@liveblocks/node'
import { groupBy } from 'lodash'
import { Ellipsis } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function OrganizationsPage() {
  const { userId, orgId } = auth()
  if (!userId) return auth().redirectToSignIn()

  const roomPrefix = orgId ?? userId
  const { data: rooms } = await liveblocks.getRooms({
    query: `roomId^"${roomPrefix}:"`,
  })

  const { active: activeRooms, archived: archivedRooms } = groupBy(
    rooms,
    (room) => (room.metadata.archived ? 'archived' : 'active')
  )

  return (
    <main className="mt-16 w-full max-w-screen-md mx-auto">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="font-bold">Boards</h1>
        <CreateBoardButton roomPrefix={roomPrefix} />
      </div>
      {!activeRooms && (
        <div className="flex items-center justify-center border p-2 rounded-lg text-sm text-muted-foreground text-center h-40">
          There is not board yet.
        </div>
      )}
      {activeRooms && (
        <ul className="border p-2 rounded-lg">
          {activeRooms.map((room) => (
            <BoardListItem key={room.id} room={room} />
          ))}
        </ul>
      )}
      {archivedRooms && (
        <div className="mt-8">
          <ArchiveCollapsible
            label={<>Archived boards ({archivedRooms.length})</>}
          >
            <ul className="border p-2 rounded-lg">
              {archivedRooms.map((room) => (
                <BoardListItem key={room.id} room={room} />
              ))}
            </ul>
          </ArchiveCollapsible>
        </div>
      )}
    </main>
  )
}

function CreateBoardButton({ roomPrefix }: { roomPrefix: string }) {
  return (
    <CreateBoardDialog roomPrefix={roomPrefix}>
      <form className="flex flex-col gap-4" action={createRoom}>
        <DialogHeader>
          <DialogTitle>Create a new board</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-2">
            <Label htmlFor="title">Board title</Label>
            <Input
              type="text"
              placeholder="My awesome board"
              id="title"
              name="title"
              required
            />
          </section>
          <section className="flex flex-col gap-2">
            <Label htmlFor="title">Slug</Label>
            <Input
              type="text"
              placeholder="my-awesome-board"
              id="slug"
              name="slug"
              required
              minLength={5}
            />
          </section>
        </div>

        <DialogFooter>
          <Button type="submit">Create</Button>
        </DialogFooter>
      </form>
    </CreateBoardDialog>
  )
}

async function BoardListItem({ room }: { room: RoomInfo }) {
  const slug = room.id.split(':')[1]
  const createdOn = room.metadata.createdOn
    ? new Date(String(room.metadata.createdOn))
    : null
  const createdByUser = room.metadata.createdBy
    ? await clerkClient.users.getUser(String(room.metadata.createdBy))
    : null

  return (
    <div className="p-2 hover:bg-muted flex gap-1">
      <div className="flex flex-col gap-1 flex-1">
        <Link href={`/boards/${slug}`} className="text-sm font-semibold">
          {room.metadata.title ?? 'No title'}
        </Link>
        <div className="text-muted-foreground text-xs">
          Created on{' '}
          {createdOn?.toLocaleString('en-US', { dateStyle: 'long' }) ??
            'unknown'}{' '}
          by {createdByUser?.fullName ?? 'unknown'}
        </div>
      </div>
      <BoardContextMenu
        roomId={room.id}
        archived={Boolean(room.metadata.archived)}
        boardSettingsForm={
          <form className="flex flex-col gap-4" action={updateBoard}>
            <input type="hidden" name="roomId" value={room.id} />
            <DialogHeader>
              <DialogTitle>Board settings</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <section className="flex flex-col gap-2">
                <Label htmlFor="title">Board title</Label>
                <Input
                  name="title"
                  id="title"
                  defaultValue={room.metadata.title}
                  required
                />
              </section>
              <section className="flex flex-col">
                <Label htmlFor="slug" className="mb-2">
                  Slug
                </Label>
                <Input
                  name="slug"
                  id="slug"
                  defaultValue={slug}
                  required
                  minLength={5}
                />
                <p>
                  <small>
                    Warning: changing the board slug will change its URL.
                  </small>
                </p>
              </section>
              <section className="flex flex-col">
                <Label htmlFor="orgId" className="mb-2">
                  Organization
                </Label>
                <OrganizationSelector />
              </section>
            </div>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        }
      />
    </div>
  )
}

async function updateBoard(formData: FormData) {
  'use server'

  const { userId, orgId } = auth()
  if (!userId) throw new Error('Not authenticated')

  const roomId = formData.get('roomId')
  const title = String(formData.get('title'))
  const slug = formData.get('slug')
  const boardOrgId = formData.get('orgId')

  if (!roomId || !String(roomId).startsWith(`${orgId ?? userId}:`)) {
    throw new Error('Unauthorized')
  }

  const room = await liveblocks.getRoom(String(roomId))

  if (title !== room.metadata.title) {
    await liveblocks.updateRoom(String(roomId), {
      metadata: {
        createdBy: userId,
        createdOn: new Date().toISOString(),
        ...room.metadata,
        title,
      },
    })
  }

  const newRoomId = `${boardOrgId}:${slug}`
  if (newRoomId !== roomId) {
    await liveblocks.updateRoomId({
      currentRoomId: String(roomId),
      newRoomId: `${boardOrgId}:${slug}`,
    })
  }

  redirect('/boards')
}

async function createRoom(formData: FormData) {
  'use server'

  const { userId, orgId } = auth()
  if (!userId) throw new Error('Not authenticated')

  const roomPrefix = orgId ?? userId

  const slug = formData.get('slug')
  const title = String(formData.get('title') ?? 'New board')

  if (!slug) throw new Error('No slug')

  const roomId = `${roomPrefix}:${slug}`

  if (!(await roomExists(roomId))) {
    await liveblocks.createRoom(`${roomPrefix}:${slug}`, {
      metadata: {
        title,
        createdOn: new Date().toISOString(),
        createdBy: userId,
      },
      defaultAccesses: ['room:write'],
    })
  }

  redirect(`/boards/${slug}`)
}

async function roomExists(roomId: string) {
  try {
    await liveblocks.getRoom(roomId)
    return true
  } catch {
    return false
  }
}
