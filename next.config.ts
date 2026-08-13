import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  reactCompiler: true,
  typedRoutes: true,
  logging: {
    browserToTerminal: true,
  },
  experimental: {
    turbopackRustReactCompiler: true,
    optimizePackageImports: ['@heroui/react', '@pierre/diffs'],
  },
};

export default nextConfig;
