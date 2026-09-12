
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No anunciar el stack en cada respuesta (SB-10 / F6-07): por defecto Next añade
  // `X-Powered-By: Next.js`, que es reconocimiento gratis para un atacante (le dice
  // qué tecnología y qué vulnerabilidades buscar). Quitarla no cierra ningún
  // agujero, es endurecimiento por defensa en profundidad.
  poweredByHeader: false,
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
        // ejecución (decisión D8.2 / SB-02).
        //
        // LA CSP TAMPOCO VA AQUÍ (SB-03): lleva un nonce por petición y una
        // cabecera estática no puede. La emite el middleware (src/middleware.ts →
        // buildCsp). Estas cabeceras que quedan son valores estáticos, sin
        // process.env: congelarlas es inocuo, y cubren TODAS las rutas —incluidos
        // los estáticos que el matcher del middleware excluye—.
        source: '/:path*',
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
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
