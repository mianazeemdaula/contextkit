#!/usr/bin/env bash
# Registers the ContextKit native messaging host for Google Chrome on Linux.
# Verified 2026-05-28 against:
#   https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
# User-scoped install dir: ~/.config/google-chrome/NativeMessagingHosts/

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_NAME="app.contextkit.bridge"
TARGET_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
TARGET="$TARGET_DIR/$HOST_NAME.json"

mkdir -p "$TARGET_DIR"
chmod +x "$HERE/bridge.js"

python3 - "$HERE/host-manifest.json" "$HERE/bridge.js" "$TARGET" <<'PY'
import json, sys
src, bridge, dst = sys.argv[1], sys.argv[2], sys.argv[3]
with open(src) as f: m = json.load(f)
m["path"] = bridge
with open(dst, "w") as f: json.dump(m, f, indent=2)
print(f"wrote {dst}")
PY

echo "Edit $TARGET and replace REPLACE_WITH_UNPACKED_EXTENSION_ID with your Chrome extension ID."
echo "For Chromium, also copy to ~/.config/chromium/NativeMessagingHosts/."
