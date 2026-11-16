# Android 開發機與實機驗收

日期：2026-11-16（Asia/Taipei）

## 環境與範圍

- 開發機：Windows、JDK 21、Android SDK API 36、Gradle 8.13。
- 實機：Samsung SM-M115F、Android 12（API 31）、Google Android WebView 157.0.8103.38；`adb devices -l` 顯示已授權連線。
- 僅執行 Android APK 建置、簽章、安裝、啟動、公開頁顯示與來源受限注入驗收。沒有自動操作登入、按讚、留言或私人資料。

| 項目 | Instagram App | Facebook App |
|---|---|---|
| 獨立 package／名稱／圖示 | PASS，`app.socialfilter.instagram` | PASS，`app.socialfilter.facebook` |
| APK 建置與簽章 | PASS | PASS |
| ADB 安裝與冷啟動 | PASS | PASS |
| 來源受限隔離腳本就緒 | PASS | PASS |
| 公開網頁畫面 | PASS，顯示登入頁 | FAIL，`www.facebook.com` 與 `m.facebook.com` 均空白 |
| 使用者登入、session、互動、貼文過濾 | NOT RUN | NOT RUN |

## 重現與診斷

1. 執行 `./scripts/build-android.ps1`：兩個 flavor 的 Debug APK 均編譯成功，固定輸出至 `Build/android/`。
2. 使用 `apksigner verify`、`aapt dump badging` 檢查簽章、package、名稱與 SDK；兩者均通過。兩個 APK 內 `assets/filter.js` 的 SHA-256 均與共用建置輸出一致。
3. `adb install -r` 安裝兩個 APK，`adb shell am start -W -n <package>/app.socialfilter.MainActivity` 冷啟動均回報 `Status: ok`。
4. Debug 診斷僅記錄功能支援、腳本就緒、是否為允許來源及頁面載入狀態。兩個 App 均回報 `isolated-injection-supported=true` 與 `isolated-script-ready`；沒有記錄網址路徑、頁面原文、Cookie、Token 或帳密。
5. Instagram 公開登入頁可見。Facebook 的 WebView 回報頁面完成載入，畫面仍空白；暫停過濾腳本後結果相同，因此不能歸因於 Filter Engine。這不是已驗證的「登入被拒」；登入尚未執行。
6. 舊合併版沒有自訂規則檔，兩個新版安裝成功後已移除；手機上只保留兩個獨立 SocialFilter App。臨時畫面擷取檔已刪除，報告不含畫面或頁面原文。

## 結論與下一步

Instagram App 已通過公開頁與注入原型驗收，仍需使用者自行測試登入、session 與貼文過濾。Facebook App 在此裝置的 WebView 顯示 FAIL；目前只能提供外部瀏覽器入口，外部頁面不套用過濾。不可宣稱 Facebook 手機過濾已完成，也不嘗試偽裝 User-Agent 或繞過網站限制。

Mozilla 官方文件說明 Firefox Android 可安裝擴充套件，但 [Manifest V3 在 Android 尚有相容性差異](https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/)；若要改用該路線，需另行建置與實測，不能從桌面版結果推定可用。
