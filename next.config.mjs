/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ipfs.io",
        port: "",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "arweave.net",
        port: "",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
