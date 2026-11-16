# 人工驗收清單

## Chrome

1. 執行 `npm run build`，於 `chrome://extensions` 開啟開發人員模式，載入 `Build/browser-extension`。
2. 開啟設定，新增 `text contains` 折疊規則，確認儲存成功、重載擴充套件後仍在。
3. 使用者自行登入 Instagram，再測試 Facebook。逐站檢查貼文、動態載入、折疊、暫時顯示、關閉開關後還原。記錄任何選擇器失效。
4. 分別檢查匯出、匯入預覽、取消、錯誤 JSON、重複 ID。

## Android 實機

1. 安裝 `Build/android/SocialFilter-debug.apk`，分別開啟 Instagram 和 Facebook。
2. 使用者自行測試初次登入、雙因素驗證、登出、重啟後 session、連續捲動、按讚與留言。
3. 逐站檢查過濾規則、返回、外部連結、匯入、匯出及清理 WebView 資料。
4. 若登入受阻，記錄 `BLOCKED` 與畫面描述；不可偽裝 User-Agent 或擷取登入資訊。可另行調查 Firefox Android 擴充套件路線。

上述步驟均需人工執行；本地 fixture 與編譯不能取代實站結果。
