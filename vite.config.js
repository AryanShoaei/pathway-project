import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes the build use relative asset paths, so it works on
// GitHub Pages project sites (https://user.github.io/REPO/) without
// needing to hardcode the repo name. Works for user/org pages too.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
