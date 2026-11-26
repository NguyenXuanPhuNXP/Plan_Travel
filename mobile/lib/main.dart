import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import 'api_client.dart';
import 'app_config.dart';
import 'brand_logo.dart';
import 'location_sharing.dart';
import 'home_view.dart';
import 'plan_editor.dart';
import 'travel_cover.dart';

const forest = Color(0xff4f685d);
const paper = Color(0xffeef1ed);

ThemeData travelTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final colors = ColorScheme.fromSeed(seedColor: forest, brightness: brightness)
      .copyWith(
        primary: dark ? const Color(0xffaabdb0) : forest,
        onPrimary: dark ? const Color(0xff203329) : const Color(0xfff7f9f5),
        primaryContainer: dark
            ? const Color(0xff34463c)
            : const Color(0xffdce5dc),
        onPrimaryContainer: dark
            ? const Color(0xffdce5dc)
            : const Color(0xff354c40),
        secondaryContainer: dark
            ? const Color(0xff34463c)
            : const Color(0xffdce5dc),
        onSecondaryContainer: dark
            ? const Color(0xffdce5dc)
            : const Color(0xff354c40),
        surface: dark ? const Color(0xff191e1b) : paper,
        surfaceContainerLowest: dark
            ? const Color(0xff171c19)
            : const Color(0xfff6f7f3),
        surfaceContainerLow: dark
            ? const Color(0xff202722)
            : const Color(0xffe8ede7),
        surfaceContainer: dark
            ? const Color(0xff252d27)
            : const Color(0xffe5eae3),
        surfaceContainerHigh: dark
            ? const Color(0xff2b332d)
            : const Color(0xffe1e7df),
        surfaceContainerHighest: dark
            ? const Color(0xff333c34)
            : const Color(0xffdce3da),
        onSurface: dark ? const Color(0xffd5ddd5) : const Color(0xff303c33),
        onSurfaceVariant: dark
            ? const Color(0xffb1bdb2)
            : const Color(0xff57665b),
        outline: dark ? const Color(0xff859287) : const Color(0xff7a887c),
        outlineVariant: dark
            ? const Color(0xff3d4940)
            : const Color(0xffd4ddd2),
      );
  return ThemeData(
    colorScheme: colors,
    scaffoldBackgroundColor: colors.surface,
    appBarTheme: AppBarTheme(
      backgroundColor: colors.surface,
      scrolledUnderElevation: 0,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: colors.surfaceContainerLowest,
      indicatorColor: colors.primaryContainer,
      elevation: 0,
    ),
    dividerTheme: DividerThemeData(color: colors.outlineVariant, thickness: .5),
    cardTheme: CardThemeData(
      color: colors.surfaceContainerLowest,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        side: BorderSide(color: colors.outlineVariant),
        borderRadius: BorderRadius.circular(16),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: colors.surfaceContainerLow,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: colors.outlineVariant),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(minimumSize: const Size(48, 52)),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(minimumSize: const Size(48, 48)),
    ),
  );
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final api = ApiClient();
  await api.restore();
  runApp(PlanTravelApp(api: api));
}

class PlanTravelApp extends StatelessWidget {
  final ApiClient api;
  const PlanTravelApp({super.key, required this.api});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'PlanTravel',
    debugShowCheckedModeBanner: false,
    theme: travelTheme(Brightness.light),
    darkTheme: travelTheme(Brightness.dark),
    home: ListenableBuilder(
      listenable: api,
      builder: (context, _) =>
          api.signedIn ? TripsPage(api: api) : AuthPage(api: api),
    ),
  );
}

void showError(BuildContext context, Object error) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(
        error is ApiException
            ? error.message
            : 'Thao tác chưa thành công. Hãy thử lại.',
      ),
    ),
  );
}

