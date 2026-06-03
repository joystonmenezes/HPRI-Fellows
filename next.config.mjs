/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint is run separately via `npm run lint`; don't fail production builds on it.
    ignoreDuringBuilds: true,
  },
  // Keep nodemailer external so Next does not try to bundle its dynamic requires.
  experimental: {
    serverComponentsExternalPackages: ["nodemailer"],
  },
};

export default nextConfig;
