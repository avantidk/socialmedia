// Static export so GitHub Pages can host it at https://<user>.github.io/socialmedia/
/** @type {import('next').NextConfig} */
export default {
  output: "export",
  basePath: "/socialmedia",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};