class AuthPage extends StatefulWidget {
  final ApiClient api;
  const AuthPage({super.key, required this.api});
  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  final form = GlobalKey<FormState>();
  final name = TextEditingController(),
      email = TextEditingController(),
      password = TextEditingController(),
      confirm = TextEditingController();
  bool register = false, busy = false;
  static bool googleReady = false;
  Future<void> submit({bool google = false}) async {
    if (!google && !form.currentState!.validate()) return;
    setState(() => busy = true);
    try {
      Json data;
      if (google) {
        const clientId = AppConfig.googleServerClientId;
        if (clientId.isEmpty) {
          throw ApiException(
            0,
            'GOOGLE_NOT_CONFIGURED',
            'Đăng nhập Google chưa được cấu hình cho bản app này.',
          );
        }
        if (!googleReady) {
          await GoogleSignIn.instance.initialize(serverClientId: clientId);
          googleReady = true;
        }
        final account = await GoogleSignIn.instance.authenticate();
        final token = account.authentication.idToken;
        if (token == null) {
          throw ApiException(
            0,
            'GOOGLE_NO_TOKEN',
            'Chưa nhận được xác thực Google.',
          );
        }
        data = await widget.api.request(
          'POST',
          '/auth/google/mobile',
          body: {'credential': token},
          authenticated: false,
        ) as Json;
      } else {
        data = await widget.api.request(
          'POST',
          register ? '/auth/register' : '/auth/login',
          body: {
            'email': email.text.trim(),
            'password': password.text,
            if (register) 'fullName': name.text.trim(),
            if (register) 'confirmPassword': confirm.text,
          },
          authenticated: false,
        ) as Json;
      }
      if (data['user']['role'] != 0) {
        throw ApiException(
          403,
          'USER_ONLY',
          'Ứng dụng này dành cho tài khoản du khách.',
        );
      }
      await widget.api.acceptSession(data);
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  void dispose() {
    for (final controller in [name, email, password, confirm]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Align(
        alignment: Alignment.topCenter,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Form(
              key: form,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TravelCover(
                    image: 'assets/ha-long.jpg',
                    minHeight: 200,
                    radius: const BorderRadius.vertical(
                      bottom: Radius.circular(28),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const BrandLogo(width: 240, onPhoto: true),
                        const SizedBox(height: 8),
                        const Text(
                          'Vịnh Hạ Long, Quảng Ninh',
                          style: TextStyle(color: travelLime),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    register ? 'Tạo tài khoản' : 'Chào mừng bạn trở lại',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 20),
                  if (register) ...[
                    TextFormField(
                      controller: name,
                      decoration: const InputDecoration(labelText: 'Họ và tên'),
                      validator: (value) =>
                          value!.trim().isEmpty ? 'Nhập họ và tên.' : null,
                    ),
                    const SizedBox(height: 16),
                  ],
                  TextFormField(
                    controller: email,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.mail_outline),
                    ),
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    validator: (value) =>
                        value!.contains('@') ? null : 'Nhập email hợp lệ.',
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: password,
                    decoration: const InputDecoration(
                      labelText: 'Mật khẩu',
                      prefixIcon: Icon(Icons.lock_outline),
                    ),
                    obscureText: true,
                    validator: (value) => value!.length >= 6
                        ? null
                        : 'Mật khẩu cần ít nhất 6 ký tự.',
                  ),
                  if (register) ...[
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: confirm,
                      decoration: const InputDecoration(
                        labelText: 'Nhập lại mật khẩu',
                      ),
                      obscureText: true,
                      validator: (value) => value == password.text
                          ? null
                          : 'Mật khẩu không khớp.',
                    ),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: busy ? null : submit,
                    child: Text(
                      busy
                          ? 'Đang xử lý…'
                          : register
                          ? 'Tạo tài khoản'
                          : 'Đăng nhập',
                    ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: busy ? null : () => submit(google: true),
                    child: const Text('Tiếp tục với Google'),
                  ),
                  TextButton(
                    onPressed: busy
                        ? null
                        : () => setState(() => register = !register),
                    child: Text(
                      register
                          ? 'Đã có tài khoản? Đăng nhập'
                          : 'Chưa có tài khoản? Đăng ký',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

class TripsPage extends StatefulWidget {
  final ApiClient api;
  const TripsPage({super.key, required this.api});
  @override
  State<TripsPage> createState() => _TripsPageState();
}

class _TripsPageState extends State<TripsPage> {
  final trips = <Json>[];
  String? cursor;
  bool loading = true;
  Object? error;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load({bool more = false}) async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = await widget.api.request(
        'GET',
        '/itineraries/summary?limit=20${more && cursor != null ? '&cursor=$cursor' : ''}',
      ) as Json;
      if (mounted) {
        setState(() {
          if (!more) trips.clear();
          trips.addAll((data['items'] as List).cast<Json>());
          cursor = data['nextCursor'] as String?;
        });
      }
    } catch (failure) {
      if (mounted) setState(() => error = failure);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> logout() async {
    try {
      await LocationSharing(widget.api).stop();
      await widget.api.logout();
    } catch (error) {
      if (mounted) showError(context, error);
    }
  }

  Future<void> createPlan([String? destination]) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PlanEditor(api: widget.api, destination: destination),
      ),
    );
    if (mounted) load();
  }

  Future<void> openTrip(Json trip) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) =>
            ExecutionPage(api: widget.api, tripId: trip['id'] as String),
      ),
    );
    if (mounted) load();
  }

  @override
  Widget build(BuildContext context) => TravelHome(
    user: widget.api.user,
    trips: trips,
    loading: loading,
    hasMore: cursor != null,
    error: error,
    refresh: load,
    loadMore: () => load(more: true),
    logout: logout,
    createPlan: createPlan,
    openTrip: openTrip,
  );
}

class ExecutionPage extends StatefulWidget {
  final ApiClient api;
  final String tripId;
  const ExecutionPage({super.key, required this.api, required this.tripId});
  @override
  State<ExecutionPage> createState() => _ExecutionPageState();
}

class _ExecutionPageState extends State<ExecutionPage>
    with WidgetsBindingObserver {
  Json? execution, plan;
  List<Json> members = [];
  bool busy = false,
      initial = true,
      map = false,
      foreground = true,
      sharing = false,
      tracking = false,
      refreshing = false;
  Object? error;
  String? locationError;
  Timer? timer;
  late final tracker = LocationSharing(widget.api);
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    refresh();
    timer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (foreground && !busy) refresh();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    foreground = state == AppLifecycleState.resumed;
    if (foreground) refresh();
  }

  @override
  void dispose() {
    timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> refresh() async {
    if (refreshing || busy) return;
    refreshing = true;
    try {
      final data = await widget.api.request(
        'GET',
        '/itineraries/${widget.tripId}/execution',
      ) as Json?;
      final source = data == null
          ? await widget.api.request('GET', '/itineraries/${widget.tripId}')
                as Json
          : null;
      List<Json> positions = [];
      String? mapError;
      try {
        final locations = await widget.api.request(
          'GET',
          '/itineraries/${widget.tripId}/member-locations',
        ) as Json;
        positions = (locations['items'] as List).cast<Json>();
      } catch (_) {
        mapError = 'Chưa tải được vị trí nhóm. Hãy thử lại.';
      }
      final running = await tracker.runningExecution();
      if (mounted && !busy) {
        setState(() {
          execution = data;
          plan = source;
          members = positions;
          sharing = data?['locationSharing'] == true;
          tracking = running == data?['id'] && running != null;
          locationError = mapError;
          error = null;
        });
      }
    } catch (failure) {
      if (mounted) setState(() => error = failure);
      if (failure is ApiException && [401, 403].contains(failure.status)) {
        await LocationSharing.channel.invokeMethod('stop');
      }
    } finally {
      refreshing = false;
      if (mounted) setState(() => initial = false);
    }
  }

  Future<void> perform(Future<void> Function() action) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      await action();
    } catch (failure) {
      if (mounted) showError(context, failure);
    } finally {
      if (mounted) {
        setState(() => busy = false);
        await refresh();
      }
    }
  }

