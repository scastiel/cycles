/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/.well-known/oauth-authorization-server',
        destination: '/api/well-known/oauth-authorization-server',
      },
      {
        source: '/.well-known/oauth-protected-resource/mcp',
        destination: '/api/well-known/oauth-protected-resource/mcp',
      },
    ]
  },
};

export default nextConfig;
