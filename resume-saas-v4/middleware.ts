import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized({ req, token }) {
      // Must be signed in for any protected route.
      if (!token) return false;

      // Defense in depth: /admin requires an ADMIN token at the edge.
      // (The admin layout and every /api/admin route additionally verify
      // the role against the database, so a stale token can't help.)
      if (req.nextUrl.pathname.startsWith("/admin")) {
        return token.role === "ADMIN";
      }

      return true;
    },
  },
  pages: {
    signIn: "/login", // Redirect here if not authenticated / not authorized
  },
});

export const config = {
  // Protects /dashboard, /admin and any sub-routes
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
