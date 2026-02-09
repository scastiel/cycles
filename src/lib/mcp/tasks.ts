import { z } from 'zod'
import { nanoid } from 'nanoid'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getUserId, verifyOrgMembership, roomId } from './auth'
import { getStorage, getStorageLson, writeStorageLson } from './storage'

const taskStatusEnum = z.enum(['todo', 'in_progress', 'done'])
const taskTypeEnum = z.enum(['task', 'optional', 'bug', 'question'])

export function registerTaskTools(server: McpServer) {
  server.tool(
    'list_tasks',
    'List tasks in a scope',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
      scopeId: z.string().describe('Scope ID'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived tasks (default: false)'),
    },
    async ({ orgId, boardSlug, scopeId, includeArchived }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const storage = await getStorage(roomId(orgId, boardSlug))
      const tasks = (storage.tasks as Record<string, unknown>[]) ?? []
      const filtered = tasks.filter(
        (t) => t.scopeId === scopeId && (includeArchived || !t.archived)
      )

      return {
        content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }],
      }
    }
  )

  server.tool(
    'create_task',
    'Create a task in a scope',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
      scopeId: z.string().describe('Scope ID'),
      title: z.string().describe('Task title'),
      status: taskStatusEnum.optional().describe('Task status (default: todo)'),
      type: taskTypeEnum.optional().describe('Task type (default: task)'),
      assignee: z.string().optional().describe('Assignee user ID'),
    },
    async ({ orgId, boardSlug, scopeId, title, status, type, assignee }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const rid = roomId(orgId, boardSlug)
      const lson = await getStorageLson(rid)
      const root = lson.data as Record<string, unknown>
      const tasksList = root.tasks as { data: unknown[] }

      const id = nanoid()
      const taskData: Record<string, unknown> = {
        id,
        scopeId,
        title,
        status: status ?? 'todo',
      }
      if (type) taskData.type = type
      if (assignee) taskData.assignee = assignee

      tasksList.data.push({
        liveblocksType: 'LiveObject',
        data: taskData,
      })

      await writeStorageLson(rid, lson)

      return {
        content: [
          { type: 'text', text: JSON.stringify(taskData, null, 2) },
        ],
      }
    }
  )

  server.tool(
    'update_task',
    'Update task fields',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
      taskId: z.string().describe('Task ID'),
      title: z.string().optional().describe('New title'),
      status: taskStatusEnum.optional().describe('New status'),
      type: taskTypeEnum.optional().describe('New type'),
      assignee: z.string().optional().describe('New assignee user ID'),
      scopeId: z.string().optional().describe('Move to a different scope'),
    },
    async (
      { orgId, boardSlug, taskId, title, status, type, assignee, scopeId },
      extra
    ) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const rid = roomId(orgId, boardSlug)
      const lson = await getStorageLson(rid)
      const root = lson.data as Record<string, unknown>
      const tasksList = root.tasks as {
        data: Array<{ data: Record<string, unknown> }>
      }

      const task = tasksList.data.find((t) => t.data.id === taskId)
      if (!task) {
        return {
          content: [{ type: 'text', text: `Task "${taskId}" not found` }],
          isError: true,
        }
      }

      if (title !== undefined) task.data.title = title
      if (status !== undefined) task.data.status = status
      if (type !== undefined) task.data.type = type
      if (assignee !== undefined) task.data.assignee = assignee
      if (scopeId !== undefined) task.data.scopeId = scopeId

      await writeStorageLson(rid, lson)

      return {
        content: [
          { type: 'text', text: JSON.stringify(task.data, null, 2) },
        ],
      }
    }
  )

  server.tool(
    'archive_task',
    'Archive a task',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
      taskId: z.string().describe('Task ID'),
    },
    async ({ orgId, boardSlug, taskId }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const rid = roomId(orgId, boardSlug)
      const lson = await getStorageLson(rid)
      const root = lson.data as Record<string, unknown>
      const tasksList = root.tasks as {
        data: Array<{ data: Record<string, unknown> }>
      }

      const task = tasksList.data.find((t) => t.data.id === taskId)
      if (!task) {
        return {
          content: [{ type: 'text', text: `Task "${taskId}" not found` }],
          isError: true,
        }
      }

      task.data.archived = true
      await writeStorageLson(rid, lson)

      return {
        content: [{ type: 'text', text: `Task "${taskId}" archived` }],
      }
    }
  )

  server.tool(
    'bulk_create_tasks',
    'Create multiple tasks at once in a scope',
    {
      orgId: z.string().describe('Organization ID'),
      boardSlug: z.string().describe('Board slug'),
      scopeId: z.string().describe('Scope ID'),
      tasks: z
        .array(
          z.object({
            title: z.string().describe('Task title'),
            status: taskStatusEnum
              .optional()
              .describe('Task status (default: todo)'),
            type: taskTypeEnum.optional().describe('Task type (default: task)'),
            assignee: z.string().optional().describe('Assignee user ID'),
          })
        )
        .describe('Array of tasks to create'),
    },
    async ({ orgId, boardSlug, scopeId, tasks }, extra) => {
      const userId = getUserId(extra.authInfo)
      await verifyOrgMembership(userId, orgId)

      const rid = roomId(orgId, boardSlug)
      const lson = await getStorageLson(rid)
      const root = lson.data as Record<string, unknown>
      const tasksList = root.tasks as { data: unknown[] }

      const created: Record<string, unknown>[] = []

      for (const t of tasks) {
        const id = nanoid()
        const taskData: Record<string, unknown> = {
          id,
          scopeId,
          title: t.title,
          status: t.status ?? 'todo',
        }
        if (t.type) taskData.type = t.type
        if (t.assignee) taskData.assignee = t.assignee

        tasksList.data.push({
          liveblocksType: 'LiveObject',
          data: taskData,
        })
        created.push(taskData)
      }

      await writeStorageLson(rid, lson)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { created: created.length, tasks: created },
              null,
              2
            ),
          },
        ],
      }
    }
  )
}
