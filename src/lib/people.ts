/** Matching people across collections.
 *
 * People are modelled two ways in Notion (see docs/content-model.md): Sessions
 * use an
 * `Organiser` relation to the people database, while Stories and Heuristics
 * store `Authors` as a free-text multi-select. So the same person appears as
 * "Kenny Baas-Schwegler" on a session and "Kenny Schwegler" on a story.
 *
 * Until that is unified, match on names rather than pretending they are ids.
 */

const tokens = (name: string) =>
  name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ') // "Kenny (Baas) Schwegler" → "Kenny Schwegler"
    .replace(/[^a-zÀ-ɏ\s-]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** True when two written names plausibly denote the same person. */
export function samePerson(a: string, b: string): boolean {
  const x = tokens(a), y = tokens(b);
  if (!x.length || !y.length) return false;
  if (x.join(' ') === y.join(' ')) return true;
  // Same first name, and one surname contains the other:
  // "Kenny Schwegler" ↔ "Kenny Baas-Schwegler".
  if (x[0] !== y[0]) return false;
  const sx = x[x.length - 1], sy = y[y.length - 1];
  return sx.includes(sy) || sy.includes(sx);
}

/** True when any name in the list denotes this person. */
export const anySamePerson = (names: string[] | undefined, person: string) =>
  (names ?? []).some((n) => samePerson(n, person));

/** One person, two rows.
 *
 * Someone who both organises and speaks has a row in each people database, on
 * purpose (docs/content-model.md). `organiser` on the guest row is Notion's
 * `Organiser row` relation, resolved by the sync to the organiser entry's id.
 *
 * The relation is believed **instead of** the name, never alongside it: a
 * relation pointing at somebody else is an editor saying so, and quietly
 * matching a different organiser by name would overrule them. The name match
 * is only for a pair nobody has linked yet, which is every pair until somebody
 * ticks the relation.
 *
 * The name match alone is not enough, and that is why the relation exists. The
 * organiser row reads `Maxime` and the guest row `Maxime Sanglan-Charlier`, and
 * `samePerson` rejects that pair deliberately — a bare first name names nobody
 * in particular. It replaces an `Also an organiser` checkbox that nothing read
 * and nobody ticked.
 */
interface GuestRow { data: { name: string; organiser?: string } }
interface OrganiserRow { id: string; data: { name: string } }

const pairedWith = (guest: GuestRow, organiser: OrganiserRow): boolean =>
  guest.data.organiser
    ? guest.data.organiser === organiser.id
    : samePerson(guest.data.name, organiser.data.name);

/** The organiser row this guest is also, if there is one.
 *
 * The only direction anyone asks any more: a session or story page needs the
 * href to that person's organiser page. The reverse used to exist so an
 * organiser page could borrow the guest row's links and bio, and is gone
 * because the sync now reads those through the relation and writes them onto
 * the organiser entry itself. */
export const organiserFor = <O extends OrganiserRow>(guest: GuestRow, organisers: O[]) =>
  organisers.find((o) => pairedWith(guest, o));

/** The profiles a person may have off this site.
 *
 * `mastodon` and `bluesky` are a handle; see `socialUrl` below, which also
 * accepts a URL. `website` and `linkedin` are always URLs, because neither has
 * a handle anyone writes down. */
interface Profiles {
  website?: string;
  linkedin?: string;
  mastodon?: string;
  bluesky?: string;
}

/** A Mastodon or Bluesky handle, as the URL it stands for.
 *
 * Both people databases hold handles (`@sebrose@mastodon.scot`) rather than
 * URLs, because the n8n social flows put them straight into a post and a URL is
 * not what you write in a toot. A URL is still accepted and passed through
 * untouched, so a row entered before that change keeps working.
 *
 * It lives beside `profileLinks` because that is the one thing that turns these
 * into hrefs *and* into `sameAs`. A handle reaching either would be a broken
 * link and a broken claim about who someone is.
 */
export const socialUrl = (
  network: 'mastodon' | 'bluesky',
  value?: string,
): string | undefined => {
  const v = (value ?? '').trim();
  if (!v) return undefined;
  if (/^https?:\/\//i.test(v)) return v;

  // An instance is not optional on Mastodon: `@sebrose` on its own names
  // nobody in particular, so it is dropped rather than guessed at. Bluesky
  // handles are a domain, either `name.bsky.social` or one someone has
  // verified as their own.
  const m =
    network === 'mastodon'
      ? v.match(/^@?([^@\s/]+)@([^@\s/]+\.[^@\s/]+)$/)
      : v.match(/^@?([^@\s/]+\.[^@\s/]+)$/);
  if (!m) return undefined;
  return network === 'mastodon'
    ? `https://${m[2]}/@${m[1]}`
    : `https://bsky.app/profile/${m[1]}`;
};

/** A bio as the paragraphs it was written in.
 *
 * Notion keeps a long bio as several lines; joined into one they read as a
 * wall. Shared by `PersonRow` and the organiser page so a bio does not
 * paragraph one way under a session and another way under a name. */
export const paragraphs = (text?: string): string[] =>
  (text ?? '').split(/\n+/).map((p) => p.trim()).filter(Boolean);

/** A person's outbound links, labelled and in one fixed order.
 *
 * One list, because these links are rendered on the page *and* become `sameAs`
 * in the structured data — if they were built twice the two could disagree
 * about what a person's profiles are. */
export const profileLinks = (p: Profiles): { label: string; href: string }[] =>
  ([
    ['Website', p.website],
    ['LinkedIn', p.linkedin],
    ['Mastodon', socialUrl('mastodon', p.mastodon)],
    ['Bluesky', socialUrl('bluesky', p.bluesky)],
  ] as const)
    .filter(([, href]) => !!href)
    .map(([label, href]) => ({ label, href: href as string }));

/** Which guests a card should name, and how many it leaves unsaid.
 *
 * Session titles routinely end in "… with Nick Tune", so naming the guests
 * again would read as a stutter — on 53 of the 67 sessions that have guests,
 * the title already carries every name. A guest counts as *already named* only
 * when both their first name and their surname appear: "a conversation with
 * Rebecca" does not introduce Rebecca Wirfs-Brock, it half-introduces her, and
 * the card is the place to finish the job.
 *
 * Capped because a panel can have seven guests and a card is a small box; the
 * remainder is returned rather than dropped so the card can say how many are
 * missing instead of implying it listed everybody.
 */
export function guestsToName(
  title: string,
  names: string[],
  cap = 2,
): { shown: string[]; extra: number } {
  const inTitle = tokens(title);
  const worth = names.filter((n) => {
    const t = tokens(n);
    if (!t.length) return false;
    const first = t[0], last = t[t.length - 1];
    const has = (w: string) => inTitle.some((x) => x === w || x.includes(w) || w.includes(x));
    return !(has(first) && has(last));
  });
  return { shown: worth.slice(0, cap), extra: Math.max(0, worth.length - cap) };
}

/**
 * Who a story is credited to, and in what role.
 *
 * One rule in one place, because it has three readers that would otherwise
 * each keep a copy: the byline under the title, the credit beside it in the
 * sidebar, and the flat list on every card, in the search index and in the
 * `.md` view. It lives here rather than in `collections.ts` so it can be
 * tested — that module imports `astro:content` at runtime and cannot be loaded
 * outside a build.
 *
 * The guest told the story and the hosts asked the questions, so they are not
 * interchangeable and a single list would say neither. An episode with no
 * outside guest is the hosts talking to each other, so it is simply by them.
 *
 * A story with neither is credited to nobody, and that is deliberate: it was
 * the `Authors` multi-select that stood in here, and it is gone from Notion as
 * of 2026-07-29. `tests/content/quality.test.mjs` fails the build if a
 * published story has no author in its structured data, so an uncurated one is
 * caught before it ships rather than quietly credited to no one.
 */
export function storyByline(
  guests: string[],
  hosts: string[],
): { by: string[]; alongside: string[] } {
  if (guests.length) return { by: guests, alongside: hosts };
  return { by: hosts, alongside: [] };
}
