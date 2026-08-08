// Shared by redeem-edit-code and update-edit-code - the code is never stored
// in plaintext, only its SHA-256 hex digest, using Deno's built-in Web Crypto
// (no extra dependency needed).
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
