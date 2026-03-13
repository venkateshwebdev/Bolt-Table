import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    '@tanstack/react-virtual',
    '@dnd-kit/core',
    '@dnd-kit/sortable',
    'lucide-react',
  ],
});