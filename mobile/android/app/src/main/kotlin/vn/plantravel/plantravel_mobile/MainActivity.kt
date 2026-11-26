package vn.plantravel.plantravel_mobile

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import android.Manifest
import android.os.Build
import android.content.Intent
import android.content.pm.PackageManager

class MainActivity : FlutterActivity() {
    private var notificationResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "plantravel/location").setMethodCallHandler { call, result ->
            when (call.method) {
                "notificationPermission" -> {
                    if (Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) result.success(true)
                    else if (notificationResult != null) result.error("BUSY", "Đang xin quyền thông báo.", null)
                    else {
                        notificationResult = result
                        requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 710)
                    }
                }
                "start" -> {
                    try {
                        val args = call.arguments as Map<*, *>
                        val intent = Intent(this, TripLocationService::class.java)
                        for (key in listOf("apiBase", "executionId", "token")) intent.putExtra(key, args[key] as String)
                        if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent) else startService(intent)
                        result.success(null)
                    } catch (error: Exception) { result.error("LOCATION_START", "Chưa bật được định vị nền. Hãy kiểm tra quyền vị trí.", null) }
                }
                "stop" -> {
                    if (TripLocationService.runningExecution != null) startService(Intent(this, TripLocationService::class.java).setAction(TripLocationService.STOP))
                    result.success(null)
                }
                "status" -> result.success(TripLocationService.runningExecution)
                else -> result.notImplemented()
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 710) {
            notificationResult?.success(grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED)
            notificationResult = null
        }
    }
}
