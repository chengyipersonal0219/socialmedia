# Android 開發機與實機驗收

日期：2026-11-16（Asia/Taipei）

## 環境與範圍

- 開發機：Windows、JDK 21、Android SDK API 36、Gradle 8.13。
- 實機：Samsung SM-M115F、Android 12（API 31）、Google Android WebView 157.0.8103.38；`adb devices -l` 顯示已授權連線。
- 僅執行 Android APK 建置、簽章、安裝、啟動、公開頁顯示、腳本連線與指定 UI 規則驗收。登入由使用者自行完成；沒有自動操作登入、按讚、留言或私人資料。

| 項目 | Instagram App | Facebook App |
|---|---|---|
| 獨立 package／名稱／圖示 | PASS，`app.socialfilter.instagram` | PASS，`app.socialfilter.facebook` |
| APK 建置與簽章 | PASS | PASS |
| ADB 安裝與冷啟動 | PASS | PASS |
| 過濾腳本就緒 | PASS，WebView 隔離注入 | PASS，GeckoView 內嵌擴充套件連線並接收規則 |
| 公開網頁畫面 | PASS，顯示登入頁 | PASS，顯示登入頁 |
| 使用者自行登入與動態牆顯示 | NOT RUN | PASS |
| 底部「開啟應用程式」提示隱藏 | 不適用 | PASS，提示消失且動態牆仍顯示 |
| session 重啟、互動、貼文過濾 | NOT RUN | NOT RUN |

## 重現與診斷

1. 執行 `./scripts/build-android.ps1`：兩個 flavor 的 Debug APK 均編譯成功，固定輸出至 `Build/android/`。
2. 使用 `apksigner verify`、`aapt dump badging` 檢查簽章、package、名稱與 SDK；兩者均通過。Instagram 與 Facebook 分別使用 WebView 注入與 GeckoView 內嵌擴充套件，兩個入口共用 TypeScript 規則核心。
3. `adb install -r` 安裝兩個 APK，`adb shell am start -W -n <package>/app.socialfilter.MainActivity` 冷啟動均回報 `Status: ok`。
4. 原本 Facebook 的 Android WebView 在此裝置回報載入完成卻呈現空白；停用過濾腳本也一樣。使用者在外部瀏覽器登入後，App 仍空白；外部登入狀態本來也不會自動共享給 App。
5. 獨立 GeckoView 測試 App 在同一手機顯示 Facebook 公開登入頁。因此 Facebook 獨立 App 改用 GeckoView 153；Instagram 仍使用 WebView。測試 App 已移除。
6. 更新後兩個 APK 均安裝並冷啟動成功，公開登入頁均可見。Instagram Debug 記錄 `isolated-injection-supported=true` 與 `isolated-script-ready`；Facebook 記錄 `gecko-extension-installed`、`gecko-extension-connected`、`gecko-rules-applied`。診斷不含網址路徑、頁面原文、Cookie、Token 或帳密。
7. 使用者在 Facebook App 內自行登入後，實機可見動態牆；登入後記錄 `gecko-extension-connected` 與 `gecko-rules-applied`。沒有記錄畫面中的個人資料或貼文內容。
8. 新增規則 `facebook-open-app-prompt`：Facebook 限定、`text equals 開啟應用程式`、`hide`。Adapter 只將畫面底部寬幅提示納入候選，避免把同文字的貼文當成提示。重新安裝且保留登入資料後，實機確認底部按鈕消失、動態牆仍顯示。
9. Facebook APK 約 511 MiB，因內含 GeckoView 原生引擎。session 重啟、動態牆貼文過濾與互動尚未驗收。

## 結論與下一步

Facebook 空白問題已以 GeckoView 修復；使用者登入後動態牆可見，指定的底部提示隱藏規則已通過實機驗收。Facebook 內容腳本採用 Mozilla [GeckoView 內嵌 WebExtension](https://firefox-source-docs.mozilla.org/mobile/android/geckoview/consumer/web-extensions.html)，只匹配 Facebook HTTPS 網域，規則透過原生訊息傳給腳本。這不等於已驗證一般貼文過濾效果；Instagram 登入與兩站貼文規則仍待驗收。
