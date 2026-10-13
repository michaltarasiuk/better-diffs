import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {source: '/d/:shareId.patch', destination: '/api/shares/:shareId/patch'},
    ];
  },
  logging: {
    browserToTerminal: true,
  },
  experimental: {
    authInterrupts: true,
    turbopackRustReactCompiler: true,
    optimizePackageImports: ['@heroui/react'],
  },
};

export default nextConfig;
