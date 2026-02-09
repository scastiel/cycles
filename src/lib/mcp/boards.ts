import { z } from 'zod'
import { nanoid } from 'nanoid'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { liveblocks } from '@/lib/liveblocks'
import { getUserId, verifyOrgMembership, listUserOrgs, roomId } from './auth'
import { getStorage } from './storage'

export function registerBoardTools(server: McpServer) {
  server.tool(
    'list_organizations',
    'List organizations the authenticated user belongs to',
    {},
    async (_args, extra) => {
      const userId = getUserId(extra.authInfo)
      const orgs = await listUserOrgs(userId)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(orgs, null, 2),
          },
        ],
      }
    }
  )

  server.tool(
    'list_boards',
    'List all boards for an organization',
    {
      orgId: z.string().describe('Organization ID'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived boards (default: false)'),
    },
    async ({ orgId, includeArchived }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const { data: rooms } = await liveblocks.getRooms({
        query: `roomId^"${orgId}:"`,
      })

      const boards = rooms
        .filter((room) => includeArchived || !room.metadata.archived)
        .map((room) => ({
          slug: room.id.split(':')[1],
          title: room.metadata.title ?? 'Untitled',
          archived: Boolean(room.metadata.archived),
          createdOn: room.metadata.createdOn ?? null,
          createdBy: room.metadata.createdBy ?? null,
        }))

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(boards, null, 2),
          },
        ],
      }
    }
  )

  server.tool(
    'get_board',
    'Get board metadata along with all its pitches, scopes, and tasks',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
    },
    async ({ orgId, boardSlug }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const rid = roomId(orgId, boardSlug)
      const room = await liveblocks.getRoom(rid)
      const storage = await getStorage(rid)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                slug: boardSlug,
                title: room.metadata.title ?? 'Untitled',
                archived: Boolean(room.metadata.archived),
                pitches: storage.pitches ?? [],
                scopes: storage.scopes ?? [],
                tasks: storage.tasks ?? [],
              },
              null,
              2
            ),
          },
        ],
      }
    }
  )

  server.tool(
    'create_board',
    'Create a new board with a default pitch and scope',
    {
      orgId: z.string().describe('Organization ID'),
      title: z.string().describe('Board title'),
      slug: z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .min(5)
        .describe(
          'Board slug (lowercase letters, digits, dashes; min 5 characters)'
        ),
    },
    async ({ orgId, title, slug }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const rid = roomId(orgId, slug)

      // Check if room already exists
      try {
        await liveblocks.getRoom(rid)
        return {
          content: [
            {
              type: 'text',
              text: `Board with slug "${slug}" already exists`,
            },
          ],
          isError: true,
        }
      } catch {
        // Room doesn't exist, good to create
      }

      await liveblocks.createRoom(rid, {
        metadata: {
          title,
          createdOn: new Date().toISOString(),
          createdBy: userId,
        },
        defaultAccesses: ['room:write'],
      })

      const pitchId = nanoid()
      const scopeId = nanoid()
      await liveblocks.initializeStorageDocument(rid, {
        liveblocksType: 'LiveObject',
        data: {
          tasks: { liveblocksType: 'LiveList', data: [] },
          scopes: {
            liveblocksType: 'LiveList',
            data: [
              {
                liveblocksType: 'LiveObject',
                data: {
                  id: scopeId,
                  pitchId,
                  title: 'First scope',
                  color: 'color-2',
                  core: true,
                },
              },
            ],
          },
          pitches: {
            liveblocksType: 'LiveList',
            data: [
              {
                liveblocksType: 'LiveObject',
                data: { id: pitchId, title: 'First pitch' },
              },
            ],
          },
          info: {
            liveblocksType: 'LiveObject',
            data: { name: title },
          },
        },
      })

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { slug, title, pitchId, scopeId },
              null,
              2
            ),
          },
        ],
      }
    }
  )

  server.tool(
    'archive_board',
    'Archive a board',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
    },
    async ({ orgId, boardSlug }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const rid = roomId(orgId, boardSlug)
      await liveblocks.updateRoom(rid, { metadata: { archived: 'yes' } })

      return {
        content: [{ type: 'text', text: `Board "${boardSlug}" archived` }],
      }
    }
  )

  server.tool(
    'restore_board',
    'Restore an archived board',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
    },
    async ({ orgId, boardSlug }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const rid = roomId(orgId, boardSlug)
      await liveblocks.updateRoom(rid, { metadata: { archived: null } })

      return {
        content: [{ type: 'text', text: `Board "${boardSlug}" restored` }],
      }
    }
  )
}
