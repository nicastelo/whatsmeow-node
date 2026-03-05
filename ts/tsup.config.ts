import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: false,
  shims: true, // provides import.meta.url shim for CJS
});
