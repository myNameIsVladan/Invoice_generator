export function getAppUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set")
  }
  return url.replace(/\/$/, "")
}

export function isSafeConfirmNext(next: string | null | undefined) {
  if (!next) {
    return false
  }
  return next.startsWith("/auth/confirm")
}
