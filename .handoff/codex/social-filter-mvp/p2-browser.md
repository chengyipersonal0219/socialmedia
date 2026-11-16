# P2 桌面擴充套件驗收

結果：**PARTIAL**（本地 bundle 與 fixture 通過，Chrome 實站 NOT RUN）

## 改動檔案

- `packages/site-adapters/src/index.ts`：分站 DOM Adapter。
- `packages/dom-runtime/src/index.ts`：批次觀察、折疊、暫時顯示及還原。
- `apps/browser-extension/`：MV3 content script、Options UI、規則本機儲存與 JSON 交換。
- `scripts/build.mjs`：固定輸出 `Build/browser-extension/`。
- `tests/dom.test.ts`：人工 fixture、動態貼文與節點復用。

## 測試與結果

- `npm run build`：PASS，`Build/browser-extension/manifest.json`、`content.js`、`options.html`、`options.js` 已產生。
- `npm run test -- --run tests/dom.test.ts --reporter=verbose`：4 tests PASS。200 個人工貼文的處理時間約 80 ms（本機 jsdom 單次測量），不能推論實站效能。
- Chrome 中載入未封裝套件、Options 手動操作、Instagram／Facebook 實站：**NOT RUN**。

## 限制與下一步

網站選擇器尚未經登入後實站驗證。推薦／贊助欄位預設 `unknown`，不會錯誤隱藏。部分以 CSS 隱藏但不帶 `hidden` 或 `aria-hidden` 的文字仍可能被讀取；需在實站驗收調整。依 `docs/manual-test-checklist.md` 逐站測試。
