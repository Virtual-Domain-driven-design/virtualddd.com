/** The two shows, and where to subscribe to them.
 *
 * Both are hosted on Captivate, which distributes them to a dozen directories.
 * A visitor who wants to follow us does not want our player embedded on our
 * page; they want the show in the app they already use, so it arrives on its
 * own next week. That is what these links are for.
 *
 * ## Why the IDs are in a file and not in Notion
 *
 * There are two shows and there will not be a third soon. Every value below is
 * immutable once a directory has accepted the feed: an Apple collection ID and
 * a Spotify show ID never change for the life of a show. Putting them in Notion
 * would add a database, a sync spec and a schema for six constants that nobody
 * will ever edit. See rule 7 in AGENTS.md — Notion is right for what an editor
 * changes, and this is not that.
 *
 * ## Why only these platforms
 *
 * Every link here is *derived*, from the Apple ID or the feed URL, so the list
 * cannot rot: adding a show means filling in this table and nothing else. The
 * directories left out (Amazon Music, Deezer, Gaana, JioSaavn, Boomplay,
 * Podcast Index) all mint an internal ID that can only be read out of their own
 * dashboard, so each is a constant somebody has to fetch by hand and nothing
 * would notice going stale. They are one paste away if we ever want them.
 *
 * Overcast is deliberately absent for a different reason: `overcast.fm/itunes…`
 * answers a logged-out visitor with a redirect to its login page, which is a
 * worse answer than no link.
 */

/** Which show, as the pages name it. */
export type ShowKey = 'sessions' | 'stories';

export interface Show {
  key: ShowKey;
  /** The show's name in the directories, which is not always the page's title. */
  name: string;
  /** One line, for a card that has to say what it is before someone subscribes. */
  blurb: string;
  /** The section this show comes from. */
  href: string;
  /** Captivate's feed. The RSS link, and what Player FM and YouTube Music take. */
  feed: string;
  /** Apple's collection ID. Four of the seven links below are built from it. */
  appleId: string;
  /** Spotify's show ID. The one value with no derivation. */
  spotifyId: string;
}

export const SHOWS: Record<ShowKey, Show> = {
  sessions: {
    key: 'sessions',
    name: 'Virtual Domain-Driven Design',
    blurb: 'Audio from the live meetups: talks, debates, panels and fireside chats.',
    href: '/sessions/',
    feed: 'https://feeds.captivate.fm/virtual-domain-driven-design/',
    // The show has a second Apple listing, id1837613847, pointing at the same
    // feed. This is the original: it is the one Castro knows, and Pocket Casts
    // resolves both to the show it created from it in 2019.
    appleId: '1478089740',
    spotifyId: '7aZtTzaUxlW0ZKQtl8DBJq',
  },
  stories: {
    key: 'stories',
    name: 'Stories on Facilitating Software Architecture & Design',
    blurb: 'What actually happened, told by the person it happened to.',
    href: '/facilitating-archdes/',
    feed: 'https://feeds.captivate.fm/stories-on-facilitating-software-architecture-design/',
    appleId: '1837176113',
    spotifyId: '1wL4R3hBbgLbYr2J1HWdPS',
  },
};

/** simple-icons paths, inlined for the same reason `Socials.astro` inlines its
 *  own: an icon that costs a request is an icon that can fail to arrive. */
