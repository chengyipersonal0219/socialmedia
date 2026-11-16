# P3 Android WebView 驗收

結果：**PARTIAL**（兩個 APK 編譯與安裝通過；Instagram 公開頁 PASS；Facebook WebView 畫面 FAIL）

## 改動檔案

- `apps/android/`：Instagram／Facebook 兩個獨立 product flavor、Kotlin、Compose、WebView 容器、規則本機儲存、檔案匯入匯出與清理資料。
- `apps/android/filter-bootstrap.ts`：共用 JS bundle 入口。
- `scripts/build-android.ps1`：固定輸出 `Build/android/SocialFilter-Instagram-debug.apk` 與 `Build/android/SocialFilter-Facebook-debug.apk`。

## 測試與結果

- `./scripts/build-android.ps1`：PASS，兩個 flavor 均完成 Debug APK。
- `aapt dump badging` 與 `apksigner verify`：兩個不同 package、名稱與 Debug 簽章 PASS；minSdk 26、targetSdk 36。
- `adb install -r` 與 `am start -W`：兩個 App 在 Samsung SM-M115F 均成功安裝、冷啟動；隔離注入均回報就緒。
- Instagram 公開登入頁：畫面可見 PASS。Facebook：`www.facebook.com`、`m.facebook.com` 都完成載入但 WebView 畫面空白；停用注入的對照仍空白，畫面顯示 FAIL。
- 兩站登入、session、動態牆、過濾與互動：**NOT RUN**。

## 限制與下一步

Android WebView 仍不視為已確認的手機交付路線。裝置不支援隔離 JavaScript 執行環境時會顯示「未過濾」。Instagram 登入需使用者自行驗證；Facebook 在此裝置無法顯示，App 提供外部瀏覽器入口，但外部頁面不套用過濾。應另行評估 Firefox Android 擴充套件路線，不能將 WebView 空白記為登入 BLOCKED。詳見 `docs/android-device-acceptance.md`。
