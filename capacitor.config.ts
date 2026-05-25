import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Uzaqdan yükləmək üçün (hər deploy-da APK yeniləmədən):
 *   CAPACITOR_USE_REMOTE=true CAPACITOR_SERVER_URL=https://sizin-panel-url.az npm run mobile:sync
 */
const useRemote = process.env.CAPACITOR_USE_REMOTE === "true";
const remoteUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "az.khamsacraft.suman.courier",
  appName: "SuMan Kuryer",
  webDir: "out",
  server: useRemote && remoteUrl
    ? {
        url: remoteUrl,
        cleartext: false,
        androidScheme: "https",
        allowNavigation: [
          "api.suman.khamsacraft.az",
          "*.khamsacraft.az",
          "*.suman.az",
        ],
      }
    : undefined,
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
