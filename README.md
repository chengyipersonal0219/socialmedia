# SocialFilter

本地瀏覽器擴充套件與兩個 Android App，用共用 TypeScript 規則過濾使用者目前瀏覽的貼文。Facebook App 已由使用者登入並顯示動態牆；**貼文定位與過濾仍未驗證，MVP 未完成。**

## 建置與範圍內測試

需要 Node 24、pnpm 11、JDK 21、Android SDK API 36。先以 `pnpm install --frozen-lockfile --ignore-scripts` 安裝依賴；此命令在目前環境通過，esbuild 平台執行檔仍可用。一般 `pnpm install` 會受目前環境的套件安裝腳本政策阻擋。後續使用 `npm run` 執行腳本。

```powershell
npm run typecheck
npm run test -- --run tests/core.test.ts tests/dom.test.ts tests/bundle.test.ts
npm run build
./scripts/build-android.ps1
```

Chrome 未封裝套件：`Build/browser-extension/`。Android 有兩個獨立 App：`Build/android/SocialFilter-Instagram-debug.apk` 與 `Build/android/SocialFilter-Facebook-debug.apk`。兩者使用本機 debug key，不適合正式發布。

## 使用與限制

擴充套件只在指定的 IG／FB HTTPS 網域運作。Options 可編輯、啟停、匯入與匯出 JSON 規則。兩個 Android App 各自只開啟對應網站，規則存於各自的 App 私有儲存，並使用相同 JSON 格式手動交換。未知推薦／贊助狀態會放行。所有資料留在本機；不自動登入或擷取憑證。

實機 SM-M115F 上，Instagram 使用 WebView、Facebook 使用 GeckoView，兩個公開登入頁均可顯示；Facebook App 已由使用者登入，動態牆可見，內嵌擴充套件已接收規則。Facebook 預設包含一條只作用於底部「開啟應用程式」提示的隱藏規則，實機已確認提示消失、動態牆仍顯示。Facebook APK 包含 GeckoView 原生引擎，約 511 MiB。外部瀏覽器登入狀態不會自動帶進 App；外部瀏覽器頁面不套用 App 過濾規則。

實站與實機驗收請見 `docs/manual-test-checklist.md` 與 `docs/android-device-acceptance.md`，各階段證據見 `.handoff/codex/social-filter-mvp/`。
