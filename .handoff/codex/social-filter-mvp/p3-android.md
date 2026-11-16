# P3 Android WebView 驗收

結果：**PARTIAL**（兩個 APK 編譯、安裝與公開登入頁通過；登入後過濾尚未驗收）

## 改動檔案

- `apps/android/`：Instagram／Facebook 兩個獨立 product flavor、Kotlin、Compose、分別使用 WebView／GeckoView、規則本機儲存、檔案匯入匯出與清理資料。
- `apps/android/filter-bootstrap.ts`、`apps/android/filter-gecko.ts`：共用 TypeScript 過濾核心的兩個瀏覽引擎入口。
- `scripts/build-android.ps1`：固定輸出 `Build/android/SocialFilter-Instagram-debug.apk` 與 `Build/android/SocialFilter-Facebook-debug.apk`。

## 測試與結果

- `./scripts/build-android.ps1`：PASS，兩個 flavor 均完成 Debug APK。
- `aapt dump badging` 與 `apksigner verify`：兩個不同 package、名稱與 Debug 簽章 PASS；minSdk 26、targetSdk 36。
- `adb install -r` 與 `am start -W`：兩個 App 在 Samsung SM-M115F 均成功安裝、冷啟動。
- Instagram 公開登入頁及 WebView 隔離注入 PASS。原本 Facebook WebView 空白，改用 GeckoView 後公開登入頁、擴充套件連線及規則接收 PASS。
- Facebook 由使用者自行登入，動態牆顯示 PASS；`facebook-open-app-prompt` 規則隱藏底部提示 PASS。Instagram 登入、兩站 session 重啟、一般貼文過濾與互動：**NOT RUN**。

## 限制與下一步

Instagram 登入、兩站 session 重啟、互動及一般貼文過濾仍需使用者自行驗證。外部瀏覽器登入狀態不會自動帶入 App，也不套用 App 過濾。Facebook APK 約 511 MiB；GeckoView 增加安裝體積。詳見 `docs/android-device-acceptance.md`。
