/**
 * Which commit this deployment was built from, so a post-deploy check can wait until the merged commit is the one being served.
 * Behind the same site password as every other route (src/proxy.ts); it exposes nothing else.
 */
export function GET(): Response {
  return Response.json(
    { commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
