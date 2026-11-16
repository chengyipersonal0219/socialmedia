# SocialFilter 本地開發與驗收報告

日期：2026-11-16（Asia/Taipei）

工作目錄：`C:\Users\angus\Documents\ChatGPT\socialmedia`

分支：`codex/social-filter-mvp`

| 階段 | 結果 | 測試證據／指令 | 未完成或風險 |
|---|---|---|---|
| P0 可行性 | PARTIAL | `tests/fixtures/p0.html` 的標記隱藏測試 PASS；SDK、Chrome、JDK 已盤點 | IG／FB × Chrome／Android 的實站登入與互動 NOT RUN；`adb devices` 無裝置 |
| P1 共用核心 | PASS | `npm run typecheck` PASS；`tests/core.test.ts` 5/5 PASS | 真實 DOM 偵測不在核心測試範圍 |
| P2 桌面擴充 | PARTIAL | `npm run build` PASS；`tests/dom.test.ts` 4/4 PASS；200 個 fixture 約 80 ms | Chrome 載入與兩站實際貼文過濾 NOT RUN；DOM 選擇器需實站驗證 |
| P3 Android | PARTIAL | `./scripts/build-android.ps1` PASS；`aapt dump badging` 確認 APK package 與 SDK 版本 | 實機 WebView 載入、登入、session、注入與互動 NOT RUN；裝置若無隔離 JS 功能會顯示未過濾 |
| P4 規則交換 | PARTIAL | `tests/bundle.test.ts` 1/1 PASS；核心 JSON round-trip、錯誤版本、重複 ID、損壞 JSON 測試 PASS | 兩端 UI 實際匯入／匯出與取消流程 NOT RUN |

## 建置產物

- Chrome 擴充套件：`Build/browser-extension/`，含 MV3 manifest、內容腳本與 Options 頁。
- Android APK：`Build/android/SocialFilter-debug.apk`，10,484,680 bytes，SHA-256 `E27D46D3DB6C13523AED9290964310AFEFA4F3F359B891B6882BE3430242AED5`。
- APK 以本機 debug key 簽署；顯式要求 INTERNET，另有 Android 建置時自動加入的 dynamic receiver 權限。

## 本機提交與 Git

- `cac33f6` P0 原型與相容性矩陣
- `c3d4042` P1 規則 Schema 與純函式核心
- `508a761` P2 擴充套件與 DOM Runtime
- `550596d` P3 Android 原型與 APK 建置
- `78558a8` P4 共用 bundle 決策驗證

使用者提供遠端網址後，已設定 `origin` 為 `https://github.com/chengyipersonal0219/socialmedia.git`，並推送 `codex/social-filter-mvp` 分支。沒有執行 CI。

附檔要求禁止遠端寫入，而使用者提供的 AGENTS 指示要求驗收後 push；以使用者指示及後續提供的儲存庫網址為準。未建立 PR 或部署服務。

## 主要限制與下一步

目前可證實的是本地規則決策、fixture DOM 行為及 Android 編譯；**不能宣稱整體 MVP 完成**。使用者需依 `docs/manual-test-checklist.md` 自行在 Chrome 與 Android 實機逐站測試登入、動態牆、互動、設定 UI 及雙向 JSON 交換。Android 若阻擋登入，記錄 `BLOCKED`，再評估 Firefox Android 擴充套件路線。站點改版可能使 Adapter 失效；未知推薦或贊助狀態預設放行。
