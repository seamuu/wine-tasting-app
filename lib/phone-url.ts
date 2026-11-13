import { networkInterfaces } from "node:os";
import { headers } from "next/headers";

/** A phone cannot use the laptop's localhost address. Prefer its Wi-Fi LAN IP. */
export async function phoneScannerUrl(eventId: string, position: string) {
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") === "https" ? "https" : "http";
  const url = new URL(`/t/${eventId}/scan`, `${protocol}://${requestHeaders.get("host") ?? "localhost:3000"}`);
  url.searchParams.set("wine", position);
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    const local = Object.entries(networkInterfaces())
      .sort(([a], [b]) => Number(!a.startsWith("en")) - Number(!b.startsWith("en")))
      .flatMap(([, addresses]) => addresses ?? [])
      .find(address => address.family === "IPv4" && !address.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address.address));
    if (local) url.hostname = local.address;
  }
  return url.href;
}
