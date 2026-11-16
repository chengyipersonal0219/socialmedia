package app.socialfilter

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.webkit.CookieManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebStorage
import android.webkit.RenderProcessGoneDetail
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import androidx.webkit.JavaScriptReplyProxy
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { SocialFilterApp() } }
    }
}

private val targetSite = BuildConfig.SITE
private val siteLabel = if (targetSite == "instagram") "Instagram" else "Facebook"
private val targetUrl = if (targetSite == "instagram") "https://www.instagram.com/" else "https://m.facebook.com/"
private val allowedOrigins = if (targetSite == "instagram") setOf("https://www.instagram.com")
    else setOf("https://www.facebook.com", "https://m.facebook.com")

private fun debugDiagnostic(context: android.content.Context, message: String) {
    if ((context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0) Log.i("SocialFilter", message)
}

private fun allowed(url: String?): Boolean {
    val uri = Uri.parse(url ?: return false)
    return uri.scheme == "https" && "https://${uri.host}" in allowedOrigins && (uri.port == -1 || uri.port == 443)
}

@Composable
private fun SocialFilterApp() {
    val context = LocalContext.current
    val rulesJson = remember { mutableStateOf(RuleStore.read(context)) }
    val settingsOpen = remember { mutableStateOf(false) }
    val loading = remember { mutableStateOf(true) }
    val error = remember { mutableStateOf("") }
    val pendingImport = remember { mutableStateOf<String?>(null) }
    val bridgeProxy = remember { mutableStateOf<JavaScriptReplyProxy?>(null) }
    val script = remember { context.assets.open("filter.js").bufferedReader().use { it.readText() } }

    fun save(raw: String): Boolean {
        return try { rulesJson.value = RuleStore.save(context, raw); error.value = "規則已儲存"; true }
        catch (exception: Exception) { error.value = "儲存失敗：${exception.message}"; false }
    }

    val webView = remember {
        WebView(context).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, false)
            val isolatedInjection = WebViewFeature.isFeatureSupported(WebViewFeature.JS_INJECTION_IN_FRAME_AND_WORLD) &&
                WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)
            debugDiagnostic(context, "isolated-injection-supported=$isolatedInjection")
            if (isolatedInjection) {
                val world = WebViewCompat.getExecutionWorld(this, "socialfilter")
                WebViewCompat.addWebMessageListener(this, "SocialFilterBridge", allowedOrigins, world) { _, message, sourceOrigin, isMainFrame, replyProxy ->
                    if (isMainFrame && allowed(sourceOrigin.toString()) && message.data == "ready") {
                        debugDiagnostic(context, "isolated-script-ready")
                        bridgeProxy.value = replyProxy
                        replyProxy.postMessage(rulesJson.value)
                    }
                }
                WebViewCompat.addJavaScriptOnEvent(this, script, WebViewCompat.INJECTION_EVENT_DOCUMENT_START, allowedOrigins, world)
            } else error.value = "此 WebView 不支援安全腳本注入，網頁目前未過濾"
            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                    bridgeProxy.value = null
                    loading.value = true
                    debugDiagnostic(context, "page-started allowed=${allowed(url)}")
                }
                override fun onPageFinished(view: WebView, url: String) {
                    debugDiagnostic(context, "page-finished allowed=${allowed(url)} size=${view.width}x${view.height}")
                    view.postDelayed({ loading.value = false }, 3000)
                    if (targetSite == "facebook" && error.value.isEmpty()) error.value = "若 Facebook 畫面空白，可用外部瀏覽器開啟；外部頁面不套用過濾。"
                }
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    if (allowed(request.url.toString())) return false
                    if (request.isForMainFrame && request.url.scheme in listOf("http", "https")) {
                        context.startActivity(Intent(Intent.ACTION_VIEW, request.url))
                    } else if (request.isForMainFrame) error.value = "已阻擋不支援的連結"
                    return true
                }
                override fun onReceivedError(view: WebView, request: WebResourceRequest, webError: WebResourceError) {
                    if (request.isForMainFrame) {
                        debugDiagnostic(context, "main-frame-error=${webError.errorCode}")
                        loading.value = false
                        error.value = "頁面無法載入：${webError.errorCode}"
                    }
                }
                override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                    debugDiagnostic(context, "render-process-gone")
                    loading.value = false
                    error.value = "網頁程序已停止。可用外部瀏覽器開啟。"
                    return true
                }
            }
        }
    }

    val importLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) try {
            val raw = context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() } ?: kotlin.error("無法讀取檔案")
            val parsed = RuleStore.validate(raw)
            pendingImport.value = parsed.toString()
        } catch (exception: Exception) { error.value = "匯入失敗：${exception.message}" }
    }
    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) try {
            context.contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { it.write(rulesJson.value) } ?: kotlin.error("無法寫入檔案")
            error.value = "已匯出規則"
        } catch (exception: Exception) { error.value = "匯出失敗：${exception.message}" }
    }

    LaunchedEffect(Unit) { webView.loadUrl(targetUrl) }
    LaunchedEffect(rulesJson.value) {
        if (allowed(webView.url)) bridgeProxy.value?.postMessage(rulesJson.value)
    }
    DisposableEffect(webView) { onDispose { webView.destroy() } }
    BackHandler(settingsOpen.value || webView.canGoBack()) {
        if (settingsOpen.value) settingsOpen.value = false else webView.goBack()
    }

    Column(Modifier.fillMaxSize()) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(8.dp)) {
            Text(siteLabel, modifier = Modifier.weight(1f))
            Button(onClick = { webView.reload() }) { Text("重新載入") }
            Button(onClick = { settingsOpen.value = !settingsOpen.value }) { Text(if (settingsOpen.value) "返回" else "設定") }
        }
        if (error.value.isNotEmpty()) {
            Row(modifier = Modifier.padding(horizontal = 8.dp)) {
                Text(error.value, modifier = Modifier.weight(1f))
                TextButton(onClick = { if (allowed(webView.url)) context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(webView.url))) }) { Text("外部瀏覽器") }
            }
        }
        if (loading.value && !settingsOpen.value) Text("$siteLabel 載入中…", modifier = Modifier.padding(horizontal = 12.dp))
        if (settingsOpen.value) {
            SettingsScreen(targetSite, rulesJson.value, ::save, { error.value = it }, { importLauncher.launch(arrayOf("application/json")) }, { exportLauncher.launch("socialfilter-rules.json") }, {
                webView.clearCache(true)
                WebStorage.getInstance().deleteAllData()
                CookieManager.getInstance().removeAllCookies {
                    CookieManager.getInstance().flush()
                    error.value = "已清理 WebView 資料"
                }
            })
        } else AndroidView(factory = { webView }, modifier = Modifier.weight(1f).fillMaxWidth())
    }
    pendingImport.value?.let { imported ->
        val count = JSONObject(imported).getJSONArray("rules").length()
        AlertDialog(onDismissRequest = { pendingImport.value = null }, title = { Text("匯入規則") },
            text = { Text("以 $count 條規則取代目前設定？") },
            confirmButton = { TextButton(onClick = { if (save(imported)) pendingImport.value = null }) { Text("取代") } },
            dismissButton = { TextButton(onClick = { pendingImport.value = null }) { Text("取消") } })
    }
}

