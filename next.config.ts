import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        // Your CloudFront distribution in front of the S3 images bucket.
        // Replace XXXXXXXXXXXX with your actual CloudFront distribution ID.
        // e.g. https://d1abc2def3gh4i.cloudfront.net/images/salmon-aburi.jpg
        protocol: 'https',
        hostname: '*.cloudfront.net',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
