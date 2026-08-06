
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
        //
        // AQUÍ NO VAN CABECERAS CORS (D1, plan 08). Este fichero se evalúa durante
        // `next build` y su resultado se SERIALIZA en .next/routes-manifest.json:
        // cualquier `process.env.*` leído aquí queda congelado con el valor del
        // momento del build, no del despliegue. Así se sirvió durante meses
        // `Access-Control-Allow-Origin: *` junto a Allow-Credentials: true (F2-04)
        // aunque ALLOWED_ORIGIN estuviera bien puesta en el servidor. La fuente
        // ÚNICA de CORS es src/middleware/security.ts, que lee ALLOWED_ORIGIN en
        // ejecución (decisión D8.2 / SB-02). Las cabeceras que quedan abajo son
        // valores estáticos, sin process.env: congelarlas es inocuo.
        source: '/:path*',
        headers: [
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
