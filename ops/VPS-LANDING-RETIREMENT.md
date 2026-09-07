# Move the landing page off the VPS

## Current status

The original VPS deployment defined Compose service `landing`, container
`vignova-landing`, built from `LandingCode` and exposed on port **3001**.
GitHub Actions rebuilt it when that directory changed. aaPanel runs nginx on the
host; it is not a Compose service.

The local Compose file and workflow now deploy only **dashboard, backend,
Postgres and Ollama**. The repository's reference nginx files no longer route
to the landing container. These edits have not been pushed or applied to the VPS.
The live container has not been inspected, stopped or removed.

### Measured 2026-09-07 (against public resolvers, not a local cache)

| Host | Resolves to | Server | Result |
| --- | --- | --- | --- |
| `vignova.io` | `178.16.136.228` | LiteSpeed | 200, new build |
| `www.vignova.io` | `178.16.136.228` | LiteSpeed | 301 → apex, new build |
| `vignova.io/blog/` | `178.16.136.228` | LiteSpeed | 200, new build |
| `app.vignova.io` | `135.125.243.170` | nginx | **502** |
| `api.vignova.io` | `135.125.243.170` | nginx | **502** |

`www` is a `CNAME` to the apex, so it inherits the web hosting A record and
LiteSpeed 301s it to `https://vignova.io/`. No separate A/AAAA record is needed
and none should be added — a stray `A www` would pin it back to the VPS.

**The public migration is done. No landing traffic reaches this VPS.** Verify
with `--check` on the server (its resolver, not a workstation's) before removing
anything: an earlier reading here was taken from a stale local DNS cache that
still held the pre-migration answer, and it looked like `www` was on the VPS.

Two things still gate `--apply`:

1. The updated Compose file and workflow must be pushed and deployed — the
   script refuses to run while the VPS Compose file still defines `landing`.
2. `app`/`api` return 502: nginx is up on the VPS but its upstream containers
   are not answering. Unrelated to this migration, but fix it first so a
   restart during cleanup is not mistaken for a new fault.

### Other records still on the VPS

`app`, `api`, `mail` and `support` all point at `135.125.243.170`, and one `MX`
is `mail.vignova.io`. This cleanup removes only the landing container. Do not
decommission the VPS itself — mail delivery and the app both still depend on it.

## Switch the website first

1. Back up the existing website configuration. Upload and extract
   `new_landing/hostinger-upload.zip` into the separate Hostinger web hosting
   site's `public_html`. Check the site using Hostinger's preview method.
2. Point **vignova.io** and **www.vignova.io** to that web hosting destination,
   following the IP/record values shown for that hosting account. Account for
   both A and AAAA records; an old AAAA record can leave IPv6 visitors on the VPS.
3. Keep **app.vignova.io** and **api.vignova.io** pointing to the existing VPS.
   Preserve mail, TXT/verification and other unrelated DNS records. Ensure HTTPS
   is active on the new landing host.
4. Check the new home page, blog and original article URLs, analytics consent,
   sitemap, app login and API health. Follow `new_landing/SEO-MIGRATION.md`.
   Wait out the old DNS TTL so cached visitors no longer depend on port 3001.

## Remove the old VPS deployment

Deploy the updated repository configuration first. Then, in the VPS SSH terminal:

```bash
cd /www/wwwroot/Vignova
bash ops/retire-vps-landing.sh --check
```

`--check` reports what each public host is currently serving. Both `vignova.io`
and `www.vignova.io` must read `new` before you continue.

Once the new Hostinger site is live and DNS has propagated:

```bash
bash ops/retire-vps-landing.sh --apply
```

The script validates the checkout path and the exact container's Compose labels,
checks that the public homepage and blog match the new build, archives the old
source under `/var/backups/vignova-landing/`, and removes only `vignova-landing`.
It removes `LandingCode` from the VPS worktree and sets a Git sparse-checkout
exclusion so the deployment workflow cannot restore that folder on the next pull.
It retains the image for rollback and never removes volumes, restarts the app,
or runs `docker compose down` or a broad Docker prune.

In aaPanel, retire the **landing-only** website/reverse proxy for `vignova.io`
and `www.vignova.io` that pointed to `127.0.0.1:3001`. Inspect the actual domain
bindings first: preserve app/API sites, shared certificates, and DNS zones.
Do not upload the root `nginx.conf` over aaPanel's configuration; the root files
are legacy references, not the active aaPanel virtual hosts.

## Local source and rollback

Local `LandingCode` remains a development reference: the new animations use its
installed build dependencies, and the migration tools read its article export.
The Hostinger ZIP contains none of that old application/runtime. The cleanup
script removes that source only from the VPS, where it is no longer needed.

The backup's `restore-container.sh` contains an exact-image rollback command.
Source can be restored from the tar archive. Restoring the old website also
requires restoring its aaPanel route and, if needed, the landing DNS records.
To restore the old source to the VPS Git checkout, disable the sparse exclusion
with `git sparse-checkout disable` after reviewing any server-local changes.
