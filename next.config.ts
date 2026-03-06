import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "qrcode", "pdf-to-img", "pdfjs-dist"],
};

export default nextConfig;
