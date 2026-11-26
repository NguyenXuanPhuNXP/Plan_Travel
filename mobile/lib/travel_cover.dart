import 'package:flutter/material.dart';

import 'web_destinations.dart';

const travelInk = Color(0xff293c32);
const travelLime = Color(0xffd4dfcc);

String? destinationCover(String? destination) {
  final name = normalizeDestination(destination ?? '');
  for (final item in webDestinations) {
    if (name.contains(normalizeDestination(item.name))) return item.image;
  }
  if (name.contains('ha noi')) return 'assets/ha-noi.jpg';
  if (name.contains('ha long') || name.contains('quang ninh')) {
    return 'assets/ha-long.jpg';
  }
  if (name.contains('hội an')) return 'assets/hoi-an.jpg';
  if (name.contains('đà lạt')) return 'assets/da-lat.jpg';
  return null;
}

class TravelCover extends StatelessWidget {
  final String? image;
  final double minHeight;
  final BorderRadius radius;
  final Widget child;
  final VoidCallback? onTap;

  const TravelCover({
    super.key,
    this.image,
    required this.minHeight,
    required this.child,
    this.onTap,
    this.radius = const BorderRadius.all(Radius.circular(24)),
  });

  @override
  Widget build(BuildContext context) {
    final decoration = BoxDecoration(
      color: travelInk,
      image: image == null
          ? null
          : DecorationImage(
              image: AssetImage(image!),
              fit: BoxFit.cover,
              colorFilter: const ColorFilter.mode(
                Color(0x550c222a),
                BlendMode.darken,
              ),
            ),
    );
    return Material(
      color: travelInk,
      borderRadius: radius,
      clipBehavior: Clip.antiAlias,
      child: Ink(
        decoration: decoration,
        child: InkWell(
          onTap: onTap,
          child: Container(
            alignment: Alignment.bottomLeft,
            constraints: BoxConstraints(minHeight: minHeight),
            padding: const EdgeInsets.all(24),
            decoration: image == null
                ? null
                : const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      stops: [0, .38, 1],
                      colors: [
                        Color(0x110c222a),
                        Color(0x660c222a),
                        Color(0xf3122831),
                      ],
                    ),
                  ),
            child: DefaultTextStyle.merge(
              style: const TextStyle(color: Colors.white),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

class StopTimelineRow extends StatelessWidget {
  final bool isNext;
  final bool isLast;
  final String? status;
  final Widget child;

  const StopTimelineRow({
    super.key,
    required this.isNext,
    required this.isLast,
    required this.status,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final icon = switch (status) {
      'completed' => Icons.check_rounded,
      'skipped' => Icons.skip_next_rounded,
      _ => isNext ? Icons.navigation_rounded : Icons.place_outlined,
    };
    return Stack(
      children: [
        if (!isLast)
          PositionedDirectional(
            start: 13,
            top: 30,
            bottom: 0,
            child: Container(width: 2, color: colors.outlineVariant),
          ),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: ExcludeSemantics(
                child: CircleAvatar(
                  radius: 14,
                  backgroundColor: isNext
                      ? travelLime
                      : colors.surfaceContainerHighest,
                  foregroundColor: isNext ? travelInk : colors.onSurfaceVariant,
                  child: Icon(icon, size: 16),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: child,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
