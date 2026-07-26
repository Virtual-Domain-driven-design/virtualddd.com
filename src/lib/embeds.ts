/** Video embed URLs.
 *
 * Notion stores whatever URL the organiser pasted — a watch link, a youtu.be
 * short link, a `/live/` premiere URL or an already-built embed URL. Everything
 * renders through the nocookie host.
 */

/** Normalise any YouTube URL to a `youtube-nocookie.com` embed URL. */
export function youtubeEmbed(url?: string): string | null {
  if (!url) return null;
  let m: RegExpMatchArray | null;
  let id: string | undefined;
  if ((m = url.match(/youtube\.com\/embed\/([^?/&]+)/))) id = m[1];
  else if ((m = url.match(/youtu\.be\/([^?/&]+)/))) id = m[1];
  else if ((m = url.match(/youtube\.com\/live\/([^?/&]+)/))) id = m[1];
  else if ((m = url.match(/[?&]v=([^&]+)/))) id = m[1];
  if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
  // Last resort: an embed URL on some other host is passed through untouched.
  return url.includes('/embed/') ? url : null;
}
