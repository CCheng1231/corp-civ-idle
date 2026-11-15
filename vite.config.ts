import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { googleAuthCallbackPlugin } from "./vite.plugins/googleAuthCallback";

export default defineConfig({
  plugins: [react(), googleAuthCallbackPlugin()],
  server: {
    watch: {
      // Native FS watchers on Windows often throw EBUSY (OneDrive path, Defender,
      // indexer, image preview). Polling avoids hard crashes from watcher errors.
      usePolling:
        typeof process !== "undefined" && process.platform === "win32",
      interval: 500,
      // Ignore duplicate asset drops (office 2.jpg, secretary - Copy.jpg, etc.).
      ignored: [
        "**/office ?*.*",
        "**/* Copy*",
        "**/*.xlsx",
      ],
    },
  },
});
