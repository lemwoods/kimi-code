import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { server: 'src/index.ts' },
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  external: ['@lcode-cli/agent-core', '@lcode-cli/kosong', '@lcode-cli/kaos'],
});
