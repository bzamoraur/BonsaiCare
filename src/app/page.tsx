import { redirect } from "next/navigation";

/**
 * The app has no marketing landing — the root just enters the shell. The proxy
 * (src/proxy.ts) bounces unauthenticated visitors to /login before this renders.
 */
export default function Home() {
  redirect("/today");
}
