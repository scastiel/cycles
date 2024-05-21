import { Scope, ScopeColor } from '@/liveblocks.config'
import { Circle, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { match } from 'ts-pattern'

export function ScopeIcon({ scope }: { scope: Scope }) {
  const Icon = scope.core ? Star : Circle
  return <Icon className={cn('size-4', getScopeColorClasses(scope.color))} />
}

export function getScopeColorClasses(color?: ScopeColor): string {
  return match(color)
    .with('color-1', () => 'fill-blue-300 stroke-blue-300')
    .with('color-2', () => 'fill-yellow-300 stroke-yellow-300')
    .with('color-3', () => 'fill-red-300 stroke-red-300')
    .with('color-4', () => 'fill-green-300 stroke-green-300')
    .with('color-5', () => 'fill-orange-300 stroke-orange-300')
    .with('color-6', () => 'fill-pink-300 stroke-pink-300')
    .with('color-7', () => 'fill-indigo-300 stroke-indigo-300')
    .with('color-8', () => 'fill-slate-300 stroke-slate-300')
    .otherwise(() => 'fill-gray-300 stroke-gray-300')
}
