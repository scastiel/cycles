import { z } from 'zod'
import { nanoid } from 'nanoid'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getUserId, verifyOrgMembership, roomId } from './auth'
import { getStorage, getStorageLson, writeStorageLson } from './storage'

export function registerPitchTools(server: McpServer) {
  server.tool(
    'list_pitches',
    'List pitches in a board',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived pitches (default: false)'),
    },
    async ({ orgId, boardSlug, includeArchived }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const storage = await getStorage(roomId(orgId, boardSlug))
      const pitches = (storage.pitches as Record<string, unknown>[]) ?? []
      const filtered = pitches.filter(
        (p) => includeArchived || !p.archived
      )

      return {
        content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }],
      }
    }
  )

  server.tool(
    'get_pitch',
    'Get a pitch with its scopes and tasks',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
      pitchId: z.string().describe('Pitch ID'),
    },
    async ({ orgId, boardSlug, pitchId }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const storage = await getStorage(roomId(orgId, boardSlug))
      const pitches = (storage.pitches as Record<string, unknown>[]) ?? []
      const scopes = (storage.scopes as Record<string, unknown>[]) ?? []
      const tasks = (storage.tasks as Record<string, unknown>[]) ?? []

      const pitch = pitches.find((p) => p.id === pitchId)
      if (!pitch) {
        return {
          content: [{ type: 'text', text: `Pitch "${pitchId}" not found` }],
          isError: true,
        }
      }

      const pitchScopes = scopes.filter((s) => s.pitchId === pitchId)
      const scopeIds = new Set(pitchScopes.map((s) => s.id))
      const pitchTasks = tasks.filter((t) => scopeIds.has(t.scopeId as string))

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { ...pitch, scopes: pitchScopes, tasks: pitchTasks },
              null,
              2
            ),
          },
        ],
      }
    }
  )

  server.tool(
    'create_pitch',
    'Create a new pitch in a board',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
      title: z.string().describe('Pitch title'),
      description: z.string().optional().describe('Pitch description'),
      link: z.string().optional().describe('External link URL'),
    },
    async ({ orgId, boardSlug, title, description, link }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const rid = roomId(orgId, boardSlug)
      const lson = await getStorageLson(rid)
      const root = lson.data as Record<string, unknown>
      const pitchesList = root.pitches as { data: unknown[] }

      const id = nanoid()
      const pitchData: Record<string, unknown> = { id, title }
      if (description) pitchData.description = description
      if (link) pitchData.link = link

      pitchesList.data.push({
        liveblocksType: 'LiveObject',
        data: pitchData,
      })

      await writeStorageLson(rid, lson)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ id, title, description, link }, null, 2),
          },
        ],
      }
    }
  )

  server.tool(
    'update_pitch',
    'Update pitch fields',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
      pitchId: z.string().describe('Pitch ID'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      link: z.string().optional().describe('New link URL'),
    },
    async ({ orgId, boardSlug, pitchId, title, description, link }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const rid = roomId(orgId, boardSlug)
      const lson = await getStorageLson(rid)
      const root = lson.data as Record<string, unknown>
      const pitchesList = root.pitches as {
        data: Array<{ data: Record<string, unknown> }>
      }

      const pitch = pitchesList.data.find((p) => p.data.id === pitchId)
      if (!pitch) {
        return {
          content: [{ type: 'text', text: `Pitch "${pitchId}" not found` }],
          isError: true,
        }
      }

      if (title !== undefined) pitch.data.title = title
      if (description !== undefined) pitch.data.description = description
      if (link !== undefined) pitch.data.link = link

      await writeStorageLson(rid, lson)

      return {
        content: [
          { type: 'text', text: JSON.stringify(pitch.data, null, 2) },
        ],
      }
    }
  )

  server.tool(
    'archive_pitch',
    'Archive a pitch',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
      pitchId: z.string().describe('Pitch ID'),
    },
    async ({ orgId, boardSlug, pitchId }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const rid = roomId(orgId, boardSlug)
      const lson = await getStorageLson(rid)
      const root = lson.data as Record<string, unknown>
      const pitchesList = root.pitches as {
        data: Array<{ data: Record<string, unknown> }>
      }

      const pitch = pitchesList.data.find((p) => p.data.id === pitchId)
      if (!pitch) {
        return {
          content: [{ type: 'text', text: `Pitch "${pitchId}" not found` }],
          isError: true,
        }
      }

      pitch.data.archived = true
      await writeStorageLson(rid, lson)

      return {
        content: [{ type: 'text', text: `Pitch "${pitchId}" archived` }],
      }
    }
  )
}
