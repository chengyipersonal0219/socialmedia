# P0 可行性驗收

結果：**PARTIAL**（2026-11-16）

## 改動檔案

- `apps/browser-extension/p0-content.js`：僅記錄候選數量及欄位是否存在的本地原型。
- `tests/fixtures/p0.html`：人工、去識別化 fixture。
- `docs/p0-compatibility-matrix.md`：四種平台與網站組合分別記錄。

## 測試與結果

- `npm run test -- --run tests/dom.test.ts`：P0 fixture 隱藏標記節點測試 PASS。
- Android SDK API 36、JDK 21、Chrome 已找到。後續以 Samsung SM-M115F（Android 12）實測：Instagram 公開登入頁可見、隔離注入就緒；Facebook 兩個網頁入口均空白，停用注入後仍空白。
- Chrome 擴充套件實站及 Android 登入、session、互動、貼文定位：**NOT RUN**。Facebook WebView 畫面顯示：**FAIL**。

## 阻塞與下一步

需使用者在 Chrome 與 Android 實機逐站執行 `docs/manual-test-checklist.md`。Android 登入能否成功仍未知；Facebook 在目前裝置甚至無法顯示頁面，不能視為可交付的手機過濾路線。原型以外的共用核心與桌面版可獨立推進。
