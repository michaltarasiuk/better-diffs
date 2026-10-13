import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  poweredByHeader: false,
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
