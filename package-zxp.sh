#!/usr/bin/env bash
#
# Package this CEP extension as a signed ZXP using Adobe's ZXPSignCmd.
# Adobe guide: https://github.com/Adobe-CEP/Getting-Started-guides/blob/master/Package%20Distribute%20Install/readme.md
# Tool download: https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD/4.1.3
#
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$REPO/build/zxp-src"
DIST_DIR="$REPO/dist"
CERT_DIR="$REPO/certs"
OUT_ZXP="${OUT_ZXP:-$DIST_DIR/shaper-output.zxp}"
CERT_PATH="${ZXP_CERT_PATH:-$CERT_DIR/shaper-output-selfsigned.p12}"
TSA_URL="${ZXP_TSA_URL:-http://timestamp.digicert.com/}"

find_zxpsigncmd() {
  if [ "${ZXP_SIGN_CMD:-}" ]; then
    printf '%s\n' "$ZXP_SIGN_CMD"
    return
  fi
  if command -v ZXPSignCmd >/dev/null 2>&1; then
    command -v ZXPSignCmd
    return
  fi
  for p in \
    /usr/local/bin/ZXPSignCmd \
    /opt/homebrew/bin/ZXPSignCmd \
    "$HOME/Applications/ZXPSignCmd" \
    /Applications/ZXPSignCmd; do
    if [ -x "$p" ]; then
      printf '%s\n' "$p"
      return
    fi
  done
  return 1
}

prompt_password() {
  if [ "${ZXP_CERT_PASSWORD:-}" ]; then
    printf '%s\n' "$ZXP_CERT_PASSWORD"
    return
  fi
  if [ ! -t 0 ]; then
    echo "Set ZXP_CERT_PASSWORD when running without an interactive terminal." >&2
    return 1
  fi
  printf 'Certificate password: ' >&2
  stty -echo
  IFS= read -r password
  stty echo
  printf '\n' >&2
  printf '%s\n' "$password"
}

ZXPSIGNCMD="$(find_zxpsigncmd || true)"
if [ ! "$ZXPSIGNCMD" ] || [ ! -x "$ZXPSIGNCMD" ]; then
  cat >&2 <<'EOF'
ZXPSignCmd was not found.

Install Adobe's current ZXPSignCmd, then rerun with either:
  ZXP_SIGN_CMD=/absolute/path/to/ZXPSignCmd ./package-zxp.sh

Adobe download:
  https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD/4.1.3
EOF
  exit 1
fi

PASSWORD="$(prompt_password)"
if [ ! "$PASSWORD" ]; then
  echo "Certificate password is required." >&2
  exit 1
fi

mkdir -p "$BUILD_DIR" "$DIST_DIR" "$CERT_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

if command -v rsync >/dev/null 2>&1; then
  rsync -a "$REPO/CSXS" "$REPO/client" "$REPO/host" "$BUILD_DIR/"
else
  cp -R "$REPO/CSXS" "$REPO/client" "$REPO/host" "$BUILD_DIR/"
fi
[ -f "$REPO/LICENSE" ] && cp "$REPO/LICENSE" "$BUILD_DIR/"

if [ ! -f "$CERT_PATH" ]; then
  "$ZXPSIGNCMD" -selfSignedCert \
    "${ZXP_CERT_COUNTRY:-US}" \
    "${ZXP_CERT_STATE:-NY}" \
    "${ZXP_CERT_ORG:-Donald Booth}" \
    "${ZXP_CERT_COMMON_NAME:-Shaper Output}" \
    "$PASSWORD" \
    "$CERT_PATH"
fi

rm -f "$OUT_ZXP"
"$ZXPSIGNCMD" -sign "$BUILD_DIR" "$OUT_ZXP" "$CERT_PATH" "$PASSWORD" -tsa "$TSA_URL"
"$ZXPSIGNCMD" -verify "$OUT_ZXP" -certInfo

echo "ZXP written to $OUT_ZXP"
