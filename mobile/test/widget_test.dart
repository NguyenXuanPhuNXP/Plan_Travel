import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:plantravel_mobile/api_client.dart';
import 'package:plantravel_mobile/main.dart';
import 'package:plantravel_mobile/plan_editor.dart';

void main() {
  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
          const MethodChannel('plantravel/location'),
          (_) async => null,
        );
  });
  testWidgets(
    'Sign-in is readable on a narrow screen with enlarged text and validates required input',
    (tester) async {
      tester.view.physicalSize = const Size(320, 720);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final api = ApiClient(
        client: MockClient((_) async => http.Response('{}', 200)),
      );
      await tester.pumpWidget(PlanTravelApp(api: api));
      await tester.ensureVisible(
        find.widgetWithText(FilledButton, 'Đăng nhập'),
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Đăng nhập'));
      await tester.pumpAndSettle();
      expect(find.text('Nhập email hợp lệ.'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      api.dispose();
    },
  );
  testWidgets(
    'Basic plan editor preserves hidden data and omits null preferences',
    (tester) async {
      Json? saved;
      final api = ApiClient(
        client: MockClient((request) async {
          saved = jsonDecode(request.body) as Json;
          return http.Response('{}', 200);
        }),
      );
      await api.acceptSession({
        'token': 'token',
        'refreshToken': 'refresh',
        'user': {'id': 1},
      });
      final source = <String, dynamic>{
        'id': '1',
        'name': 'Plan',
        'destination': 'Hanoi',
        'status': 'draft',
        'travelerCount': 2,
        'costScope': 'GROUP',
        'costTransport': 1234,
        'preferences': null,
        'expenses': null,
        'visibility': 'private',
        'collaborators': [],
        'updatedAt': '2026-11-24T00:00:00.000Z',
        'items': [
          {
            'id': '3',
            'customName': 'First',
            'day': 2,
            'note': '[DAY:2] Keep this',
          },
        ],
        'packingItems': [
          {'id': '4', 'itemName': 'Coat', 'quantity': 1},
        ],
      };
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => PlanEditor(api: api, initial: source),
                ),
              ),
              child: const Text('Edit'),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Edit'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Lưu kế hoạch'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Lưu kế hoạch'));
      await tester.pumpAndSettle();
      expect(saved!['costTransport'], 1234);
      expect(saved!['packingItems'], source['packingItems']);
      expect(saved!['expectedUpdatedAt'], source['updatedAt']);
      expect(saved!['items'][0]['day'], 2);
      expect(saved!['items'][0]['note'], 'Keep this');
      expect(saved!.containsKey('preferences'), isFalse);
      expect(saved!.containsKey('collaborators'), isFalse);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      api.dispose();
    },
  );
  testWidgets(
    'Execution requires server confirmation and leaves progress unchanged on a conflict',
    (tester) async {
      var status = 'pending', version = 0, requests = 0;
      final api = ApiClient(
        client: MockClient((request) async {
          if (request.method == 'PATCH') {
            requests++;
            if (requests == 1) {
              status = 'arrived';
              version++;
            } else {
              return http.Response(
                '{"code":"VERSION_CONFLICT","message":"Tiến độ đã thay đổi."}',
                409,
                headers: {'content-type': 'application/json; charset=utf-8'},
              );
            }
          }
          if (request.url.path.endsWith('/member-locations')) {
            return http.Response('{"items":[]}', 200);
          }
          return http.Response(
            jsonEncode({
              'id': '1',
              'itineraryId': '1',
              'snapshot': {'name': 'Chuyến đi thử'},
              'status': 'active',
              'version': version,
              'locationSharing': false,
              'nextStopId': '10',
              'stops': [
                {'id': '10', 'name': 'Bảo tàng', 'status': status, 'day': 1},
              ],
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }),
      );
      await api.acceptSession({
        'token': 'token',
        'refreshToken': 'refresh',
        'user': {'id': 1},
      });
      await tester.pumpWidget(
        MaterialApp(
          home: ExecutionPage(api: api, tripId: '1'),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.text('Chuyến đi thử'),
        findsOneWidget,
        reason: find
            .byType(Text)
            .evaluate()
            .map((element) => (element.widget as Text).data)
            .join(' | '),
      );
      await tester.scrollUntilVisible(find.text('Tôi đã đến'), 200);
      await tester.tap(find.text('Tôi đã đến'));
      await tester.pumpAndSettle();
      expect(find.text('Đã đến'), findsOneWidget);
      await tester.ensureVisible(find.text('Hoàn thành điểm'));
      await tester.tap(find.text('Hoàn thành điểm'));
      await tester.pumpAndSettle();
      expect(find.text('Tiến độ đã thay đổi.'), findsOneWidget);
      expect(find.text('Đã đến'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      api.dispose();
    },
  );
  testWidgets(
    'Sharing remains visible and can be revoked after the Android service has stopped',
    (tester) async {
      var enabled = true;
      final api = ApiClient(
        client: MockClient((request) async {
          if (request.url.path.endsWith('/member-locations')) {
            return http.Response('{"items":[]}', 200);
          }
          if (request.method == 'PUT') {
            expect((jsonDecode(request.body) as Json)['enabled'], isFalse);
            enabled = false;
          }
          return http.Response(
            jsonEncode({
              'id': '1',
              'snapshot': {'name': 'Recovery'},
              'status': 'active',
              'version': 0,
              'locationSharing': enabled,
              'nextStopId': '10',
              'stops': [
                {'id': '10', 'name': 'First', 'status': 'pending', 'day': 1},
              ],
            }),
            200,
          );
        }),
      );
      await api.acceptSession({
        'token': 'token',
        'refreshToken': 'refresh',
        'user': {'id': 1},
      });
      await tester.pumpWidget(
        MaterialApp(
          home: ExecutionPage(api: api, tripId: '1'),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.text('Cập nhật đã dừng · tắt rồi bật lại để tiếp tục'),
        findsOneWidget,
      );
      await tester.tap(find.byType(SwitchListTile));
      await tester.pumpAndSettle();
      expect(enabled, isFalse);
      expect(find.text('Đang tắt · chỉ bật khi bạn đồng ý'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
      api.dispose();
    },
  );
}
