/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Disabled for API routes support
  experimental: {
    optimizeCss: false,
  },
}

module.exports = nextConfig
