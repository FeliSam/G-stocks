const isGitHubPages = process.env.NEXT_PUBLIC_GITHUB_PAGES === "true";
const basePath = isGitHubPages ? process.env.NEXT_PUBLIC_BASE_PATH || "/G-stocks" : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isGitHubPages ? "export" : undefined,
  trailingSlash: isGitHubPages ? true : false,
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@g-stock/config", "@g-stock/types", "@g-stock/ui", "@g-stock/validation"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

