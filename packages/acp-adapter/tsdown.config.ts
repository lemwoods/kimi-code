import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['esm'],
  dts: true,
  outDir: 'dist',
  clean: true,
  deps: {
    neverBundle: [
      '@agentclientprotocol/sdk',
      '@lemwood/agent-core',
      '@lemwood/lcode-sdk',
      '@lemwood/kosong',
      '@lemwood/kaos',
    ],
  },
});
