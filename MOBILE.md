# SuMan Kuryer — Mobil tətbiq (APK / iOS)

Layihə [Capacitor](https://capacitorjs.com/) ilə Android APK və iOS `.ipa` üçün hazırlanıb.

## Tələblər

- Node.js 20+
- **Android:** Android Studio + JDK 17
- **iOS:** Xcode + CocoaPods (`sudo gem install cocoapods` və ya `brew install cocoapods`)
- API production-da işləməlidir: `https://api.suman.khamsacraft.az`

## Quraşdırma (bir dəfə)

```bash
cd courier-suman
npm install
npm run mobile:setup
```

`mobile:setup` Android və iOS native layihələrini yaradır.

## APK qurmaq (Android)

```bash
# 1. Web build + native sync
npm run mobile:sync

# 2. Android Studio aç
npm run mobile:android
```

Android Studio-da:

1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`

Terminaldan debug APK:

```bash
npm run mobile:apk:debug
```

Release APK (imza lazımdır):

```bash
npm run mobile:apk:release
```

## iOS (Xcode)

Hər web dəyişikliyindən sonra **mütləq**:

```bash
npm run mobile:sync
npm run mobile:ios
```

Xcode-da:

1. **Product → Clean Build Folder** (⇧⌘K)
2. Simulyator/cihazda köhnə «SuMan Kuryer» tətbiqini silin (uzun bas → Delete)
3. **Product → Run** (⌘R)

Yalnız Xcode-da ▶ basmaq kifayət deyil — əvvəl terminalda `mobile:sync` olmalıdır.

## İki iş rejimi

### A) Daxilində web (default)

Next.js `out/` qovluğuna export olunur, APK-nın içindədir.

```bash
npm run mobile:sync
```

Panel dəyişəndə yenidən `mobile:sync` və APK rebuild edin.

### B) Uzaq URL (APK yeniləmədən panel yenilənir)

Panel artıq internetdə host olunursa (məs. Vercel):

```bash
CAPACITOR_USE_REMOTE=true \
CAPACITOR_SERVER_URL=https://SIZIN-PANEL-DOMENI.az \
npm run mobile:sync
```

Sonra Android Studio / Xcode ilə eyni qaydada build edin.

## Faydalı əmrlər

| Əmr | İzah |
|-----|------|
| `npm run mobile:build` | Yalnız `out/` export |
| `npm run mobile:sync` | Build + `cap sync` |
| `npm run mobile:android` | Android Studio |
| `npm run mobile:ios` | Xcode |
| `npm run mobile:apk:debug` | Debug APK (Gradle) |

## API URL

Mobil build zamanı `.env.production` oxunur:

```
NEXT_PUBLIC_API_URL=https://api.suman.khamsacraft.az
```

Dəyişəndə: `npm run mobile:sync` və yenidən build.

## Problemlər

**Ağ ekran:** `out/` mövcuddur? → `npm run mobile:build` işlədin.

**API xətası / Load failed:** `npm run mobile:sync` yenidən işlədin. Backend-də CORS-da `https://localhost` və `capacitor://localhost` olmalıdır (server.js yeniləndi). `.env.local` içindəki `localhost` API URL-i mobil build-ə təsir etməməlidir — `mobile:build` production URL məcbur edir.

**Android Gradle:** Android Studio → **File → Sync Project with Gradle Files**.

**iOS Pod:** `cd ios/App && pod install`
