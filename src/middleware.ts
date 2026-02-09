import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/.well-known/(.*)',
  '/api/well-known/(.*)',
])

const isMcpRoute = createRouteMatcher(['/mcp/(.*)'])

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export default function middleware(req: NextRequest) {
  // MCP routes handle their own OAuth auth via @vercel/mcp-adapter —
  // skip Clerk middleware which would reject OAuth bearer tokens
  if (isMcpRoute(req)) {
    return NextResponse.next()
  }

  return clerkHandler(req, {} as never)
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)', '/mcp/(.*)'],
}