const ICONS = {
  apple: 'M5.34 0A5.328 5.328 0 000 5.34v13.32A5.328 5.328 0 005.34 24h13.32A5.328 5.328 0 0024 18.66V5.34A5.328 5.328 0 0018.66 0zm6.525 2.568c2.336 0 4.448.902 6.056 2.587 1.224 1.272 1.912 2.619 2.264 4.392.12.59.12 2.2.007 2.864a8.506 8.506 0 01-3.24 5.296c-.608.46-2.096 1.261-2.336 1.261-.088 0-.096-.091-.056-.46.072-.592.144-.715.48-.856.536-.224 1.448-.874 2.008-1.435a7.644 7.644 0 002.008-3.536c.208-.824.184-2.656-.048-3.504-.728-2.696-2.928-4.792-5.624-5.352-.784-.16-2.208-.16-3 0-2.728.56-4.984 2.76-5.672 5.528-.184.752-.184 2.584 0 3.336.456 1.832 1.64 3.512 3.192 4.512.304.2.672.408.824.472.336.144.408.264.472.856.04.36.03.464-.056.464-.056 0-.464-.176-.896-.384l-.04-.03c-2.472-1.216-4.056-3.274-4.632-6.012-.144-.706-.168-2.392-.03-3.04.36-1.74 1.048-3.1 2.192-4.304 1.648-1.737 3.768-2.656 6.128-2.656zm.134 2.81c.409.004.803.04 1.106.106 2.784.62 4.76 3.408 4.376 6.174-.152 1.114-.536 2.03-1.216 2.88-.336.43-1.152 1.15-1.296 1.15-.023 0-.048-.272-.048-.603v-.605l.416-.496c1.568-1.878 1.456-4.502-.256-6.224-.664-.67-1.432-1.064-2.424-1.246-.64-.118-.776-.118-1.448-.008-1.02.167-1.81.562-2.512 1.256-1.72 1.704-1.832 4.342-.264 6.222l.413.496v.608c0 .336-.027.608-.06.608-.03 0-.264-.16-.512-.36l-.034-.011c-.832-.664-1.568-1.842-1.872-2.997-.184-.698-.184-2.024.008-2.72.504-1.878 1.888-3.335 3.808-4.019.41-.145 1.133-.22 1.814-.211zm-.13 2.99c.31 0 .62.06.844.178.488.253.888.745 1.04 1.259.464 1.578-1.208 2.96-2.72 2.254h-.015c-.712-.331-1.096-.956-1.104-1.77 0-.733.408-1.371 1.112-1.745.224-.117.534-.176.844-.176zm-.011 4.728c.988-.004 1.706.349 1.97.97.198.464.124 1.932-.218 4.302-.232 1.656-.36 2.074-.68 2.356-.44.39-1.064.498-1.656.288h-.003c-.716-.257-.87-.605-1.164-2.644-.341-2.37-.416-3.838-.218-4.302.262-.616.974-.966 1.97-.97z',
  spotify: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z',
  pocketCasts: 'M12,0C5.372,0,0,5.372,0,12c0,6.628,5.372,12,12,12c6.628,0,12-5.372,12-12 C24,5.372,18.628,0,12,0z M15.564,12c0-1.968-1.596-3.564-3.564-3.564c-1.968,0-3.564,1.595-3.564,3.564 c0,1.968,1.595,3.564,3.564,3.564V17.6c-3.093,0-5.6-2.507-5.6-5.6c0-3.093,2.507-5.6,5.6-5.6c3.093,0,5.6,2.507,5.6,5.6H15.564z M19,12c0-3.866-3.134-7-7-7c-3.866,0-7,3.134-7,7c0,3.866,3.134,7,7,7v2.333c-5.155,0-9.333-4.179-9.333-9.333 c0-5.155,4.179-9.333,9.333-9.333c5.155,0,9.333,4.179,9.333,9.333H19z',
  castro: 'M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0zm-.002 13.991a2.052 2.052 0 1 1 0-4.105 2.052 2.052 0 0 1 0 4.105zm4.995 4.853l-2.012-2.791a5.084 5.084 0 1 0-5.982.012l-2.014 2.793A8.526 8.526 0 0 1 11.979 3.42a8.526 8.526 0 0 1 8.526 8.526 8.511 8.511 0 0 1-3.512 6.898z',
  playerFm: 'M11.976 0a12 12 0 00-.347.012c-.323.021-.771.063-1.129.11-3.29.448-6.096 2.1-7.993 4.56a12.027 12.027 0 00-1.22 1.94 12 12 0 00-.173.358c-.092.198-.179.4-.261.603a12 12 0 00-.288.788l-.045.143A12 12 0 000 11.986v.037A12 12 0 0012 24a12 12 0 0011.939-10.79l.003-.024A12 12 0 0024 12.018v-.048a12 12 0 00-.769-4.182c-.04-.105-.081-.21-.125-.313a12 12 0 00-.226-.507c-1.487-3.15-4.299-5.59-7.698-6.506-.76-.208-1.978-.39-2.813-.444A12 12 0 0012.024 0h-.048zm2.321 2.88c.166.001.377.056.675.159 1.782.611 3.773 2.157 4.856 3.764.752 1.118 1.337 2.428 1.337 2.987 0 .358-.35.681-.725.681-.35 0-.708-.305-.804-.68-.13-.525-.83-1.852-1.345-2.534-.917-1.205-2.332-2.262-3.72-2.777-.979-.367-1.232-.795-.778-1.336.152-.182.29-.267.504-.265zm-3.885 1.4c.26.001.495.056.7.165 1.31.664 1.24 2.568-.122 3.092-1.686.637-2.533 1.319-3.084 2.437-1.153 2.34-.21 5.1 2.123 6.218 1.712.821 3.668.533 5.03-.725.62-.576.961-1.074 1.267-1.878.428-1.126.917-1.545 1.79-1.545 1.119 0 1.887.943 1.66 2.026-.463 2.13-2.253 4.27-4.42 5.275-1.196.55-1.851.69-3.362.69-1.485 0-2.131-.131-3.284-.655-3.144-1.424-5.075-4.83-4.673-8.21a8.123 8.123 0 015.511-6.734c.315-.105.603-.157.864-.156zm3.463.96c.217.004.499.105.914.306 1.686.803 3.083 2.279 3.834 4.035.28.672.14 1.109-.41 1.283-.42.123-.7-.104-1.066-.864-.681-1.441-1.65-2.437-3.013-3.11-.795-.384-.891-.471-.97-.847-.035-.2 0-.314.184-.532.157-.184.31-.276.527-.271zm-.398 2.443c.23-.001.496.108.84.334.961.629 2.044 1.983 2.044 2.55 0 .289-.28.656-.559.725-.376.097-.646-.087-1.04-.707-.427-.655-.925-1.153-1.44-1.415-.446-.227-.577-.402-.577-.769a.58.58 0 01.245-.515.727.727 0 01.487-.203z',
  youtubeMusic: 'M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z',
  rss: 'M19.199 24C19.199 13.467 10.533 4.8 0 4.8V0c13.165 0 24 10.835 24 24h-4.801zM3.291 17.415c1.814 0 3.293 1.479 3.293 3.295 0 1.813-1.485 3.29-3.301 3.29C1.47 24 0 22.526 0 20.71s1.475-3.294 3.291-3.295zM15.909 24h-4.665c0-6.169-5.075-11.245-11.244-11.245V8.09c8.727 0 15.909 7.184 15.909 15.91z',
};

