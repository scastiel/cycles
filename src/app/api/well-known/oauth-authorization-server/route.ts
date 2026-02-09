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

export async function GET() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  if (!publishableKey) {
    return new Response(
      JSON.stringify({ error: 'Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const fapiUrl = deriveFapiUrl(publishableKey)
    const res = await fetch(
      `${fapiUrl}/.well-known/oauth-authorization-server`,
      { cache: 'no-store' }
    )
    const metadata = await res.json()

    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=3600',
        ...corsHeaders,
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders })
}
