/**
 * What is new in `data/sync-alerts.json` since the last run.
 *
 *   git show HEAD:data/sync-alerts.json | node scripts/new-alerts.mjs
 *
 * Prints a JSON array of the alerts nobody has been told about yet, and nothing
 * else, so `sync.yml` can pipe it straight into the webhook payload.
 *
 * ## Why this exists
 *
 * The step used to send the whole file whenever the file changed, and its
 * comment claimed "the same alert is only ever raised once". That is true of
 * the *file* and not of an *alert*, and the difference showed. One story body
 * carries an image on `lh7-rt.googleusercontent.com` that downloads on some
 * runs and not others, so its alert flips in and out of the file:
 *
 *     477dddd  removed      89ff912  added
 *     ad55427  removed      fa999c8  added
 *
 * Every one of those flips rewrote the file, which resent the entire list,
 * which is how an organiser rename from days earlier kept arriving in Discord
 * as though it had just happened. An alert that repeats is an alert people
 * learn to scroll past, and then the one that matters goes with it.
 *
 * A flapping alert still gets announced each time it comes back, which is
 * correct: it really did break again. It just no longer drags the settled ones
 * along with it.
 *
 * No previous version means the first run, and on the first run everything is
 * new. That case is not theoretical: the file spent a while in .gitignore, and
 * eight organiser photos went unannounced because of it.
 */
import { readFileSync } from 'node:fs';

const FILE = process.argv[2] ?? 'data/sync-alerts.json';

/** Alerts from a JSON document, tolerating an absent or unreadable one. */
const itemsOf = (text) => {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
};

/** An alert's identity: everything about it. Two alerts that differ in any
 *  field are different alerts, including one whose wording changed, because a
 *  rewritten message is one somebody has not read. */
const identity = (a) => JSON.stringify([a?.kind, a?.section, a?.title, a?.url]);

export function newAlerts(previousText, currentText) {
  const seen = new Set(itemsOf(previousText).map(identity));
  return itemsOf(currentText).filter((a) => !seen.has(identity(a)));
}

// Reading stdin to the end rather than taking a second path, because the
// previous version comes from `git show` and never exists as a file.
if (import.meta.url === `file://${process.argv[1]}`) {
  const previous = readFileSync(0, 'utf8');
  const current = readFileSync(FILE, 'utf8');
  process.stdout.write(JSON.stringify(newAlerts(previous, current)));
}
