# P1 共用核心驗收

結果：**PASS**（本地純函式與 JSON 契約）

## 改動檔案

- `packages/rule-schema/src/index.ts`：版本 1 JSON、驗證、匯入與匯出。
- `packages/filter-core/src/index.ts`：純函式決策。
- `tests/core.test.ts`：規則優先序、站點開關、Unicode、未知值與錯誤匯入。

## 測試與結果

- `npm run typecheck`：PASS。
- `npm run test -- --run tests/core.test.ts`：5 tests PASS。
- Node 與瀏覽器 bundle 的相同決策另見 P4 報告。

## 限制與下一步

核心不依賴 DOM，尚需 Adapter 與真實網站逐站驗證。規則 `contentType=reel` 的實際偵測率依站點 DOM 而定。
