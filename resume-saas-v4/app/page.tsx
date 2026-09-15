import { redirect } from "next/navigation";

// The app has no public home page, so visitors go straight to sign in. A server
// redirect answers with a real redirect instead of an empty page.
export default function Home() {
  redirect("/login");
}
