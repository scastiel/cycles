import { createMcpHandler, withMcpAuth } from '@vercel/mcp-adapter'
import { createClerkClient } from '@clerk/backend'
import { registerBoardTools } from '@/lib/mcp/boards'
import { registerPitchTools } from '@/lib/mcp/pitches'
import { registerScopeTools } from '@/lib/mcp/scopes'
import { registerTaskTools } from '@/lib/mcp/tasks'

const handler = createMcpHandler(
  (server) => {
    registerBoardTools(server)
    registerPitchTools(server)
    registerScopeTools(server)
    registerTaskTools(server)
  },
  {
    serverInfo: {
      name: 'Cycles MCP Server',
      version: '1.0.0',
    },
  },
  {
    basePath: '/mcp',
  }
)

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
})

const authHandler = withMcpAuth(
  handler,
  async (req, token) => {
    if (!token) return undefined

    try {
      const result = await clerk.authenticateRequest(req, {
        acceptsToken: 'oauth_token',
      })
      const authObject = result.toAuth()
      if (!authObject || !authObject.userId) return undefined

      return {
        token,
        clientId: ('clientId' in authObject ? authObject.clientId : null) ?? 'unknown',
        scopes: ('scopes' in authObject ? authObject.scopes : null) ?? [],
        extra: { userId: authObject.userId },
      }
    } catch (e) {
      console.error('[MCP Auth] error:', e)
      return undefined
    }
  },
  {
    required: true,
    resourceMetadataPath: '/.well-known/oauth-protected-resource/mcp',
  }
)

export { authHandler as GET, authHandler as POST, authHandler as DELETE }
