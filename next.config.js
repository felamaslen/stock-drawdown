/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.module.rules.push({
      test: /\.js$/,
      loader: "ify-loader",
    });
    return config;
  },
};

module.exports = nextConfig;
