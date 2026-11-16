package app.socialfilter

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.net.Uri
import android.util.Log
import android.webkit.CookieManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebStorage
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

class Browser(
    private val context: Context,
    private val rules: () -> String,
    private val onLoading: (Boolean) -> Unit,
    private val onError: (String) -> Unit
) : SiteBrowser {
    private val origins = setOf("https://www.instagram.com")
    private var bridge: JavaScriptReplyProxy? = null
    override val view: WebView = WebView(context)
    override val currentUrl: String? get() = view.url
    override val canGoBack: Boolean get() = view.canGoBack()

    init {
        view.settings.javaScriptEnabled = true
        view.settings.domStorageEnabled = true
        view.settings.allowFileAccess = false
        view.settings.allowContentAccess = false
        view.settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        CookieManager.getInstance().setAcceptThirdPartyCookies(view, false)
        val isolated = WebViewFeature.isFeatureSupported(WebViewFeature.JS_INJECTION_IN_FRAME_AND_WORLD) &&
            WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)
        diagnostic("isolated-injection-supported=$isolated")
        if (isolated) {
            val world = WebViewCompat.getExecutionWorld(view, "socialfilter")
            val script = context.assets.open("filter.js").bufferedReader().use { it.readText() }
            WebViewCompat.addWebMessageListener(view, "SocialFilterBridge", origins, world) { _, message, sourceOrigin, isMainFrame, replyProxy ->
                if (isMainFrame && allowed(sourceOrigin.toString()) && message.data == "ready") {
                    diagnostic("isolated-script-ready")
                    bridge = replyProxy
                    replyProxy.postMessage(rules())
                }
            }
            WebViewCompat.addJavaScriptOnEvent(view, script, WebViewCompat.INJECTION_EVENT_DOCUMENT_START, origins, world)
        } else onError("此 WebView 不支援安全腳本注入，網頁目前未過濾")
        view.webViewClient = object : WebViewClient() {
            override fun onPageStarted(webView: WebView, url: String, favicon: android.graphics.Bitmap?) {
                bridge = null
                onLoading(true)
                diagnostic("page-started allowed=${allowed(url)}")
            }
            override fun onPageFinished(webView: WebView, url: String) {
                diagnostic("page-finished allowed=${allowed(url)} size=${webView.width}x${webView.height}")
                webView.postDelayed({ onLoading(false) }, 3000)
            }
            override fun shouldOverrideUrlLoading(webView: WebView, request: WebResourceRequest): Boolean {
                if (allowed(request.url.toString())) return false
                if (request.isForMainFrame && request.url.scheme in listOf("http", "https")) {
                    context.startActivity(Intent(Intent.ACTION_VIEW, request.url))
                } else if (request.isForMainFrame) onError("已阻擋不支援的連結")
                return true
            }
            override fun onReceivedError(webView: WebView, request: WebResourceRequest, webError: WebResourceError) {
                if (request.isForMainFrame) {
                    diagnostic("main-frame-error=${webError.errorCode}")
                    onLoading(false)
                    onError("頁面無法載入：${webError.errorCode}")
                }
            }
            override fun onRenderProcessGone(webView: WebView, detail: RenderProcessGoneDetail): Boolean {
                diagnostic("render-process-gone")
                onLoading(false)
                onError("網頁程序已停止。可用外部瀏覽器開啟。")
                return true
            }
        }
    }

    private fun diagnostic(message: String) {
        if ((context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0) Log.i("SocialFilter", message)
    }

    private fun allowed(url: String?): Boolean {
        val uri = Uri.parse(url ?: return false)
        return uri.scheme == "https" && "https://${uri.host}" in origins && (uri.port == -1 || uri.port == 443)
    }

    override fun load() = view.loadUrl("https://www.instagram.com/")
    override fun reload() = view.reload()
    override fun goBack() = view.goBack()
    override fun updateRules(json: String) { if (allowed(view.url)) bridge?.postMessage(json) }
    override fun clearData(onDone: () -> Unit) {
        view.clearCache(true)
        WebStorage.getInstance().deleteAllData()
        CookieManager.getInstance().removeAllCookies { CookieManager.getInstance().flush(); onDone() }
    }
    override fun dispose() = view.destroy()
}
