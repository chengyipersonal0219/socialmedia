# P4 規則交換驗收

結果：**PARTIAL**（契約與 bundle 測試通過，雙端 UI 人工交換 NOT RUN）

## 改動檔案

- `tests/bundle.test.ts`：Node、Chrome content bundle 與 Android JS bundle 使用相同 JSON 的決策測試。
- `docs/manual-test-checklist.md`：兩端手動驗收與登入步驟。

## 測試與結果

- `npm run test -- --run tests/bundle.test.ts`：1 test PASS，相同規則在三個執行環境皆隱藏相同 fixture。
- `npm run test -- --run tests/core.test.ts tests/dom.test.ts tests/bundle.test.ts`：10 tests PASS。
- JSON round-trip、損壞 JSON、重複 ID、版本錯誤在核心測試 PASS。取消匯入及雙端 UI 實際交換：**NOT RUN**。

## 限制與下一步

Android 兩個獨立 App 的規則儲存與匯入已編譯，但需在實機分別驗證；它們透過 JSON 手動交換，不自動同步。Chrome Options 需人工載入擴充套件後驗證。兩端 Adapter 實站偵測率仍未知。不可宣稱整體 MVP 完成。
