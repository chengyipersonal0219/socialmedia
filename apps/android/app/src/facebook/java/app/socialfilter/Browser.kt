package app.socialfilter

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.net.Uri
import android.util.Log
import org.json.JSONObject
import org.mozilla.geckoview.AllowOrDeny
import org.mozilla.geckoview.GeckoResult
import org.mozilla.geckoview.GeckoRuntime
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.GeckoView
import org.mozilla.geckoview.StorageController
import org.mozilla.geckoview.WebExtension

class Browser(
    private val context: Context,
    private val rules: () -> String,
    private val onLoading: (Boolean) -> Unit,
    private val onError: (String) -> Unit
) : SiteBrowser {
    companion object {
        private var sharedRuntime: GeckoRuntime? = null
        private const val HOME = "https://m.facebook.com/"
        private const val EXTENSION = "resource://android/assets/socialfilter/"
    }

    private val runtime = sharedRuntime ?: GeckoRuntime.create(context.applicationContext).also { sharedRuntime = it }
    private val session = GeckoSession()
    private var port: WebExtension.Port? = null
    private var location: String? = HOME
    private var backAvailable = false
    override val view: GeckoView = GeckoView(context)
    override val currentUrl: String? get() = location
    override val canGoBack: Boolean get() = backAvailable

    init {
        session.setNavigationDelegate(object : GeckoSession.NavigationDelegate {
            override fun onCanGoBack(session: GeckoSession, canGoBack: Boolean) {
                backAvailable = canGoBack
            }
            override fun onLoadRequest(session: GeckoSession, request: GeckoSession.NavigationDelegate.LoadRequest): GeckoResult<AllowOrDeny>? {
                val uri = Uri.parse(request.uri)
                if (uri.scheme == "https" && uri.host in setOf("facebook.com", "www.facebook.com", "m.facebook.com") && (uri.port == -1 || uri.port == 443)) {
                    location = request.uri
                    return null
                }
                if (uri.scheme in listOf("http", "https")) context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                else onError("已阻擋不支援的連結")
                return GeckoResult.fromValue(AllowOrDeny.DENY)
            }
        })
        session.setProgressDelegate(object : GeckoSession.ProgressDelegate {
            override fun onPageStart(session: GeckoSession, url: String) { onLoading(true) }
            override fun onPageStop(session: GeckoSession, success: Boolean) {
                onLoading(false)
                if (!success) onError("Facebook 頁面無法載入")
            }
        })
        session.open(runtime)
        view.setSession(session)
        val delegate = object : WebExtension.MessageDelegate {
            override fun onConnect(connected: WebExtension.Port) {
                port = connected
                connected.setDelegate(object : WebExtension.PortDelegate {
                    override fun onPortMessage(message: Any, source: WebExtension.Port) {
                        if (message is JSONObject && message.optString("type") == "rules-applied") diagnostic("gecko-rules-applied")
                    }
                    override fun onDisconnect(disconnected: WebExtension.Port) {
                        if (port == disconnected) port = null
                    }
                })
                connected.postMessage(JSONObject().put("rules", rules()))
                diagnostic("gecko-extension-connected")
            }
        }
        runtime.webExtensionController.ensureBuiltIn(EXTENSION, "facebook@socialfilter.app").accept(
            { extension ->
                if (extension != null) {
                    session.webExtensionController.setMessageDelegate(extension, delegate, "socialfilter")
                    diagnostic("gecko-extension-installed")
                } else onError("過濾擴充套件無法啟動")
                session.loadUri(HOME)
            },
            { exception ->
                onError("過濾擴充套件無法啟動：${exception?.message}")
                session.loadUri(HOME)
            }
        )
    }

    private fun diagnostic(message: String) {
        if ((context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0) Log.i("SocialFilter", message)
    }

    override fun load() { /* The first page loads after extension registration. */ }
    override fun reload() = session.reload()
    override fun goBack() = session.goBack()
    override fun updateRules(json: String) { port?.postMessage(JSONObject().put("rules", json)) }
    override fun clearData(onDone: () -> Unit) {
        session.close()
        port = null
        runtime.storageController.clearData(StorageController.ClearFlags.SITE_DATA).accept(
            { session.open(runtime); view.setSession(session); session.loadUri(HOME); onDone() },
            { exception -> onError("清理失敗：${exception?.message}") }
        )
    }
    override fun dispose() { port?.disconnect(); session.close() }
}
