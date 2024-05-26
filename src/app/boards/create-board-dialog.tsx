'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { PropsWithChildren } from 'react'

export function CreateBoardDialog({
  children,
}: PropsWithChildren<{ roomPrefix: string }>) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">Create board</Button>
      </DialogTrigger>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  )
}
