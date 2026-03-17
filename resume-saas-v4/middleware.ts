import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login", // Redirect here if not authenticated
  },
});

export const config = {
  // Protects /dashboard and any sub-routes (e.g., /dashboard/settings)
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};