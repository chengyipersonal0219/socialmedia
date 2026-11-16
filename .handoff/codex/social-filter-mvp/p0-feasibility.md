# P0 可行性驗收

結果：**PARTIAL**（2026-11-16）

## 改動檔案

- `apps/browser-extension/p0-content.js`：僅記錄候選數量及欄位是否存在的本地原型。
- `tests/fixtures/p0.html`：人工、去識別化 fixture。
- `docs/p0-compatibility-matrix.md`：四種平台與網站組合分別記錄。

## 測試與結果

- `npm run test -- --run tests/dom.test.ts`：P0 fixture 隱藏標記節點測試 PASS。
- Android SDK API 36、JDK 21、Chrome 已找到。`adb devices` 沒有連接裝置。
- Chrome 擴充套件與 Android 原型的實站載入、登入、session、互動、貼文定位：**NOT RUN**。

## 阻塞與下一步

需使用者在自己的 Chrome 與 Android 實機逐站執行 `docs/manual-test-checklist.md`。尤其 Android WebView 登入能否成功仍未知；編譯成功不代表可登入。原型以外的共用核心與桌面版可獨立推進。
