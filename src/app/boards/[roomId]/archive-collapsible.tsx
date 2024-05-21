'use client'
import { PropsWithChildren, ReactNode, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

export function ArchiveCollapsible({
  label,
  children,
}: PropsWithChildren<{ label: ReactNode }>) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="sticky left-0">
        <h3 className="flex items-center gap-2 text-sm font-semibold w-fit">
          <ChevronRight
            className={cn('size-4 transition-transform', isOpen && 'rotate-90')}
          />
          <span className="flex-1">{label}</span>
        </h3>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  )
}
