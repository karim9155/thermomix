/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    // Next 16 blocks image optimization when a host resolves to a "private" IP.
    // Our router advertises a NAT64 gateway, so supabase.co also resolves via the
    // 64:ff9b::/96 prefix (RFC 6052) — those wrap the public Cloudflare addresses
    // 104.18.38.10 / 172.64.149.246, but the check reads them as internal.
    // Dev-only: production keeps the strict SSRF guard. remotePatterns below still
    // limits fetches to the one Supabase host and its public storage path.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === 'development',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'aayubxjoyvqcyxzoshrx.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
