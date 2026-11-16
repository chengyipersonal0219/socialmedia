# SocialFilter 架構

- `packages/rule-schema`：版本 1 的 JSON 契約、驗證、匯入與匯出。外來設定驗證失敗時保留上一份有效規則。
- `packages/filter-core`：純函式決策；允許優先於隱藏，隱藏優先於折疊。缺失或未知欄位一律不命中。
- `packages/site-adapters`：僅讀取 IG／FB 已載入的明確貼文容器，結構無法確認時放行。網站 DOM 的實際相容性尚未驗證。
- `packages/dom-runtime`：初次掃描、MutationObserver 批次處理、折疊提示、暫時顯示與還原。
- `apps/browser-extension`：Chrome MV3 限定站點 content script 與本機 Options UI。
- `apps/android`：Instagram／Facebook 兩個 product flavor，分別有獨立安裝識別、圖示、私有規則儲存與 WebView；共用同一份 TS bundle。原生端只儲存及驗證 JSON，不處理網站資料。

Android 使用 AndroidX WebKit 的隔離 JavaScript 執行環境、document start 注入與受限來源訊息通道，避免網站腳本直接讀取規則。若裝置不支援隔離執行環境，App 會顯示未過濾狀態。僅允許 `https://www.instagram.com`、`https://www.facebook.com`、`https://m.facebook.com`。沒有任何登入資料橋接或記錄功能。