  Future<void> updateStop(Json stop, String status) => perform(() async {
    execution = await widget.api.request(
      'PATCH',
      '/executions/${execution!['id']}/stops/${stop['id']}',
      body: {'status': status, 'version': execution!['version']},
    ) as Json;
  });
  Future<void> toggleSharing() async {
    if (!sharing) {
      final agreed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Chia sẻ vị trí với nhóm?'),
          content: const Text(
            'Thành viên chuyến đi sẽ thấy vị trí gần nhất của bạn, kể cả khi app chạy nền hoặc khóa màn hình. Dừng bất cứ lúc nào trong app hoặc từ thông báo. Không lưu lịch sử đường đi.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Để sau'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Bật chia sẻ'),
            ),
          ],
        ),
      );
      if (agreed != true) return;
    }
    await perform(() async {
      if (sharing) {
        await tracker.stop(executionId: execution!['id'] as String);
      } else {
        await tracker.start(execution!);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final active = execution?['status'] == 'active';
    final userId = widget.api.user?['id'].toString();
    final canEdit =
        plan?['userId']?.toString() == userId ||
        ((plan?['collaborators'] ?? []) as List).any(
          (member) =>
              member['userId']?.toString() == userId &&
              member['permission'] == 'edit',
        );
    final stops = ((execution?['stops'] ?? plan?['items'] ?? []) as List)
        .cast<Json>();
    final completed = stops
        .where((stop) => ['completed', 'skipped'].contains(stop['status']))
        .length;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hành trình'),
        actions: [
          IconButton(
            onPressed: busy ? null : refresh,
            tooltip: 'Tải lại',
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: initial
          ? const Center(child: CircularProgressIndicator())
          : error != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(error.toString()),
                    TextButton(
                      onPressed: refresh,
                      child: const Text('Thử lại'),
                    ),
                  ],
                ),
              ),
            )
          : ListView(
              padding: EdgeInsets.fromLTRB(
                20,
                20,
                20,
                20 + MediaQuery.viewPaddingOf(context).bottom,
              ),
              children: [
                TravelCover(
                  minHeight: 144,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        execution?['snapshot']['name'] as String? ??
                            plan?['name'] as String? ??
                            'Chuyến đi',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 12),
                      if (execution == null)
                        const Text('Xem lại lịch trình trước khi bắt đầu.')
                      else ...[
                        Text(
                          'Đã xử lý $completed/${stops.length} điểm',
                          style: const TextStyle(
                            color: travelLime,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 10),
                        LinearProgressIndicator(
                          value: stops.isEmpty ? 0 : completed / stops.length,
                          color: travelLime,
                          backgroundColor: const Color(0xff37515b),
                          borderRadius: const BorderRadius.all(
                            Radius.circular(4),
                          ),
                          minHeight: 6,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                if (execution == null) ...[
                  FilledButton.icon(
                    onPressed: busy || stops.isEmpty
                        ? null
                        : () => perform(() async {
                            execution = await widget.api.request(
                              'POST',
                              '/itineraries/${widget.tripId}/execution',
                              body: {},
                            ) as Json;
                          }),
                    icon: const Icon(Icons.play_arrow),
                    label: const Text('Bắt đầu chuyến đi'),
                  ),
                  const SizedBox(height: 8),
                  if (canEdit)
                    OutlinedButton(
                      onPressed: busy
                          ? null
                          : () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => PlanEditor(
                                    api: widget.api,
                                    initial: plan,
                                  ),
                                ),
                              );
                              refresh();
                            },
                      child: const Text('Chỉnh sửa kế hoạch'),
                    ),
                ],
                if (active)
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    value: sharing,
                    onChanged: busy ? null : (_) => toggleSharing(),
                    title: const Text('Chia sẻ vị trí với nhóm'),
                    subtitle: Text(
                      sharing
                          ? tracking
                                ? 'Đang bật · có thể dừng từ thông báo'
                                : 'Cập nhật đã dừng · tắt rồi bật lại để tiếp tục'
                          : 'Đang tắt · chỉ bật khi bạn đồng ý',
                    ),
                  ),
                if (execution != null && !active)
                  Text(
                    execution!['status'] == 'finished'
                        ? 'Bạn đã kết thúc chuyến đi.'
                        : 'Phiên thực thi đã dừng.',
                  ),
                const SizedBox(height: 16),
                SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment(
                      value: false,
                      icon: Icon(Icons.route),
                      label: Text('Lịch trình'),
                    ),
                    ButtonSegment(
                      value: true,
                      icon: Icon(Icons.map_outlined),
                      label: Text('Vị trí nhóm'),
                    ),
                  ],
                  selected: {map},
                  onSelectionChanged: (values) =>
                      setState(() => map = values.first),
                ),
                const SizedBox(height: 20),
                if (busy) const LinearProgressIndicator(),
                if (map) ...[
                  if (locationError != null) Text(locationError!),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: GroupMap(members: members),
                  ),
                  if (members.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 20),
                      child: Text('Chưa có thành viên đang chia sẻ vị trí.'),
                    ),
                  for (final member in members)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(
                        Icons.person_pin_circle,
                        color: member['stale'] == true
                            ? Theme.of(context).colorScheme.tertiary
                            : Theme.of(context).colorScheme.primary,
                      ),
                      title: Text(member['name'] as String),
                      subtitle: Text(
                        '${member['stale'] == true ? 'Vị trí cũ' : 'Vị trí gần nhất'} · ${timeLabel(member['capturedAt'])}\nSai số khoảng ${(member['accuracyMeters'] as num).round()} m',
                      ),
                    ),
                ] else ...[
                  if (stops.isEmpty)
                    const Text(
                      'Chưa có điểm dừng. Thêm điểm trước khi bắt đầu.',
                    ),
                  for (final (index, stop) in stops.indexed)
                    StopTimelineRow(
                      status: stop['status'] as String?,
                      isNext: execution?['nextStopId'] == stop['id'],
                      isLast: index == stops.length - 1,
                      child: Card(
                        color: execution?['nextStopId'] == stop['id']
                            ? Theme.of(context).colorScheme.primaryContainer
                            : null,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                'Ngày ${stop['day'] ?? 1} · Điểm ${index + 1}${execution?['nextStopId'] == stop['id'] ? ' · Tiếp theo' : ''}',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                stop['name'] as String? ??
                                    stop['location']?['name'] as String? ??
                                    stop['customName'] as String? ??
                                    'Điểm dừng',
                                style: Theme.of(context).textTheme.titleLarge,
                              ),
                              if ((stop['address'] ??
                                      stop['location']?['address'] ??
                                      '')
                                  .toString()
                                  .isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text(
                                  (stop['address'] ??
                                          stop['location']?['address'])
                                      .toString(),
                                ),
                              ],
                              if (execution != null)
                                Padding(
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 8,
                                  ),
                                  child: Text(
                                    {
                                          'pending': 'Chưa đến',
                                          'arrived': 'Đã đến',
                                          'completed': 'Đã hoàn thành',
                                          'skipped': 'Đã bỏ qua',
                                        }[stop['status']] ??
                                        '',
                                  ),
                                ),
                              if (active &&
                                  [
                                    'pending',
                                    'arrived',
                                  ].contains(stop['status']))
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    FilledButton(
                                      onPressed: busy
                                          ? null
                                          : () => updateStop(
                                              stop,
                                              stop['status'] == 'pending'
                                                  ? 'arrived'
                                                  : 'completed',
                                            ),
                                      child: Text(
                                        stop['status'] == 'pending'
                                            ? 'Tôi đã đến'
                                            : 'Hoàn thành điểm',
                                      ),
                                    ),
                                    OutlinedButton(
                                      onPressed: busy
                                          ? null
                                          : () => updateStop(stop, 'skipped'),
                                      child: const Text('Bỏ qua'),
                                    ),
                                  ],
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  if (active)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: FilledButton.icon(
                        onPressed: busy || completed != stops.length
                            ? null
                            : () => perform(() async {
                                execution = await widget.api.request(
                                  'POST',
                                  '/executions/${execution!['id']}/finish',
                                  body: {'version': execution!['version']},
                                ) as Json;
                                await LocationSharing.channel.invokeMethod(
                                  'stop',
                                );
                              }),
                        icon: const Icon(Icons.flag_outlined),
                        label: const Text('Kết thúc chuyến đi'),
                      ),
                    ),
                ],
              ],
            ),
    );
  }
}

