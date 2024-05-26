'use client'

import {
  archiveBoard,
  restoreBoard,
} from '@/app/boards/board-context-menu.actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Ellipsis } from 'lucide-react'
import { ReactNode } from 'react'

export function BoardContextMenu({
  roomId,
  archived,
  boardSettingsForm,
}: {
  roomId: string
  archived: boolean
  boardSettingsForm: ReactNode
}) {
  return (
    <Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="size-6">
            <Ellipsis className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DialogTrigger asChild>
            <DropdownMenuItem>Board settings…</DropdownMenuItem>
          </DialogTrigger>
          {archived ? (
            <DropdownMenuItem
              onClick={async () => {
                await restoreBoard(roomId)
              }}
            >
              Restore board
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="text-red-600"
              onClick={async () => {
                await archiveBoard(roomId)
              }}
            >
              Archive board
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogContent>{boardSettingsForm}</DialogContent>
    </Dialog>
  )
}
