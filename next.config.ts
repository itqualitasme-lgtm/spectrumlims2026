import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "qrcode", "pdf-to-img", "pdfjs-dist", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/*": ["./node_modules/pdfjs-dist/standard_fonts/**/*", "./node_modules/pdfjs-dist/cmaps/**/*"],
  },
};

export default nextConfig;
