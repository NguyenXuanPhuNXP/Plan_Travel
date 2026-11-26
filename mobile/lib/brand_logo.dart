import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// The same transparent wordmark used by the web navbar.
class BrandLogo extends StatelessWidget {
  final double width;
  final bool onPhoto;
  const BrandLogo({super.key, this.width = 180, this.onPhoto = false});

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final actualWidth = constraints.constrainWidth(width);
      final monochrome =
          onPhoto || Theme.of(context).brightness == Brightness.dark;
      final logo = Image.asset(
        'assets/brand/plantravel-lockup.png',
        width: actualWidth,
        height: actualWidth / 3,
        fit: BoxFit.contain,
        excludeFromSemantics: true,
        color: monochrome
            ? (onPhoto
                  ? const Color(0xfff6f7f3)
                  : Theme.of(context).colorScheme.onSurface)
            : null,
        colorBlendMode: monochrome ? BlendMode.srcIn : null,
      );
      return Semantics(
        label: 'PlanTravel',
        image: true,
        child: SizedBox(
          width: actualWidth,
          height: actualWidth / 5.7,
          child: ClipRect(
            child: OverflowBox(
              maxWidth: actualWidth,
              maxHeight: actualWidth / 3,
              child: logo,
            ),
          ),
        ),
      );
    },
  );
}

class ImageCreditsPage extends StatelessWidget {
  const ImageCreditsPage({super.key});

  String plainCredits(String html) => html
      .replaceAll(RegExp(r'<style>[\s\S]*?</style>'), '')
      .replaceAllMapped(
        RegExp(r'<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)</a>'),
        (m) => '${m[2]} (${m[1]})',
      )
      .replaceAll(RegExp(r'</(?:p|li|h1|h2)>'), '\n\n')
      .replaceAll(RegExp(r'<[^>]*>'), '')
      .replaceAll('&amp;', '&')
      .trim();

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Nguồn ảnh điểm đến')),
    body: SafeArea(
      child: FutureBuilder<String>(
        future: rootBundle.loadString('assets/image-credits.html'),
        builder: (context, snapshot) => snapshot.hasError
            ? const Center(
                child: Text('Chưa tải được nguồn ảnh. Hãy mở lại mục này.'),
              )
            : !snapshot.hasData
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: SelectableText(plainCredits(snapshot.data!)),
              ),
      ),
    ),
  );
}
