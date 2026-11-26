// Isolated visual preview. No session, backend requests, or location service.
import 'package:flutter/material.dart';
import 'package:plantravel_mobile/api_client.dart';
import 'package:plantravel_mobile/home_view.dart';
import 'package:plantravel_mobile/main.dart';

void main() => runApp(const DesignPreview());

class DesignPreview extends StatelessWidget {
  const DesignPreview({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: travelTheme(Brightness.light),
    darkTheme: travelTheme(Brightness.dark),
    home: Builder(
      builder: (context) {
        Future<void> notice(String message) async {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(message)));
        }

        return Banner(
          message: 'BẢN MẪU',
          location: BannerLocation.topEnd,
          child: TravelHome(
            user: const {
              'fullName': 'Nguyễn Minh Anh',
              'email': 'minhanh@example.com',
            },
            trips: const <Json>[
              {
                'id': 'preview-1',
                'name': 'Cuối tuần ở phố Hội',
                'destination': 'Hội An',
                'stopCount': 6,
                'executionStatus': 'active',
              },
              {
                'id': 'preview-2',
                'name': 'Hẹn Đà Lạt một ngày nắng',
                'destination': 'Đà Lạt',
                'stopCount': 8,
              },
              {
                'id': 'preview-3',
                'name': 'Mùa hè bên vịnh',
                'destination': 'Hạ Long',
                'stopCount': 4,
                'executionStatus': 'finished',
              },
            ],
            loading: false,
            hasMore: false,
            error: null,
            refresh: () async {},
            loadMore: () async {},
            logout: () =>
                notice('Đây là bản mẫu, không có tài khoản đăng nhập.'),
            createPlan: (destination) => notice(
              'Bản mẫu: lập kế hoạch${destination == null ? '' : ' tại $destination'}. Mở app chính để lưu kế hoạch.',
            ),
            openTrip: (_) => notice(
              'Đây là chuyến đi minh họa. Mở app chính để xem hành trình thực tế.',
            ),
          ),
        );
      },
    ),
  );
}
