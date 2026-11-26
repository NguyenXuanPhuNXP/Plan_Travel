import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:plantravel_mobile/api_client.dart';
import 'package:plantravel_mobile/main.dart';

void main() {
  for (final brightness in Brightness.values) {
    testWidgets(
      'Home navigation, filters and destination handoff: $brightness',
      (tester) async {
        tester.view.physicalSize = const Size(320, 800);
        tester.view.devicePixelRatio = 1;
        tester.platformDispatcher.textScaleFactorTestValue = 1.5;
        tester.platformDispatcher.platformBrightnessTestValue = brightness;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
        FlutterSecureStorage.setMockInitialValues({});
        final api = ApiClient(
          base: 'https://api.example.test/api',
          client: MockClient(
            (_) async => http.Response(
              jsonEncode({
                'items': [
                  {
                    'id': '1',
                    'name': 'Chuyến đang đi',
                    'destination': 'Hội An',
                    'executionStatus': 'active',
                    'stopCount': 6,
                  },
                  {
                    'id': '2',
                    'name': 'Chuyến sắp tới',
                    'destination': 'Đà Lạt',
                    'stopCount': 2,
                  },
                ],
                'nextCursor': null,
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            ),
          ),
        );
        await api.acceptSession({
          'token': 'token',
          'refreshToken': 'refresh',
          'user': {
            'id': 1,
            'fullName': 'Tên người dùng rất dài để kiểm tra bố cục',
            'email': 'traveler@example.com',
          },
        });
        await tester.pumpWidget(PlanTravelApp(api: api));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Khám phá'));
        await tester.pumpAndSettle();
        expect(find.text('Đi đâu tiếp theo?'), findsOneWidget);
        await tester.enterText(find.byType(TextField).first, 'Hoi An');
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('Hội An').last);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Hội An').last);
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('Lập kế hoạch tại đây'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Lập kế hoạch tại đây'));
        await tester.pumpAndSettle();
        expect(find.widgetWithText(TextFormField, 'Hội An'), findsOneWidget);
        await tester.pageBack();
        await tester.pumpAndSettle();
        await tester.tap(find.text('Chuyến đi'));
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.widgetWithText(ChoiceChip, 'Sắp tới'));
        await tester.pumpAndSettle();
        await tester.tap(find.widgetWithText(ChoiceChip, 'Sắp tới'));
        await tester.pumpAndSettle();
        expect(find.text('Chuyến sắp tới'), findsOneWidget);
        expect(find.text('Chuyến đang đi'), findsNothing);
        await tester.tap(find.text('Cá nhân'));
        await tester.pumpAndSettle();
        expect(find.text('traveler@example.com'), findsOneWidget);
        await tester.tap(find.text('Chuyến đi'));
        await tester.pumpAndSettle();
        expect(find.text('Chuyến sắp tới'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        api.dispose();
      },
    );
  }
}
