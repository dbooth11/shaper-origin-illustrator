#!/usr/bin/env bash
#
# install.sh — install the Shaper Origin panel + File > Scripts wrappers for Illustrator (macOS).
# Single-user, no code-signing: enables CEP debug mode and symlinks the unsigned extension.
#
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_ID="com.shaper.origin"
EXT_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
CORE="$REPO/host/shaper-core.jsxinc"

echo "Shaper Origin installer"
echo "  repo: $REPO"

# 1) Enable unsigned-extension loading for the CEP versions Illustrator 2024–2026 use.
echo "› Enabling CEP PlayerDebugMode (CSXS 9–12)…"
for v in 9 10 11 12; do
  defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1 2>/dev/null || true
done

# 2) Symlink the extension into the CEP extensions folder.
echo "› Linking panel into CEP extensions…"
mkdir -p "$EXT_DIR"
ln -sfn "$REPO" "$EXT_DIR/$EXT_ID"
echo "  $EXT_DIR/$EXT_ID -> $REPO"

# 3) Generate File > Scripts wrappers (one per cut type) into each Illustrator Scripts folder.
echo "› Installing File > Scripts wrappers…"
declare -a TYPES=("interior:Interior Cut" "exterior:Exterior Cut" "online:On-line Cut" "pocket:Pocket Cut" "guide:Guide")
INSTALLED_SCRIPTS=0
while IFS= read -r SCRIPTS_DIR; do
  [ -d "$SCRIPTS_DIR" ] || continue
  if [ ! -w "$SCRIPTS_DIR" ]; then
    echo "  (skip, not writable — re-run with sudo to add here) $SCRIPTS_DIR"
    continue
  fi
  for entry in "${TYPES[@]}"; do
    key="${entry%%:*}"; label="${entry##*:}"
    out="$SCRIPTS_DIR/Shaper - ${label}.jsx"
    printf '#include "%s"\napplyCut("%s");\n' "$CORE" "$key" > "$out"
    INSTALLED_SCRIPTS=$((INSTALLED_SCRIPTS+1))
  done
  echo "  wrote 5 scripts → $SCRIPTS_DIR"
done < <(find /Applications -maxdepth 2 -type d -path "*Adobe Illustrator*" -name Scripts 2>/dev/null)

if [ "$INSTALLED_SCRIPTS" -eq 0 ]; then
  echo "  none installed (use File > Scripts > Other Script… to run from $REPO instead)"
fi

echo
echo "Done. Next:"
echo "  1. Fully quit and relaunch Illustrator."
echo "  2. Open the panel:  Window ▸ Extensions ▸ Shaper Origin"
echo "  3. Cut types also appear under  File ▸ Scripts."
