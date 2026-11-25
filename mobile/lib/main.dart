import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import 'api_client.dart';
import 'location_sharing.dart';
import 'plan_editor.dart';

const forest = Color(0xff173e32);
const paper = Color(0xfff7f7ef);

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
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: forest,
        primary: forest,
        surface: paper,
      ),
      scaffoldBackgroundColor: paper,
      useMaterial3: true,
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(minimumSize: const Size(48, 52)),
      ),
    ),
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
        const clientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');
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
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Form(
              key: form,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.explore_outlined, size: 48, color: forest),
                  const SizedBox(height: 20),
                  Text(
                    'PlanTravel',
                    style: Theme.of(context).textTheme.headlineLarge
                        ?.copyWith(color: forest, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  const Text('Lên kế hoạch. Cùng nhau lên đường.'),
                  const SizedBox(height: 32),
                  Text(
                    register ? 'Tạo tài khoản' : 'Chào bạn trở lại',
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
                    decoration: const InputDecoration(labelText: 'Email'),
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    validator: (value) =>
                        value!.contains('@') ? null : 'Nhập email hợp lệ.',
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: password,
                    decoration: const InputDecoration(labelText: 'Mật khẩu'),
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

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Chuyến đi của bạn'),
      actions: [
        IconButton(
          onPressed: logout,
          tooltip: 'Đăng xuất',
          icon: const Icon(Icons.logout),
        ),
      ],
    ),
    floatingActionButton: FloatingActionButton.extended(
      onPressed: () async {
        await Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => PlanEditor(api: widget.api)),
        );
        if (mounted) load();
      },
      icon: const Icon(Icons.add),
      label: const Text('Lập kế hoạch'),
    ),
    body: RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
        children: [
          Text(
            'Sẵn sàng lên đường?',
            style: Theme.of(context).textTheme.headlineMedium
                ?.copyWith(fontWeight: FontWeight.w600, color: forest),
          ),
          const SizedBox(height: 8),
          const Text('Kế hoạch của bạn, tiến độ của riêng bạn.'),
          const SizedBox(height: 24),
          if (error != null) ...[
            Text(error.toString()),
            TextButton(onPressed: load, child: const Text('Thử lại')),
          ],
          if (!loading && trips.isEmpty && error == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Text(
                'Chưa có chuyến đi. Tạo kế hoạch đầu tiên để bắt đầu.',
              ),
            ),
          for (final trip in trips)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.all(20),
                  title: Text(
                    trip['name'] as String,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      '${trip['destination'] ?? 'Chưa chọn điểm đến'} · ${trip['stopCount']} điểm\n${{'active': 'Đang thực hiện', 'finished': 'Đã kết thúc', 'cancelled': 'Đã dừng'}[trip['executionStatus']] ?? 'Chưa bắt đầu'}',
                    ),
                  ),
                  trailing: const Icon(Icons.arrow_forward),
                  onTap: () async {
                    await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ExecutionPage(
                          api: widget.api,
                          tripId: trip['id'] as String,
                        ),
                      ),
                    );
                    if (mounted) load();
                  },
                ),
              ),
            ),
          if (loading) const Center(child: CircularProgressIndicator()),
          if (!loading && cursor != null)
            OutlinedButton(
              onPressed: () => load(more: true),
              child: const Text('Xem thêm chuyến đi'),
            ),
        ],
      ),
    ),
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
                Text(
                  execution?['snapshot']['name'] as String? ??
                      plan?['name'] as String? ??
                      'Chuyến đi',
                  style: Theme.of(context).textTheme.headlineMedium
                      ?.copyWith(color: forest, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Text(
                  execution == null
                      ? 'Xem lại kế hoạch trước khi bắt đầu.'
                      : 'Tiến độ cá nhân · $completed/${stops.length} điểm',
                ),
                if (execution != null) ...[
                  const SizedBox(height: 12),
                  LinearProgressIndicator(
                    value: stops.isEmpty ? 0 : completed / stops.length,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Theo lịch trình lúc bắt đầu. Sửa kế hoạch gốc không đổi chuyến đang đi.',
                  ),
                ],
                const SizedBox(height: 20),
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
                  GroupMap(members: members),
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
                        color: member['stale'] == true ? Colors.brown : forest,
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
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                'NGÀY ${stop['day'] ?? 1} · ĐIỂM ${index + 1}${execution?['nextStopId'] == stop['id'] ? ' · TIẾP THEO' : ''}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: forest,
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
                              const SizedBox(height: 6),
                              Text(
                                stop['address'] as String? ??
                                    stop['location']?['address'] as String? ??
                                    '',
                              ),
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
    const key = String.fromEnvironment('GEOAPIFY_API_KEY');
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
            urlTemplate: key.isEmpty
                ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                : 'https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=$key',
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
                onTap: () => launchUrl(
                  Uri.parse('https://www.openstreetmap.org/copyright'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
