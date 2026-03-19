/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['sheryjs', 'three', 'gsap', 'controlkit'],
  turbopack: {
    rules: {
      '*.glsl': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.glsl$/,
      use: 'raw-loader'
    });
    return config;
  }
};

export default nextConfig;
