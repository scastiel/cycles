import { z } from 'zod'
import { nanoid } from 'nanoid'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getUserId, verifyOrgMembership, roomId } from './auth'
import { getStorage, getStorageLson, writeStorageLson } from './storage'
// Scope colors — must match liveblocks.config.ts
const scopeColors = [
  'color-1',
  'color-2',
  'color-3',
  'color-4',
  'color-5',
  'color-6',
  'color-7',
  'color-8',
] as const

export function registerScopeTools(server: McpServer) {
  server.tool(
    'list_scopes',
    'List scopes for a pitch',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
      pitchId: z.string().describe('Pitch ID'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived scopes (default: false)'),
    },
    async ({ orgId, boardSlug, pitchId, includeArchived }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const storage = await getStorage(roomId(orgId, boardSlug))
      const scopes = (storage.scopes as Record<string, unknown>[]) ?? []
      const filtered = scopes.filter(
        (s) => s.pitchId === pitchId && (includeArchived || !s.archived)
      )

      return {
        content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }],
      }
    }
  )

  server.tool(
    'create_scope',
    'Create a new scope in a pitch',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
      pitchId: z.string().describe('Pitch ID'),
      title: z.string().describe('Scope title'),
      description: z.string().optional().describe('Scope description'),
      color: z
        .enum(scopeColors)
        .optional()
        .describe(
          'Scope color (color-1 through color-8). Auto-assigned if omitted.'
        ),
    },
    async ({ orgId, boardSlug, pitchId, title, description, color }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const rid = roomId(orgId, boardSlug)
      const lson = await getStorageLson(rid)
      const root = lson.data as Record<string, unknown>
      const scopesList = root.scopes as { data: Array<{ data: Record<string, unknown> }> }

      // Auto-assign color if not provided
      const assignedColor =
        color ?? autoAssignColor(scopesList.data, pitchId)

      const id = nanoid()
      const scopeData: Record<string, unknown> = {
        id,
        pitchId,
        title,
        color: assignedColor,
        core: true,
      }
      if (description) scopeData.description = description

      scopesList.data.push({
        liveblocksType: 'LiveObject',
        data: scopeData,
      } as never)

      await writeStorageLson(rid, lson)

      return {
        content: [
          { type: 'text', text: JSON.stringify(scopeData, null, 2) },
        ],
      }
    }
  )

  server.tool(
    'update_scope',
    'Update scope fields',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
      scopeId: z.string().describe('Scope ID'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      color: z
        .enum(scopeColors)
        .optional()
        .describe('New color (color-1 through color-8)'),
      progress: z
        .number()
        .int()
        .min(0)
        .max(8)
        .optional()
        .describe(
          'Progress on the hill chart (0-8). 0-3: uphill/figuring out, 4: top of hill, 5-8: downhill/executing'
        ),
      effort: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Effort estimate (0 to 1)'),
      impact: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Impact estimate (0 to 1)'),
    },
    async (
      { orgId, boardSlug, scopeId, title, description, color, progress, effort, impact },
      extra
    ) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const rid = roomId(orgId, boardSlug)
      const lson = await getStorageLson(rid)
      const root = lson.data as Record<string, unknown>
      const scopesList = root.scopes as {
        data: Array<{ data: Record<string, unknown> }>
      }

      const scope = scopesList.data.find((s) => s.data.id === scopeId)
      if (!scope) {
        return {
          content: [{ type: 'text', text: `Scope "${scopeId}" not found` }],
          isError: true,
        }
      }

      if (title !== undefined) scope.data.title = title
      if (description !== undefined) scope.data.description = description
      if (color !== undefined) scope.data.color = color
      if (progress !== undefined) scope.data.progress = progress
      if (effort !== undefined) scope.data.effort = effort
      if (impact !== undefined) scope.data.impact = impact

      await writeStorageLson(rid, lson)

      return {
        content: [
          { type: 'text', text: JSON.stringify(scope.data, null, 2) },
        ],
      }
    }
  )

  server.tool(
    'archive_scope',
    'Archive a scope',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
      scopeId: z.string().describe('Scope ID'),
    },
    async ({ orgId, boardSlug, scopeId }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const rid = roomId(orgId, boardSlug)
      const lson = await getStorageLson(rid)
      const root = lson.data as Record<string, unknown>
      const scopesList = root.scopes as {
        data: Array<{ data: Record<string, unknown> }>
      }

      const scope = scopesList.data.find((s) => s.data.id === scopeId)
      if (!scope) {
        return {
          content: [{ type: 'text', text: `Scope "${scopeId}" not found` }],
          isError: true,
        }
      }

      scope.data.archived = true
      await writeStorageLson(rid, lson)

      return {
        content: [{ type: 'text', text: `Scope "${scopeId}" archived` }],
      }
    }
  )
}

/**
 * Auto-assign a scope color by picking the next unused color for the pitch.
 */
function autoAssignColor(
  existingScopes: Array<{ data: Record<string, unknown> }>,
  pitchId: string
): string {
  const usedColors = new Set(
    existingScopes
      .filter((s) => s.data.pitchId === pitchId && !s.data.archived)
      .map((s) => s.data.color)
  )

  for (const color of scopeColors) {
    if (!usedColors.has(color)) return color
  }

  // All colors used, cycle back
  return scopeColors[existingScopes.length % scopeColors.length]
}
