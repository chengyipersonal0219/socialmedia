# SocialFilter 本地開發與驗收報告

日期：2026-11-16（Asia/Taipei）

工作目錄：`C:\Users\angus\Documents\ChatGPT\socialmedia`

分支：`main`

| 階段 | 結果 | 測試證據／指令 | 未完成或風險 |
|---|---|---|---|
| P0 可行性 | PARTIAL | Android SM-M115F：Instagram 公開登入頁與隔離注入 PASS；Facebook GeckoView 使用者登入、動態牆與規則傳遞 PASS | Instagram 登入、兩站互動及 Chrome 實站 NOT RUN |
| P1 共用核心 | PASS | `npm run typecheck` PASS；`tests/core.test.ts` 5/5 PASS | 真實 DOM 偵測不在核心測試範圍 |
| P2 桌面擴充 | PARTIAL | `npm run build` PASS；`tests/dom.test.ts` 4/4 PASS；200 個 fixture 約 80 ms | Chrome 載入與兩站實際貼文過濾 NOT RUN；DOM 選擇器需實站驗證 |
| P3 Android | PARTIAL | 兩個獨立 APK 編譯、簽章、安裝與冷啟動 PASS；Facebook 使用者登入、動態牆、底部提示、贊助貼文及 Reels 分頁隱藏 PASS；捲動跳動目前未重現，接近底部後會繼續載入 | Facebook 載入期間仍有短暫空白貼文佔位；Instagram 登入、session、其他貼文與動態牆 Reel 卡片過濾及互動 NOT RUN；手機 ABI 專用 Facebook APK 約 158 MiB |
| P4 規則交換 | PARTIAL | `tests/bundle.test.ts` 1/1 PASS；核心 JSON round-trip、錯誤版本、重複 ID、損壞 JSON 測試 PASS | 兩端 UI 實際匯入／匯出與取消流程 NOT RUN |

## 建置產物

- Chrome 擴充套件：`Build/browser-extension/`，含 MV3 manifest、內容腳本與 Options 頁。
- Instagram APK：`Build/android/SocialFilter-Instagram-debug.apk`，10,486,421 bytes，SHA-256 `E0F571E140B11713D5FAC7297E78D9BBA16E630F6AC1F79CF5A15F187474B504`。
- Facebook APK：`Build/android/SocialFilter-Facebook-debug.apk`，166,101,277 bytes，SHA-256 `9DB105F5D4DEF735F062C0A04D6FBD4703239B2899C0E0C2E3C5530B0C04168D`，只含本機 `armeabi-v7a` 原生程式庫。
- 兩個 APK 以本機 debug key 簽署，分別安裝為 `app.socialfilter.instagram` 與 `app.socialfilter.facebook`；顯式要求 INTERNET，另有 Android 建置時自動加入的 dynamic receiver 權限。

## 本機提交與 Git

- `cac33f6` P0 原型與相容性矩陣
- `c3d4042` P1 規則 Schema 與純函式核心
- `508a761` P2 擴充套件與 DOM Runtime
- `550596d` P3 Android 原型與 APK 建置
- `78558a8` P4 共用 bundle 決策驗證
- `2eb976c` Android 拆分為兩個獨立 App、修正載入提示與固定雙 APK 輸出
- `41011d2` Facebook App 改用 GeckoView，修復空白畫面
- `8e6a5e7` 隱藏 Facebook 底部「開啟應用程式」提示

使用者指定後，後續工作改在 `main` 直接提交及推送，並已寫入根目錄 `AGENTS.md`。沒有執行 CI。

附檔要求禁止遠端寫入，而使用者提供的 AGENTS 指示要求驗收後 push；以使用者指示及後續提供的儲存庫網址為準。未建立 PR 或部署服務。

## 主要限制與下一步

目前可證實的是本地規則決策、fixture DOM 行為、兩個 Android App 的安裝與啟動、Facebook 使用者登入後的動態牆顯示，以及底部提示、明確標示「贊助」的貼文與 Reels 分頁入口在實機隱藏；**不能宣稱整體 MVP 完成**。動態牆 Reel 卡片、其他貼文規則、session 重啟及互動仍需驗收。外部瀏覽器登入狀態不會帶入 App；外部頁面不套用 App 過濾。詳見 `docs/android-device-acceptance.md`。站點改版可能使 Adapter 失效；無法辨識的贊助狀態預設放行。