@Composable
private fun SettingsScreen(site: String, json: String, onSave: (String) -> Boolean, onError: (String) -> Unit, onImport: () -> Unit, onExport: () -> Unit, onClear: () -> Unit) {
    val root = remember(json) { JSONObject(json) }
    val rules = root.getJSONArray("rules")
    val settings = root.getJSONObject("settings")
    val siteSettings = settings.getJSONObject("sites")
    val editing = remember { mutableStateOf(-1) }
    val id = remember { mutableStateOf("") }
    val value = remember { mutableStateOf("") }
    val enabled = remember { mutableStateOf(true) }
    val field = remember { mutableStateOf("text") }
    val operator = remember { mutableStateOf("contains") }
    val action = remember { mutableStateOf("collapse") }

    fun edit(index: Int) {
        editing.value = index
        val rule = if (index >= 0) rules.getJSONObject(index) else null
        id.value = rule?.getString("id") ?: ""
        value.value = rule?.optJSONObject("match")?.get("value")?.toString() ?: ""
        enabled.value = rule?.getBoolean("enabled") ?: true
        field.value = rule?.getJSONObject("match")?.getString("field") ?: "text"
        operator.value = rule?.getJSONObject("match")?.getString("operator") ?: "contains"
        action.value = rule?.getString("action") ?: "collapse"
    }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("過濾開關", style = MaterialTheme.typography.titleLarge)
        listOf("過濾總開關" to "enabled", "$siteLabel 過濾" to site).forEach { (label, key) ->
            val checked = if (key == "enabled") settings.getBoolean("enabled") else siteSettings.getBoolean(key)
            Row { Checkbox(checked = checked, onCheckedChange = { selected ->
                val updated = JSONObject(json)
                val updatedSettings = updated.getJSONObject("settings")
                if (key == "enabled") updatedSettings.put("enabled", selected) else updatedSettings.getJSONObject("sites").put(key, selected)
                onSave(updated.toString())
            }); Text(label) }
        }
        Text("規則", style = MaterialTheme.typography.titleLarge)
        for (index in 0 until rules.length()) {
            val rule = rules.getJSONObject(index)
            if (!rule.getJSONArray("sites").toString().contains(site)) continue
            Row { Text("${rule.getString("id")} · ${rule.getString("action")}", modifier = Modifier.weight(1f))
                TextButton(onClick = { edit(index) }) { Text("編輯") }
                TextButton(onClick = {
                    val next = JSONArray()
                    for (position in 0 until rules.length()) if (position != index) next.put(rules.get(position))
                    if (onSave(RuleStore.replaceRules(json, next))) edit(-1)
                }) { Text("刪除") }
            }
        }
        Text(if (editing.value >= 0) "編輯規則" else "新增規則", style = MaterialTheme.typography.titleMedium)
        OutlinedTextField(id.value, { id.value = it }, label = { Text("規則 ID") }, modifier = Modifier.fillMaxWidth())
        Row { Checkbox(enabled.value, { enabled.value = it }); Text("啟用") }
        Button(onClick = {
            val fields = listOf("text", "authorHandle", "contentType", "isRecommended", "isSponsored")
            field.value = fields[(fields.indexOf(field.value) + 1) % fields.size]
            if (field.value in listOf("isRecommended", "isSponsored")) { operator.value = "equals"; value.value = "true" }
        }) { Text("欄位：${field.value}") }
        Button(enabled = field.value !in listOf("isRecommended", "isSponsored"), onClick = { operator.value = if (operator.value == "contains") "equals" else "contains" }) { Text("運算子：${operator.value}") }
        OutlinedTextField(value.value, { value.value = it }, label = { Text("比對值") }, modifier = Modifier.fillMaxWidth())
        Button(onClick = { action.value = when (action.value) { "collapse" -> "hide"; "hide" -> "allow"; else -> "collapse" } }) { Text("動作：${action.value}") }
        Button(onClick = {
            try {
                val sites = if (editing.value >= 0) rules.getJSONObject(editing.value).getJSONArray("sites") else JSONArray().put(site)
                val typedValue: Any = if (field.value in listOf("isRecommended", "isSponsored")) {
                    require(value.value in listOf("true", "false")) { "請輸入 true 或 false" }
                    value.value.toBoolean()
                } else value.value
                val rule = JSONObject().put("id", id.value).put("enabled", enabled.value).put("sites", sites)
                    .put("match", JSONObject().put("field", field.value).put("operator", operator.value).put("value", typedValue))
                    .put("action", action.value)
                val next = JSONArray()
                for (index in 0 until rules.length()) next.put(if (index == editing.value) rule else rules.get(index))
                if (editing.value < 0) next.put(rule)
                if (onSave(RuleStore.replaceRules(json, next))) edit(-1)
            } catch (exception: Exception) { onError("規則無效：${exception.message}") }
        }) { Text("儲存規則") }
        Text("推薦與贊助偵測若無法辨識，會保留原始貼文。")
        Row { Button(onClick = onImport) { Text("匯入 JSON") }; Button(onClick = onExport) { Text("匯出 JSON") } }
        Button(onClick = onClear) { Text("清理 WebView 資料") }
    }
}
