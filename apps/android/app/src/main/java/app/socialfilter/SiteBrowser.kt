package app.socialfilter

import android.view.View

interface SiteBrowser {
    val view: View
    val currentUrl: String?
    val canGoBack: Boolean
    fun load()
    fun reload()
    fun goBack()
    fun updateRules(json: String)
    fun clearData(onDone: () -> Unit)
    fun dispose()
}
