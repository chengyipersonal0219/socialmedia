# P3 Android WebView 驗收

結果：**PARTIAL**（APK 編譯通過，裝置與實站 NOT RUN）

## 改動檔案

- `apps/android/`：Kotlin、Compose、WebView 容器、規則本機儲存、檔案匯入匯出與清理資料。
- `apps/android/filter-bootstrap.ts`：共用 JS bundle 入口。
- `scripts/build-android.ps1`：固定輸出 `Build/android/SocialFilter-debug.apk`。

## 測試與結果

- `./scripts/build-android.ps1`：PASS，`:app:assembleDebug` 成功，APK 10,484,680 bytes。
- `aapt dump badging Build/android/SocialFilter-debug.apk`：package `app.socialfilter`、minSdk 26、targetSdk 36；應用僅要求 INTERNET 權限（另有 Android 自動產生的 dynamic receiver 權限）。
- `adb devices`：沒有連接裝置。Instagram／Facebook 的 WebView 載入、登入、session、注入與互動皆 **NOT RUN**。

## 限制與下一步

Android WebView 目前只是一個可編譯的原型，不視為已確認的手機交付路線。裝置不支援隔離 JavaScript 執行環境時會顯示「未過濾」而不注入規則。若支援隔離執行環境但初始化稍晚，仍可能出現短暫閃現。需使用者於實機逐站操作 `docs/manual-test-checklist.md`。若網站阻擋登入，記錄 `BLOCKED` 並評估 Firefox Android 擴充套件路線。
