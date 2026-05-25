#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/android"

if [ -z "${JAVA_HOME:-}" ]; then
  AS_JBR="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  if [ -d "$AS_JBR" ]; then
    export JAVA_HOME="$AS_JBR"
  fi
fi

if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  echo "Java tapılmadı."
  echo "Android Studio quraşdırın və ya: export JAVA_HOME=\"/Applications/Android Studio.app/Contents/jbr/Contents/Home\""
  exit 1
fi

VARIANT="${1:-debug}"
if [ "$VARIANT" = "debug" ]; then
  ./gradlew assembleDebug
  APK="app/build/outputs/apk/debug/app-debug.apk"
elif [ "$VARIANT" = "release" ]; then
  ./gradlew assembleRelease
  APK="app/build/outputs/apk/release/app-release-unsigned.apk"
else
  echo "İstifadə: $0 [debug|release]"
  exit 1
fi

echo ""
echo "APK hazırdır:"
echo "  $ROOT/android/$APK"
