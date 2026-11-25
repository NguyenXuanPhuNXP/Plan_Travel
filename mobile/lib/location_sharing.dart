import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';

import 'api_client.dart';

class LocationSharing {
  static const channel = MethodChannel('plantravel/location');
  final ApiClient api;
  LocationSharing(this.api);

  Future<String?> runningExecution() => channel.invokeMethod<String>('status');

  Future<void> start(Json execution) async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw ApiException(0, 'GPS_OFF', 'Hãy bật định vị của điện thoại.');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if ([
      LocationPermission.denied,
      LocationPermission.deniedForever,
    ].contains(permission)) {
      throw ApiException(
        0,
        'GPS_PERMISSION',
        'Chưa có quyền vị trí. Bạn vẫn có thể đánh dấu điểm thủ công.',
      );
    }
    final notifications =
        await channel.invokeMethod<bool>('notificationPermission') ?? false;
    if (!notifications) {
      throw ApiException(
        0,
        'NOTIFICATIONS_DISABLED',
        'Hãy cho phép thông báo để thấy và dừng chia sẻ vị trí nền.',
      );
    }
    final data = await api.request(
      'PUT',
      '/executions/${execution['id']}/location-sharing',
      body: {'enabled': true},
    ) as Json;
    try {
      await channel.invokeMethod('start', {
        'apiBase': api.base,
        'executionId': execution['id'],
        'token': data['uploadToken'],
      });
    } catch (_) {
      await api.request(
        'PUT',
        '/executions/${execution['id']}/location-sharing',
        body: {'enabled': false},
      );
      rethrow;
    }
  }

  Future<void> stop({String? executionId}) async {
    final running = await runningExecution();
    await channel.invokeMethod('stop');
    final id = executionId ?? running;
    if (id != null && api.signedIn) {
      await api.request(
        'PUT',
        '/executions/$id/location-sharing',
        body: {'enabled': false},
      );
    }
  }
}
