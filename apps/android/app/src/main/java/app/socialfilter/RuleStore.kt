package app.socialfilter

import android.content.Context
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

object RuleStore {
    private const val FILE_NAME = "rules.json"
    val defaultJson: String = """{"schemaVersion":1,"settings":{"enabled":true,"sites":{"instagram":true,"facebook":true}},"rules":[{"id":"facebook-open-app-prompt","enabled":true,"sites":["facebook"],"match":{"field":"text","operator":"equals","value":"開啟應用程式"},"action":"hide"}]}"""

    fun validate(raw: String): JSONObject {
        val root = JSONObject(raw)
        require(root.get("schemaVersion") is Int && root.getInt("schemaVersion") == 1) { "不支援的規則版本" }
        val settings = root.optJSONObject("settings") ?: JSONObject(defaultJson).getJSONObject("settings")
        require(settings.get("enabled") is Boolean) { "總開關格式錯誤" }
        val siteSettings = settings.getJSONObject("sites")
        require(siteSettings.get("instagram") is Boolean && siteSettings.get("facebook") is Boolean) { "網站開關格式錯誤" }
        val rules = root.getJSONArray("rules")
        val ids = mutableSetOf<String>()
        for (index in 0 until rules.length()) {
            val rule = rules.getJSONObject(index)
            val id = rule.getString("id")
            require(id.isNotBlank() && ids.add(id)) { "規則 ID 空白或重複" }
            require(rule.get("enabled") is Boolean) { "規則開關格式錯誤" }
            val sites = rule.getJSONArray("sites")
            require(sites.length() > 0) { "至少選一個網站" }
            val seenSites = mutableSetOf<String>()
            for (siteIndex in 0 until sites.length()) {
                val site = sites.getString(siteIndex)
                require(site in listOf("instagram", "facebook") && seenSites.add(site)) { "網站範圍錯誤" }
            }
            val match = rule.getJSONObject("match")
            val field = match.getString("field")
            val operator = match.getString("operator")
            val value = match.get("value")
            require(field in listOf("text", "authorHandle", "contentType", "isRecommended", "isSponsored")) { "欄位錯誤" }
            require(operator in listOf("contains", "equals")) { "運算子錯誤" }
            if (field in listOf("isRecommended", "isSponsored")) require(operator == "equals" && value is Boolean) { "布林條件錯誤" }
            else require(value is String && value.isNotBlank()) { "條件值不可空白" }
            if (field == "contentType") require(value in listOf("post", "reel", "story")) { "內容類型錯誤" }
            require(rule.getString("action") in listOf("allow", "collapse", "hide")) { "動作錯誤" }
        }
        return JSONObject().put("schemaVersion", 1).put("settings", settings).put("rules", rules)
    }

    fun read(context: Context): String {
        val file = AtomicFile(File(context.filesDir, FILE_NAME))
        val raw = try { file.openRead().bufferedReader().use { it.readText() } } catch (_: java.io.FileNotFoundException) { return defaultJson }
        return try { validate(raw).toString() } catch (_: Exception) {
            File(context.filesDir, "rules-invalid.json").writeText(raw)
            defaultJson
        }
    }

    fun save(context: Context, raw: String): String {
        val validated = validate(raw).toString()
        val file = AtomicFile(File(context.filesDir, FILE_NAME))
        val output = file.startWrite()
        try {
            output.write(validated.toByteArray(Charsets.UTF_8))
            file.finishWrite(output)
        } catch (exception: Exception) {
            file.failWrite(output)
            throw exception
        }
        return validated
    }

    fun replaceRules(current: String, rules: JSONArray): String = validate(JSONObject(current).put("rules", rules).toString()).toString()
}