export interface PlatformLink {
  /** Stable identity, so code that needs *one* of these can ask for it without
   *  matching on `label`. Apple is the only platform that will hand us a link
   *  to a single episode, and pointing at that link by its display copy meant a
   *  reworded label would quietly downgrade every episode link to a show link. */
  key: string;
  label: string;
  href: string;
  path: string;
}

/** Base64url, which is what YouTube Music wants the feed URL wrapped in. */
function base64url(s: string): string {
  const b64 = typeof Buffer !== 'undefined'
    ? Buffer.from(s, 'utf8').toString('base64')
    : btoa(s);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The one platform that will link to a single episode, named once so the
 *  component and this file cannot disagree about which link that is. */
export const APPLE = 'apple';

/** Where to subscribe to a show. Every href is a function of the show above. */
export function subscribeLinks(show: Show): PlatformLink[] {
  return [
    // The locale-free form. Apple redirects to the visitor's own storefront,
    // which is a better answer than pinning everyone to /us/.
    { key: APPLE, label: 'Apple Podcasts', href: `https://podcasts.apple.com/podcast/id${show.appleId}`, path: ICONS.apple },
    { key: 'spotify', label: 'Spotify', href: `https://open.spotify.com/show/${show.spotifyId}`, path: ICONS.spotify },
    { key: 'pocket-casts', label: 'Pocket Casts', href: `https://pca.st/itunes/${show.appleId}`, path: ICONS.pocketCasts },
    { key: 'castro', label: 'Castro', href: `https://castro.fm/itunes/${show.appleId}`, path: ICONS.castro },
    { key: 'player-fm', label: 'Player FM', href: `https://player.fm/subscribe?id=${encodeURIComponent(show.feed)}`, path: ICONS.playerFm },
    { key: 'youtube-music', label: 'YouTube Music', href: `https://music.youtube.com/library/podcasts?addrssfeed=${base64url(show.feed)}`, path: ICONS.youtubeMusic },
    { key: 'rss', label: 'RSS feed', href: show.feed, path: ICONS.rss },
  ];
}

/** Captivate's media ID for an episode, read out of the player embed URL that
 *  Notion stores: `podcastPlayer` on a session, `podcast` on a story.
 *
 *  It is **not** the episode's RSS `<guid>`, which is the tempting assumption
 *  and is wrong for 51 of the 59 sessions. This show was imported from Libsyn,
 *  and an import keeps the original guids so that subscribers are not served
 *  sixty episodes again; only the eight recorded natively on Captivate have a
 *  guid that matches. What is always true is that the same ID is in the
 *  enclosure — `episodes.captivate.fm/episode/<id>.mp3` — so the feed itself
 *  joins the two, which is the join `sync-podcast-episodes.ts` makes.
 *
 *  Returns null for the two open space episodes, which are on Libsyn rather
 *  than Captivate and are in neither of these feeds. */
function episodeId(playerUrl?: string): string | null {
  if (!playerUrl) return null;
  const m = playerUrl.match(/player\.captivate\.fm\/episode\/([0-9a-f-]{36})/i);
  return m ? m[1].toLowerCase() : null;
}

/** The episode's own page on Apple Podcasts, if `data/podcast-episodes.json`
 *  knows it. Missing is normal and not an error: an episode that has dropped
 *  out of its feed's window is in no directory at all. */
export function appleEpisodeUrl(
  show: Show,
  playerUrl: string | undefined,
  known: Record<string, Record<string, string>>,
): string | null {
  const id = episodeId(playerUrl);
  const track = id ? known[show.key]?.[id] : undefined;
  return track ? `https://podcasts.apple.com/podcast/id${show.appleId}?i=${track}` : null;
}
