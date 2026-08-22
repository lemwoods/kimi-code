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
      '@lcode-cli/agent-core',
      '@lcode-cli/lcode-sdk',
      '@lcode-cli/kosong',
      '@lcode-cli/kaos',
    ],
  },
});
