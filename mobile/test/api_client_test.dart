import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:plantravel_mobile/api_client.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));

  test('Concurrent expired requests share one refresh and preserve the rotated session', () async {
    var refreshes = 0;
    final api = ApiClient(
      client: MockClient((request) async {
        if (request.url.path.endsWith('/auth/refresh')) {
          refreshes++;
          await Future<void>.delayed(const Duration(milliseconds: 20));
          return http.Response(
            jsonEncode({
              'token': 'new',
              'refreshToken': 'rotated',
              'user': {'id': 1},
            }),
            200,
          );
        }
        return request.headers['Authorization'] == 'Bearer new'
            ? http.Response('{"ok":true}', 200)
            : http.Response('{"message":"expired"}', 401);
      }),
    );
    await api.acceptSession({
      'token': 'old',
      'refreshToken': 'original',
      'user': {'id': 1},
    });
    final results = await Future.wait([
      api.request('GET', '/itineraries'),
      api.request('GET', '/auth/me'),
    ]);
    expect(results.every((result) => result['ok'] == true), isTrue);
    expect(refreshes, 1);
    final saved = jsonDecode(
      (await const FlutterSecureStorage().read(key: 'plantravel_session'))!,
    );
    expect(saved['refreshToken'], 'rotated');
    api.dispose();
  });

  test('A failed refresh cannot erase another account signed in while it was pending', () async {
    final api = ApiClient(
      client: MockClient((request) async {
        if (request.url.path.endsWith('/auth/refresh')) {
          await Future<void>.delayed(const Duration(milliseconds: 30));
          return http.Response('{"message":"revoked"}', 401);
        }
        return http.Response('{"message":"expired"}', 401);
      }),
    );
    await api.acceptSession({
      'token': 'old',
      'refreshToken': 'first',
      'user': {'id': 1},
    });
    final pending = api.request('GET', '/itineraries');
    final assertion = expectLater(pending, throwsA(isA<ApiException>()));
    await Future<void>.delayed(const Duration(milliseconds: 10));
    await api.acceptSession({
      'token': 'other',
      'refreshToken': 'second',
      'user': {'id': 2},
    });
    await assertion;
    expect(api.user!['id'], 2);
    api.dispose();
  });
}
