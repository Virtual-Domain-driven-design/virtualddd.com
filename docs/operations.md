# Running the live site

The host, the deploy, rollback, and the weekly check. Read this before
deploying by hand, rolling back, moving a domain, or chasing a certificate.

Part of the working brief: [AGENTS.md](../AGENTS.md) is the map, and
[README.md](../README.md) is the front door.

---

# The live site

**virtualddd.com went live on 28 July 2026**, replacing WordPress 7.0.2 on the
same Kualo host. Every inherited address was verified against the real server
the same day, with no problems. The split is in [urls.md](urls.md).

The deploy is atomic: every release is rsynced into `~/releases/<sha>` and the
document root is a **symlink** swapped once the copy is complete. Nobody sees a
half-written site, and a rollback is one command.

```
/home/baasieco/virtualddd.com          → ~/releases/<sha>   the live site
/home/baasieco/virtualddd.com.wordpress                     the old site, parked
```

**`KUALO_PATH` must be an absolute path.** It is interpolated inside single
quotes in a shell on the host, so `~` is never expanded. A value starting with
`~` fails at the very last step with `ln: failed to create symbolic link: No
such file or directory`, after a successful build and a successful upload.

**CI will not touch a document root that is a real directory.** It checks and
fails rather than deleting anything, because a real directory there might be
somebody's live site and a deploy job is not the place to find that out. That
is why pointing a *new* domain at the site is a deliberate human step:

```bash
# Cutting a domain over, on the host:
mv ~/virtualddd.com ~/virtualddd.com.wordpress     # keep the old site
ln -sfn ~/releases/<sha> ~/virtualddd.com          # point at the newest release
# then set KUALO_PATH to the absolute docroot and SITE_URL to the domain.

# Roll back at any time by pointing the symlink at an earlier release:
ls -1dt ~/releases/*/                              # newest first
ln -sfn ~/releases/<older-sha> ~/virtualddd.com
```

The last five releases are kept, so a rollback is always available without a
rebuild.

**The parked WordPress directory is not dead weight.** Its `wp-content/uploads`
is what the old site's media URLs pointed at, and things outside this repo
still reference them. Notion did, until the organiser photos were re-uploaded.
Do not delete it on the strength of the site looking fine.

**The certificate** is a Let's Encrypt *wildcard* (`*.virtualddd.com`), which
renews over DNS-01 rather than the HTTP challenge, so `public/.well-known/
acme-challenge/` matters only if it is ever replaced by a per-domain AutoSSL
cert. Keep the directory; do not rely on it.

## Watching it, once a week

`watch.yml` asks the deployed site on Mondays what no test in this repository
can: whether every inherited address is still answered by real Apache, and how long
the certificate has left. Both rot without anyone touching this repository: a
host config change, a restore that loses the `.htaccess`, a renewal that
quietly stopped. None of that is a commit, so none of it can fail a build.

It posts to Discord only when something is wrong. A weekly "still fine" is a
message people learn to skip, and the run is already the record. Weekly rather
than daily because a request for every address is a real load on a shared
host, and neither
failure is one you would fix within the hour.

Two thresholds, doing different jobs. A certificate with **under 21 days** gets
a Discord line: it should have renewed by now, worth an eye. **Under 14 days**,
or any broken address, fails the run. A red scheduled run emails the account
that last changed the workflow, from GitHub, rather than through n8n and a
webhook. The louder signal deliberately does not travel the same kind of chain
it is watching.
