import { defineConfig } from 'tsdown';

import { rawTextPlugin } from '../../build/raw-text-plugin.mjs';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['esm'],
  dts: true,
  outDir: 'dist',
  clean: true,
  plugins: [rawTextPlugin()],
  deps: {
    alwaysBundle: ['picomatch'],
    neverBundle: [
      '@lcode-cli/kosong',
      '@lcode-cli/kaos',
      '@lcode-cli/lcode-oauth',
    ],
  },
});
