# SocialFilter 本地開發與驗收報告

日期：2026-11-16（Asia/Taipei）

工作目錄：`C:\Users\angus\Documents\ChatGPT\socialmedia`

分支：`codex/social-filter-mvp`

| 階段 | 結果 | 測試證據／指令 | 未完成或風險 |
|---|---|---|---|
| P0 可行性 | PARTIAL | Android SM-M115F：Instagram 公開登入頁與隔離注入 PASS；Facebook 注入 PASS、畫面空白 FAIL | 兩站登入與互動 NOT RUN；Chrome 實站 NOT RUN |
| P1 共用核心 | PASS | `npm run typecheck` PASS；`tests/core.test.ts` 5/5 PASS | 真實 DOM 偵測不在核心測試範圍 |
| P2 桌面擴充 | PARTIAL | `npm run build` PASS；`tests/dom.test.ts` 4/4 PASS；200 個 fixture 約 80 ms | Chrome 載入與兩站實際貼文過濾 NOT RUN；DOM 選擇器需實站驗證 |
| P3 Android | PARTIAL | Instagram／Facebook 兩個獨立 APK 編譯、簽章、安裝、冷啟動 PASS；隔離注入均回報就緒 | Facebook WebView 畫面空白 FAIL；兩站登入、session、動態牆過濾與互動 NOT RUN |
| P4 規則交換 | PARTIAL | `tests/bundle.test.ts` 1/1 PASS；核心 JSON round-trip、錯誤版本、重複 ID、損壞 JSON 測試 PASS | 兩端 UI 實際匯入／匯出與取消流程 NOT RUN |

## 建置產物

- Chrome 擴充套件：`Build/browser-extension/`，含 MV3 manifest、內容腳本與 Options 頁。
- Instagram APK：`Build/android/SocialFilter-Instagram-debug.apk`，10,432,462 bytes，SHA-256 `B76F801E68A6C949673AE8DF059BB79869741CE8AED216D4FC245F3565926D71`。
- Facebook APK：`Build/android/SocialFilter-Facebook-debug.apk`，10,432,342 bytes，SHA-256 `064CC6BD7FFEEA901EF5014715D0896DCC237A2E4DEDDBE5A4D27BBEC0F0C286`。
- 兩個 APK 以本機 debug key 簽署，分別安裝為 `app.socialfilter.instagram` 與 `app.socialfilter.facebook`；顯式要求 INTERNET，另有 Android 建置時自動加入的 dynamic receiver 權限。

## 本機提交與 Git

- `cac33f6` P0 原型與相容性矩陣
- `c3d4042` P1 規則 Schema 與純函式核心
- `508a761` P2 擴充套件與 DOM Runtime
- `550596d` P3 Android 原型與 APK 建置
- `78558a8` P4 共用 bundle 決策驗證
- `2eb976c` Android 拆分為兩個獨立 App、修正載入提示與固定雙 APK 輸出

使用者提供遠端網址後，已設定 `origin` 為 `https://github.com/chengyipersonal0219/socialmedia.git`，並推送 `codex/social-filter-mvp` 分支。沒有執行 CI。

附檔要求禁止遠端寫入，而使用者提供的 AGENTS 指示要求驗收後 push；以使用者指示及後續提供的儲存庫網址為準。未建立 PR 或部署服務。

## 主要限制與下一步

目前可證實的是本地規則決策、fixture DOM 行為、兩個 Android App 的安裝與啟動，以及 Instagram 公開頁顯示；**不能宣稱整體 MVP 完成**。Facebook 在這台裝置的 WebView 呈現空白，停用過濾腳本也一樣，須保留 FAIL。使用者需依 `docs/manual-test-checklist.md` 自行測試 Instagram 登入、動態牆、互動、設定 UI 與 JSON 交換；Facebook 應另行評估行動瀏覽器擴充套件路線。詳見 `docs/android-device-acceptance.md`。站點改版可能使 Adapter 失效；未知推薦或贊助狀態預設放行。
