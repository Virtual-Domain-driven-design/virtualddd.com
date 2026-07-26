/** A short plain-text preview drawn from a markdown body.
 *
 * Used for card previews and (from Phase 6) as the meta-description fallback
 * when Notion carries no `SEO Metadescription`.
 */
export function excerpt(md: string, fallback = '', max = 190): string {
  let text = (md ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*#{1,6}\s+.*$/gm, ' ')
    .replace(/[#>*_`~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) text = fallback;
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}
