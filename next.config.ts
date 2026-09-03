import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  logging: {
    browserToTerminal: true,
  },
  experimental: {
    authInterrupts: true,
    turbopackRustReactCompiler: true,
    optimizePackageImports: ['@heroui/react'],
  },
  async headers() {
    return [
      {
        source: '/d/:id',
        headers: [
          {
            key: 'Accept-CH',
            value: 'Sec-CH-Viewport-Height',
          },
          {
            key: 'Critical-CH',
            value: 'Sec-CH-Viewport-Height',
          },
          {
            key: 'Permissions-Policy',
            value: 'ch-viewport-height=(self)',
          },
          {
            key: 'Vary',
            value: 'Sec-CH-Viewport-Height',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
