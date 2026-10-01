import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	async rewrites() {
		const apiOrigin = process.env.API_ORIGIN?.trim().replace(/\/+$/, "");
		return apiOrigin ? [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }] : [];
	},
};

export default nextConfig;