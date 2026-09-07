#!/usr/bin/env bash
# Run on the VPS after Hostinger is live and the previous DNS TTL has elapsed.
# Default: read-only check. --apply: back up and remove only the old landing.
set -euo pipefail

MODE="${1:---check}"
case "$MODE" in --check|--apply) ;; *) echo 'Usage: bash ops/retire-vps-landing.sh [--check|--apply]' >&2; exit 2 ;; esac
REPO=/www/wwwroot/Vignova
CONTAINER=vignova-landing
LEGACY="$REPO/LandingCode"

[[ "$(uname -s)" = Linux ]] || { echo 'Run this script on the Linux VPS.' >&2; exit 1; }
[[ -d "$REPO/.git" && -f "$REPO/docker-compose.yml" ]] || { echo 'Expected VPS checkout not found.' >&2; exit 1; }
[[ "$(realpath -e "$REPO")" = "$REPO" ]] || { echo 'Unexpected checkout symlink; inspect the path first.' >&2; exit 1; }
[[ ! -L "$LEGACY" ]] || { echo 'LandingCode is a symlink; no files were removed.' >&2; exit 1; }
if [[ -e "$LEGACY" ]]; then
  [[ -d "$LEGACY" && "$(realpath -e "$LEGACY")" = "$REPO/LandingCode" ]] || exit 1
fi

docker info --format '{{.ServerVersion}}' >/dev/null
if ! docker container inspect "$CONTAINER" >/dev/null 2>&1; then
  echo 'No vignova-landing container exists. No changes made.'
  exit 0
fi
SERVICE=$(docker container inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$CONTAINER")
WORKDIR=$(docker container inspect --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$CONTAINER")
[[ "$SERVICE" = landing && "$WORKDIR" = "$REPO" ]] || { echo 'Container ownership differs from the expected Compose checkout.' >&2; exit 1; }
if docker compose --project-directory "$REPO" -f "$REPO/docker-compose.yml" config --services | grep -qx landing; then
  echo 'Deploy the updated Compose file first; it must no longer define landing.' >&2
  exit 1
fi
docker container inspect --format 'Target: {{.Name}} | running={{.State.Running}} | image={{.Image}}' "$CONTAINER"

probe() {
  # Prints "new" when the host serves the Hostinger build, "old" when it is
  # still this VPS, "unreachable" otherwise. Never fails the script.
  local url="$1" body
  body=$(curl --fail --silent --location --max-time 20 "$url" 2>/dev/null) || { echo unreachable; return; }
  case "$body" in
    *'data-product-demo="hero"'*) echo new ;;
    *) echo old ;;
  esac
}

if [[ "$MODE" = --check ]]; then
  echo "Public hosts right now:"
  echo "  https://vignova.io/      -> $(probe https://vignova.io/)"
  echo "  https://www.vignova.io/  -> $(probe https://www.vignova.io/)"
  echo
  echo 'Planned: archive LandingCode; exclude it from this VPS checkout; remove vignova-landing.'
  echo 'Dashboard, backend, database, Ollama, volumes and aaPanel configuration are unaffected.'
  echo 'Both hosts must read "new" before --apply; "old" means that hostname is still'
  echo 'answered by this container and removing it would take the page offline.'
  exit 0
fi

# Reject the old live page, an error response, or a failed DNS/SSL transition.
HOME_HTML=$(curl --fail --silent --show-error --location --max-time 20 https://vignova.io/)
BLOG_HTML=$(curl --fail --silent --show-error --location --max-time 20 https://vignova.io/blog/)
[[ "$HOME_HTML" == *'data-product-demo="hero"'* && "$HOME_HTML" == *'analytics.js'* && "$BLOG_HTML" == *'blog-site-header'* ]] || {
  echo 'The expected new public landing/blog pages are not live. Nothing was removed.' >&2; exit 1;
}
# www.vignova.io is its own DNS record and can still point at this VPS after the
# apex has moved. Removing the container while it does would take www offline.
WWW_HTML=$(curl --fail --silent --show-error --location --max-time 20 https://www.vignova.io/)
[[ "$WWW_HTML" == *'data-product-demo="hero"'* ]] || {
  echo 'www.vignova.io is still answered by this VPS, not the new host.' >&2
  echo 'Point its A/AAAA records at the web hosting and let the old TTL lapse first.' >&2
  echo 'Nothing was removed.' >&2
  exit 1
}
if [[ "$(git -C "$REPO" config --get core.sparseCheckout || true)" = true ]]; then
  echo 'This checkout already uses sparse rules. Inspect them before removing source.' >&2
  exit 1
fi

umask 077
mkdir -p /var/backups/vignova-landing
BACKUP=$(mktemp -d /var/backups/vignova-landing/retired-XXXXXXXX)
IMAGE=$(docker container inspect --format '{{.Image}}' "$CONTAINER")
printf '%s\n' "$IMAGE" > "$BACKUP/image-id.txt"
printf 'docker run -d --name vignova-landing --restart unless-stopped -p 3001:80 %q\n' "$IMAGE" > "$BACKUP/restore-container.sh"
cp "$REPO/docker-compose.yml" "$BACKUP/docker-compose.yml"
if [[ -d "$LEGACY" ]]; then
  tar --exclude='LandingCode/node_modules' --exclude='LandingCode/.next' -czf "$BACKUP/LandingCode.tar.gz" -C "$REPO" LandingCode
fi

# Only this VPS worktree excludes the old source. Future git resets retain the
# exclusion. Local LandingCode stays available for the new animation build tools.
git -C "$REPO" sparse-checkout set --no-cone '/*' '!/LandingCode/'
docker stop --time 20 "$CONTAINER"
docker rm "$CONTAINER"
if [[ -d "$LEGACY" ]]; then
  # Remove ignored old build/dependency files left behind by sparse checkout.
  [[ ! -L "$LEGACY" && "$(realpath -e "$LEGACY")" = "$REPO/LandingCode" ]] || exit 1
  rm -rf -- "$LEGACY"
fi
echo "Old landing container and VPS source removed. Backup: $BACKUP"
echo 'The image is retained for rollback. App services and volumes were not stopped or removed.'
echo 'Retire the landing-only aaPanel reverse proxy separately after checking its domain bindings.'
