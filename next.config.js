
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['sequelize'],
  turbopack: {
    // Configure Turbopack here if needed
  },
  async rewrites() {
    return {
      // Se ejecutan tras comprobar archivos/páginas: las URLs antiguas
      // /uploads/<archivo> guardadas en la BD se sirven por el endpoint API,
      // que lee del disco persistente (y de public/uploads como respaldo).
      afterFiles: [
        { source: '/uploads/:file', destination: '/api/uploads/:file' },
      ],
    };
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/:path*',
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          // Be more specific in production and use an environment variable
          { key: "Access-Control-Allow-Origin", value: process.env.ALLOWED_ORIGIN || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // A basic Content-Security-Policy. You might need to adjust this based on your specific needs.
          { key: "Content-Security-Policy", value: "default-src 'self'; connect-src 'self' https://api.emailjs.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; object-src 'none'; frame-ancestors 'none';" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude sequelize from the client-side bundle
      config.externals.push('sequelize');
    }
    return config;
  },
};

module.exports = nextConfig;
