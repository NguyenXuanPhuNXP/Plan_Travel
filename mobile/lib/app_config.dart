/// Values supplied by Flutter's --dart-define-from-file=.env.
class AppConfig {
  static const apiBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
  );
  static const geoapifyApiKey = String.fromEnvironment('GEOAPIFY_API_KEY');
  static const osmTileUrl = String.fromEnvironment('OSM_TILE_URL');
  static const geoapifyTileUrl = String.fromEnvironment('GEOAPIFY_TILE_URL');
  static const mapAttributionUrl = String.fromEnvironment(
    'MAP_ATTRIBUTION_URL',
  );

  static String get mapTileUrl =>
      (geoapifyApiKey.isEmpty ? osmTileUrl : geoapifyTileUrl).replaceAll(
        '{apiKey}',
        Uri.encodeQueryComponent(geoapifyApiKey),
      );
}