String timeLabel(dynamic value) {
  final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
  if (date == null) return 'Chưa cập nhật';
  return '${date.day}/${date.month} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
}

class GroupMap extends StatelessWidget {
  final List<Json> members;
  const GroupMap({super.key, required this.members});
  @override
  Widget build(BuildContext context) {
    const key = AppConfig.geoapifyApiKey;
    final points = members
        .map(
          (member) => LatLng(
            (member['latitude'] as num).toDouble(),
            (member['longitude'] as num).toDouble(),
          ),
        )
        .toList();
    return SizedBox(
      height: 300,
      child: FlutterMap(
        key: ValueKey(members.map((member) => member['userId']).join(',')),
        options: MapOptions(
          initialCenter: points.isEmpty
              ? const LatLng(16.05, 108.2)
              : points.first,
          initialZoom: points.isEmpty ? 5 : 14,
          initialCameraFit: points.isEmpty
              ? null
              : CameraFit.coordinates(
                  coordinates: points,
                  padding: const EdgeInsets.all(48),
                  maxZoom: 15,
                ),
        ),
        children: [
          TileLayer(
            urlTemplate: AppConfig.mapTileUrl,
            userAgentPackageName: 'vn.plantravel.plantravel_mobile',
          ),
          MarkerLayer(
            markers: [
              for (final (index, point) in points.indexed)
                Marker(
                  point: point,
                  width: 48,
                  height: 48,
                  child: Tooltip(
                    message: members[index]['name'] as String,
                    child: Icon(
                      Icons.person_pin_circle,
                      size: 42,
                      color: members[index]['stale'] == true
                          ? Colors.brown
                          : forest,
                    ),
                  ),
                ),
            ],
          ),
          RichAttributionWidget(
            attributions: [
              TextSourceAttribution(
                '© OpenStreetMap${key.isEmpty ? '' : ' · Geoapify'}',
                onTap: () => launchUrl(Uri.parse(AppConfig.mapAttributionUrl)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
