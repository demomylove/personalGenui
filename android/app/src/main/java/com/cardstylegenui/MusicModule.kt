package com.cardstylegenui

import android.content.ComponentName
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class MusicModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "MusicModule"
    }

    @ReactMethod
    fun openNeteaseMusic() {
        val intent = Intent()
        intent.component = ComponentName(
            "com.netease.cloudmusic",
            "com.netease.cloudmusic.activity.MainActivity"
        )
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
