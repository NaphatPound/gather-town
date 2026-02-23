import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  server: {
    port: 3000,
    host: true, // Expose to LAN so other devices can connect
    https: true, // Use HTTPS (required for getUserMedia on non-localhost)
  },
});
