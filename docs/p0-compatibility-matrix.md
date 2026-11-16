# P0 相容性矩陣

| 平台與網站 | 頁面載入 | 登入 | Session 重啟 | 注入 | 貼文定位 | 互動 | 結論 |
|---|---|---|---|---|---|---|---|
| Chrome × Instagram | NOT RUN | NOT RUN | NOT RUN | 原型已建置，實站 NOT RUN | NOT RUN | NOT RUN | PARTIAL |
| Chrome × Facebook | NOT RUN | NOT RUN | NOT RUN | 原型已建置，實站 NOT RUN | NOT RUN | NOT RUN | PARTIAL |
| Android WebView × Instagram | 公開登入頁 PASS | NOT RUN | NOT RUN | 隔離注入就緒 PASS | NOT RUN | NOT RUN | PARTIAL |
| Android WebView × Facebook | 頁面完成載入但畫面空白 FAIL | NOT RUN | NOT RUN | 隔離注入就緒 PASS | NOT RUN | NOT RUN | FAIL |
| Android GeckoView × Facebook | 公開登入頁 PASS | NOT RUN | NOT RUN | 內嵌擴充套件接收規則 PASS | NOT RUN | NOT RUN | PARTIAL |

登入、雙因素驗證、登出、連續捲動、按讚與留言僅能由使用者在實機手動檢查。不得以 fixture 或編譯結果取代實站驗證。

Android 實測裝置：Samsung SM-M115F、Android 12（API 31）、WebView 157.0.8103.38。Facebook 於 WebView 的 `www.facebook.com` 和 `m.facebook.com` 均呈現空白；暫停過濾腳本後仍空白。Facebook 獨立 App 改用 GeckoView 後顯示公開登入頁，詳見 `docs/android-device-acceptance.md`。
