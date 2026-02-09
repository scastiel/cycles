const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
}

function deriveFapiUrl(publishableKey: string) {
  const key = publishableKey.replace(/^pk_(test|live)_/, '')
  const decoded = Buffer.from(key, 'base64').toString('utf8')
  return `https://${decoded.replace(/\$/, '')}`
}

export function GET(req: Request) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  if (!publishableKey) {
    return new Response(
      JSON.stringify({ error: 'Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const origin = new URL(req.url).origin
  const fapiUrl = deriveFapiUrl(publishableKey)

  const metadata = {
    resource: origin,
    authorization_servers: [fapiUrl],
    token_types_supported: ['Bearer'],
    scopes_supported: ['profile', 'email'],
    bearer_methods_supported: ['header'],
  }

  return new Response(JSON.stringify(metadata), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=3600',
      ...corsHeaders,
    },
  })
}

export function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders })
}
