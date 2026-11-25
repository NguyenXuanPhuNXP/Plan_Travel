package vn.plantravel.plantravel_mobile

import android.app.*
import android.content.Intent
import android.Manifest
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.*
import android.os.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.time.Instant
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

/** Started only by an explicit action in the visible app; no boot/automatic restart. */
class TripLocationService : Service(), LocationListener {
    companion object {
        const val STOP = "vn.plantravel.STOP_SHARING"
        @Volatile var runningExecution: String? = null
        private const val CHANNEL = "trip_location"
        private const val NOTIFICATION = 710
    }
    private lateinit var manager: LocationManager
    private var worker: ScheduledExecutorService? = null
    private var apiBase = ""
    private var token = ""
    @Volatile private var latest: Location? = null
    @Volatile private var sentAt = 0L

    override fun onBind(intent: Intent?) = null

    override fun onCreate() {
        super.onCreate()
        manager = getSystemService(LOCATION_SERVICE) as LocationManager
        if (Build.VERSION.SDK_INT >= 26) (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
            .createNotificationChannel(NotificationChannel(CHANNEL, "Vị trí chuyến đi", NotificationManager.IMPORTANCE_LOW))
    }

    private fun notification(text: String): Notification {
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val stop = PendingIntent.getService(this, 1, Intent(this, TripLocationService::class.java).setAction(STOP), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        return Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation).setContentTitle("PlanTravel · Chia sẻ vị trí")
            .setContentText(text).setContentIntent(open).setOngoing(true)
            .addAction(Notification.Action.Builder(null, "Dừng chia sẻ", stop).build()).build()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == STOP) {
            val executor = worker
            val base = apiBase; val credential = token; val id = runningExecution
            if (executor != null) executor.execute { try { send("location-stop", "POST", null, base, credential, id) } finally { stopSelf(startId) } }
            else stopSelf()
            return START_NOT_STICKY
        }
        // Retain neither account credentials nor a location trail on disk.
        worker?.shutdownNow()
        val newBase = intent?.getStringExtra("apiBase") ?: return START_NOT_STICKY
        val uri = URI(newBase)
        if (uri.scheme != "https" && !(applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE != 0 && uri.scheme == "http")) {
            stopSelf(); return START_NOT_STICKY
        }
        apiBase = newBase.trimEnd('/')
        token = intent.getStringExtra("token") ?: return START_NOT_STICKY
        runningExecution = intent.getStringExtra("executionId") ?: return START_NOT_STICKY
        latest = null; sentAt = 0
        if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION, notification("Chỉ thành viên nhóm thấy vị trí của bạn."), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        else startForeground(NOTIFICATION, notification("Chỉ thành viên nhóm thấy vị trí của bạn."))
        try {
            val providers = mutableListOf(LocationManager.NETWORK_PROVIDER)
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) providers.add(LocationManager.GPS_PROVIDER)
            for (provider in providers) {
                if (manager.isProviderEnabled(provider)) manager.requestLocationUpdates(provider, 15000L, 10f, this, Looper.getMainLooper())
            }
        } catch (_: SecurityException) { stopSelf(); return START_NOT_STICKY }
        val base = apiBase; val credential = token; val id = runningExecution
        worker = Executors.newSingleThreadScheduledExecutor().also { executor ->
            executor.scheduleWithFixedDelay({
                try {
                    val sample = latest ?: return@scheduleWithFixedDelay
                    val age = (SystemClock.elapsedRealtimeNanos() - sample.elapsedRealtimeNanos) / 1000000
                    if (age > 120000 || sample.time <= sentAt) return@scheduleWithFixedDelay
                    val body = JSONObject().put("latitude", sample.latitude).put("longitude", sample.longitude)
                        .put("accuracyMeters", sample.accuracy.toDouble()).put("capturedAt", Instant.ofEpochMilli(sample.time).toString())
                    val status = send("location-upload", "PUT", body, base, credential, id)
                    if (status in 200..299) sentAt = sample.time
                    else if (status in listOf(401, 403, 404, 409)) stopSelf(startId)
                } catch (_: Exception) { /* Keep only the newest sample and retry on the next interval. */ }
            }, 0, 30, TimeUnit.SECONDS)
        }
        return START_NOT_STICKY
    }

    private fun send(endpoint: String, method: String, body: JSONObject?, base: String, credential: String, executionId: String?): Int {
        val id = executionId ?: return 409
        val connection = URI("$base/executions/$id/$endpoint").toURL().openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 10000; connection.readTimeout = 10000
            connection.instanceFollowRedirects = false
            connection.setRequestProperty("Authorization", "Bearer $credential")
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            return connection.responseCode
        } finally { connection.disconnect() }
    }

    override fun onLocationChanged(location: Location) { latest = location }
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIFICATION, notification("Định vị đang tắt. Bật GPS để tiếp tục cập nhật."))
    }
    @Deprecated("Legacy Android callback")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}

    override fun onDestroy() {
        manager.removeUpdates(this)
        worker?.shutdownNow(); worker = null
        latest = null; token = ""; runningExecution = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }
}
