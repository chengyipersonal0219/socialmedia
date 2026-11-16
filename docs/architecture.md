# SocialFilter 架構

- `packages/rule-schema`：版本 1 的 JSON 契約、驗證、匯入與匯出。外來設定驗證失敗時保留上一份有效規則。
- `packages/filter-core`：純函式決策；允許優先於隱藏，隱藏優先於折疊。缺失或未知欄位一律不命中。
- `packages/site-adapters`：讀取 IG 已載入的明確貼文容器；Facebook 手機頁以標頭的「贊助」標記定位貼文容器，並辨識 Reels 分頁、連結與區塊。結構無法確認時放行，其他貼文類型仍需實站驗證。
- `packages/dom-runtime`：初次掃描、MutationObserver 批次處理、折疊提示、暫時顯示與還原。
- `apps/browser-extension`：Chrome MV3 限定站點 content script 與本機 Options UI。
- `apps/android`：Instagram／Facebook 兩個 product flavor，分別有獨立安裝識別、圖示與私有規則儲存。Instagram 使用 WebView；Facebook 使用 GeckoView 與內嵌 WebExtension。兩者共用規則 Schema、Filter Core 與 DOM Runtime；原生端只儲存及驗證 JSON，不處理網站資料。

Instagram 使用 AndroidX WebKit 的隔離 JavaScript 執行環境、document start 注入與受限來源訊息通道；不支援隔離執行環境時會顯示未過濾狀態。Facebook 使用 GeckoView 的內嵌 WebExtension，內容腳本只匹配 Facebook HTTPS 網域，規則經由原生訊息傳遞。沒有任何登入資料橋接或記錄功能。
