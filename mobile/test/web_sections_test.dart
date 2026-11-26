import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:plantravel_mobile/brand_logo.dart';
import 'package:plantravel_mobile/main.dart';
import 'package:plantravel_mobile/web_feature_preview.dart';

void main() {
  for (final brightness in Brightness.values) {
    testWidgets(
      'Web section previews fit narrow screens with large text: $brightness',
      (tester) async {
        tester.view.physicalSize = const Size(320, 800);
        tester.view.devicePixelRatio = 1;
        tester.platformDispatcher.textScaleFactorTestValue = 1.5;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        for (final feature in WebFeature.values) {
          await tester.pumpWidget(
            MaterialApp(
              theme: travelTheme(brightness),
              home: WebFeaturePreview(
                key: ValueKey(feature),
                feature: feature,
                user: const {
                  'fullName': 'Người dùng có họ tên rất dài',
                  'email': 'traveler@example.com',
                },
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(find.textContaining('Chưa kết nối dữ liệu'), findsOneWidget);
          for (var i = 0; i < 3; i++) {
            await tester.drag(find.byType(ListView), const Offset(0, -500));
            await tester.pumpAndSettle();
          }
          expect(tester.takeException(), isNull, reason: feature.title);
        }
        await tester.pumpWidget(
          MaterialApp(
            theme: travelTheme(brightness),
            home: const Scaffold(
              body: Center(child: SizedBox(width: 120, child: BrandLogo())),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      },
    );
  }
}
