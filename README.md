# SocialFilter

本地瀏覽器擴充套件與 Android WebView 原型，用共用 TypeScript 規則過濾使用者目前瀏覽的貼文。**真實 Instagram／Facebook 登入和貼文定位尚未驗證，MVP 未完成。**

## 建置與範圍內測試

需要 Node 24、pnpm 11、JDK 21、Android SDK API 36。先安裝依賴：`pnpm install`。目前開發環境的 pnpm 安裝腳本政策會拒絕 esbuild postinstall；本機已安裝套件並使用 `npm run` 指令執行後續步驟。

```powershell
npm run typecheck
npm run test -- --run tests/core.test.ts tests/dom.test.ts tests/bundle.test.ts
npm run build
./scripts/build-android.ps1
```

Chrome 未封裝套件：`Build/browser-extension/`。Android APK：`Build/android/SocialFilter-debug.apk`。後者使用本機 debug key，不適合正式發布。

## 使用與限制

擴充套件只在指定的 IG／FB HTTPS 網域運作。Options 可編輯、啟停、匯入與匯出 JSON 規則。Android App 提供兩個網站分頁及相同 JSON 格式。未知推薦／贊助狀態會放行。所有資料留在本機；不自動登入或擷取憑證。

實站與實機驗收請見 `docs/manual-test-checklist.md`，各階段證據見 `.handoff/codex/social-filter-mvp/`。
