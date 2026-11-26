import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'api_client.dart';
import 'brand_logo.dart';
import 'web_destinations.dart';
import 'web_feature_preview.dart';
import 'travel_cover.dart';

class TravelHome extends StatefulWidget {
  final Json? user;
  final List<Json> trips;
  final bool loading, hasMore;
  final Object? error;
  final Future<void> Function() refresh, loadMore, logout;
  final Future<void> Function(String? destination) createPlan;
  final Future<void> Function(Json trip) openTrip;

  const TravelHome({
    super.key,
    required this.user,
    required this.trips,
    required this.loading,
    required this.hasMore,
    required this.error,
    required this.refresh,
    required this.loadMore,
    required this.logout,
    required this.createPlan,
    required this.openTrip,
  });

  @override
  State<TravelHome> createState() => _TravelHomeState();
}

class _TravelHomeState extends State<TravelHome> {
  int tab = 0, filter = 0;
  String query = '';
  static const destinations = webDestinations;

  void openFeature(WebFeature feature) => Navigator.push(
    context,
    MaterialPageRoute<void>(
      builder: (_) => WebFeaturePreview(feature: feature, user: widget.user),
    ),
  );

  Widget menu() => Drawer(
    child: SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: BrandLogo(width: 210),
          ),
          ListTile(
            leading: const Icon(Icons.home_outlined),
            title: const Text('Bảng điều khiển'),
            onTap: () {
              Navigator.pop(context);
              setState(() => tab = 0);
            },
          ),
          ListTile(
            leading: const Icon(Icons.map_outlined),
            title: const Text('Lập kế hoạch thủ công'),
            onTap: () {
              Navigator.pop(context);
              widget.createPlan(null);
            },
          ),
          ListTile(
            leading: const Icon(Icons.auto_awesome_outlined),
            title: const Text('Lập kế hoạch (AI)'),
            onTap: () {
              Navigator.pop(context);
              openFeature(WebFeature.ai);
            },
          ),
          ListTile(
            leading: const Icon(Icons.explore_outlined),
            title: const Text('Khám phá điểm đến'),
            onTap: () {
              Navigator.pop(context);
              setState(() => tab = 1);
            },
          ),
          ListTile(
            leading: const Icon(Icons.newspaper_outlined),
            title: const Text('Bản tin chuyến đi'),
            onTap: () {
              Navigator.pop(context);
              setState(() => tab = 3);
            },
          ),
          ListTile(
            leading: const Icon(Icons.luggage_outlined),
            title: const Text('Danh sách chuyến đi'),
            onTap: () {
              Navigator.pop(context);
              setState(() => tab = 2);
            },
          ),
          const Divider(),
          for (final feature in [
            WebFeature.business,
            WebFeature.profile,
            WebFeature.registration,
            WebFeature.notifications,
            WebFeature.messages,
          ])
            ListTile(
              leading: Icon(feature.icon),
              title: Text(feature.title),
              onTap: () {
                Navigator.pop(context);
                openFeature(feature);
              },
            ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined),
            title: const Text('Nguồn ảnh điểm đến'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) => const ImageCreditsPage(),
                ),
              );
            },
          ),
        ],
      ),
    ),
  );

  Widget dashboard() {
    final name = (widget.user?['fullName'] as String? ?? 'bạn')
        .trim()
        .split(' ')
        .last;
    final active = widget.trips
        .where((trip) => trip['executionStatus'] == 'active')
        .firstOrNull;
    return RefreshIndicator(
      onRefresh: widget.refresh,
      child: ListView(
        key: const PageStorageKey('dashboard'),
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          heading(
            'Chào $name,',
            caption: 'Hành trình tiếp theo của bạn bắt đầu từ đây.',
          ),
          TravelCover(
            image: 'assets/ha-long.jpg',
            minHeight: 180,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Đi để có thêm\nnhững câu chuyện.',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 16),
                TextButton.icon(
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.white,
                    padding: EdgeInsets.zero,
                  ),
                  onPressed: () => setState(() => tab = 1),
                  icon: const Icon(Icons.arrow_forward_rounded),
                  label: const Text('Khám phá điểm đến'),
                ),
              ],
            ),
          ),
          heading('Lên kế hoạch cho chuyến đi'),
          FilledButton.icon(
            onPressed: () => widget.createPlan(null),
            icon: const Icon(Icons.map_outlined),
            label: const Text('Lập kế hoạch thủ công'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => openFeature(WebFeature.ai),
            icon: const Icon(Icons.auto_awesome_outlined),
            label: const Text('Lập kế hoạch (AI)'),
          ),
          heading('Không gian chuyến đi', caption: 'Trong các chuyến đã tải'),
          Wrap(
            spacing: 24,
            runSpacing: 16,
            children: [
              for (final stat in [
                ('${widget.trips.length}', 'Chuyến đi'),
                (
                  '${widget.trips.where((t) => t['executionStatus'] == 'active').length}',
                  'Đang thực hiện',
                ),
                (
                  '${widget.trips.fold<int>(0, (sum, trip) => sum + ((trip['stopCount'] as num?)?.toInt() ?? 0))}',
                  'Điểm đã lưu',
                ),
              ])
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      stat.$1,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    Text(stat.$2),
                  ],
                ),
            ],
          ),
          heading(
            active == null ? 'Chuyến đi gần đây' : 'Tiếp tục hành trình',
            trailing: TextButton(
              onPressed: () => setState(() => tab = 2),
              child: const Text('Xem tất cả'),
            ),
          ),
          ...requestState(),
          if (active != null)
            tripCard(active)
          else if (widget.trips.isNotEmpty)
            tripCard(widget.trips.first)
          else if (!widget.loading && widget.error == null)
            empty(
              'Bạn chưa có kế hoạch nào',
              'Chọn một điểm đến và bắt đầu lên kế hoạch.',
            ),
          heading('Kết nối & trải nghiệm'),
          for (final feature in [WebFeature.community, WebFeature.business])
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(feature.icon),
              title: Text(feature.title),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => feature == WebFeature.community
                  ? setState(() => tab = 3)
                  : openFeature(feature),
            ),
        ],
      ),
    );
  }

  String status(Json trip) => switch (trip['executionStatus']) {
    'active' => 'Đang đi',
    'finished' => 'Đã kết thúc',
    'cancelled' => 'Đã dừng',
    _ => 'Sắp tới',
  };

  Widget heading(String title, {String? caption, Widget? trailing}) => Padding(
    padding: const EdgeInsets.only(top: 24, bottom: 16),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              if (caption != null) ...[
                const SizedBox(height: 6),
                Text(
                  caption,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          ),
        ),
        ?trailing,
      ],
    ),
  );

  Widget tripCard(Json trip) {
    final colors = Theme.of(context).colorScheme;
    final cover = destinationCover(trip['destination'] as String?);
    final active = trip['executionStatus'] == 'active';
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => widget.openTrip(trip),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (cover != null)
                Stack(
                  children: [
                    Image.asset(
                      cover,
                      height: 164,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      excludeFromSemantics: true,
                    ),
                    const Positioned(
                      bottom: 8,
                      right: 8,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: Color(0xcc102831),
                          borderRadius: BorderRadius.all(Radius.circular(8)),
                        ),
                        child: Padding(
                          padding: EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          child: Text(
                            'Ảnh minh họa điểm đến',
                            style: TextStyle(color: Colors.white, fontSize: 10),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          active
                              ? Icons.near_me_rounded
                              : Icons.luggage_outlined,
                          size: 16,
                          color: colors.primary,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            status(trip),
                            style: TextStyle(
                              color: colors.primary,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded, size: 20),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      trip['name'] as String? ?? 'Chuyến đi',
                      style: Theme.of(context).textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${trip['destination'] ?? 'Chưa chọn điểm đến'} · ${trip['stopCount'] ?? 0} điểm dừng',
                      style: TextStyle(color: colors.onSurfaceVariant),
                    ),
                    if (active) ...[
                      const SizedBox(height: 16),
                      Text(
                        'Tiếp tục hành trình →',
                        style: TextStyle(
                          color: colors.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget empty(String title, String description, {bool action = true}) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 12),
        child: Column(
          children: [
            Icon(
              Icons.luggage_outlined,
              size: 40,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(description, textAlign: TextAlign.center),
            if (action) ...[
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: () => widget.createPlan(null),
                icon: const Icon(Icons.add),
                label: const Text('Lập kế hoạch'),
              ),
            ],
          ],
        ),
      );

  List<Widget> requestState() => [
    if (widget.loading) ...[
      const LinearProgressIndicator(semanticsLabel: 'Đang tải chuyến đi'),
      const SizedBox(height: 16),
    ],
    if (widget.error != null)
      Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Chưa tải được chuyến đi',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text(
                widget.error is ApiException
                    ? (widget.error as ApiException).message
                    : 'Kiểm tra kết nối và thử lại.',
              ),
              TextButton(
                onPressed: widget.loading ? null : widget.refresh,
                child: const Text('Thử lại'),
              ),
            ],
          ),
        ),
      ),
  ];

  Widget explore() {
    final active = widget.trips
        .where((t) => t['executionStatus'] == 'active')
        .firstOrNull;
    final matches = destinations
        .where(
          (d) =>
              normalizeDestination('${d.name} ${d.area} ${d.type}')
                  .contains(normalizeDestination(query)),
        )
        .toList();
    return RefreshIndicator(
      onRefresh: widget.refresh,
      child: ListView(
        key: const PageStorageKey('explore'),
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        children: [
          Text(
            'Đi đâu tiếp theo?',
            style: Theme.of(context).textTheme.headlineMedium
                ?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -.8),
          ),
          const SizedBox(height: 8),
          Text(
            'Một nơi mới. Một hành trình của riêng bạn.',
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          TextField(
            onChanged: (value) => setState(() => query = value.trim()),
            textInputAction: TextInputAction.search,
            decoration: const InputDecoration(
              hintText: 'Tìm điểm đến',
              prefixIcon: Icon(Icons.search_rounded),
            ),
          ),
          if (query.isEmpty) ...[
            const SizedBox(height: 24),
            TravelCover(
              image: 'assets/ha-long.jpg',
              minHeight: 252,
              onTap: () => showDestination(
                destinations.firstWhere((d) => d.name == 'Hạ Long'),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'CẢM HỨNG CHO CHUYẾN ĐI',
                    style: TextStyle(
                      fontSize: 11,
                      letterSpacing: 1.2,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 32),
                  Text(
                    'Hẹn nhau giữa\nmiền di sản.',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      height: 1.15,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Row(
                    children: [
                      Icon(Icons.place_outlined, color: Colors.white, size: 16),
                      SizedBox(width: 4),
                      Expanded(child: Text('Vịnh Hạ Long')),
                      Icon(Icons.arrow_forward_rounded, color: Colors.white),
                    ],
                  ),
                ],
              ),
            ),
          ],
          heading(
            'Điểm đến dành cho bạn',
            caption: 'Khám phá Việt Nam, từng hành trình.',
          ),
          for (final d in matches)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Card(
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => showDestination(d),
                  child: Row(
                    children: [
                      Image.asset(
                        d.image,
                        width: 100,
                        height: 108,
                        fit: BoxFit.cover,
                        excludeFromSemantics: true,
                      ),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                d.type,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                d.name,
                                style: Theme.of(context).textTheme.titleMedium
                                    ?.copyWith(fontWeight: FontWeight.w700),
                              ),
                              Text(
                                d.area,
                                style: TextStyle(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.only(right: 12),
                        child: Icon(Icons.chevron_right_rounded),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          if (matches.isEmpty)
            empty(
              'Chưa có điểm đến phù hợp',
              'Thử tên điểm đến khác. Bạn cũng có thể tự lập kế hoạch cho bất kỳ điểm đến nào.',
            ),
          if (query.isEmpty) ...[
            heading(
              'Hành trình của bạn',
              trailing: TextButton(
                onPressed: () => setState(() => tab = 2),
                child: const Text('Xem tất cả'),
              ),
            ),
            ...requestState(),
            if (active != null)
              tripCard(active)
            else if (widget.trips.isNotEmpty)
              tripCard(widget.trips.first)
            else if (!widget.loading && widget.error == null)
              empty(
                'Chuyến đi đầu tiên bắt đầu từ đây',
                'Chọn điểm đến, thêm điểm dừng và sẵn sàng lên đường.',
              ),
          ],
        ],
      ),
    );
  }

  Future<void> showDestination(TravelDestination d) async {
    final details = webDestinationDetails[d.name];
    final create = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useSafeArea: true,
      builder: (context) => SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.asset(d.image, height: 220, fit: BoxFit.cover),
              ),
              const SizedBox(height: 20),
              Text(
                d.name,
                style: Theme.of(context).textTheme.headlineMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text('${d.area} · ${d.type}'),
              const SizedBox(height: 16),
              Text(
                details?.description ??
                    'Lên kế hoạch cho chuyến đi của riêng bạn.',
              ),
              for (final place in details?.places ?? <(String, String)>[])
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.place_outlined),
                  title: Text(place.$1),
                  subtitle: Text(place.$2),
                ),
              if (details != null && details.source.isNotEmpty)
                TextButton.icon(
                  onPressed: () async {
                    final opened = await launchUrl(
                      Uri.parse(details.source),
                      mode: LaunchMode.externalApplication,
                    );
                    if (!opened && context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Chưa mở được nguồn tham khảo.'),
                        ),
                      );
                    }
                  },
                  icon: const Icon(Icons.open_in_new, size: 16),
                  label: const Text('Nguồn gợi ý điểm đến'),
                ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Lập kế hoạch tại đây'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Để sau'),
              ),
            ],
          ),
        ),
      ),
    );
    if (create == true && mounted) await widget.createPlan(d.name);
  }

  Widget trips() {
    final visible =
        widget.trips
            .where(
              (t) => switch (filter) {
                1 => t['executionStatus'] == 'active',
                2 => ![
                  'active',
                  'finished',
                  'cancelled',
                ].contains(t['executionStatus']),
                3 => ['finished', 'cancelled'].contains(t['executionStatus']),
                _ => true,
              },
            )
            .toList()
          ..sort(
            (a, b) => (b['executionStatus'] == 'active' ? 1 : 0).compareTo(
              a['executionStatus'] == 'active' ? 1 : 0,
            ),
          );
    return RefreshIndicator(
      onRefresh: widget.refresh,
      child: ListView(
        key: const PageStorageKey('trips'),
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        children: [
          heading(
            'Chuyến đi của bạn',
            caption: 'Từ ý tưởng đến những bước chân.',
          ),
          FilledButton.icon(
            onPressed: () => widget.createPlan(null),
            icon: const Icon(Icons.add_rounded),
            label: const Text('Lập kế hoạch'),
          ),
          const SizedBox(height: 16),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final (i, label) in [
                  'Tất cả',
                  'Đang đi',
                  'Sắp tới',
                  'Đã kết thúc',
                ].indexed)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(label),
                      selected: filter == i,
                      onSelected: (_) => setState(() => filter = i),
                      showCheckmark: false,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          ...requestState(),
          for (final trip in visible) tripCard(trip),
          if (visible.isEmpty && !widget.loading && widget.error == null)
            empty(
              filter == 0
                  ? 'Chưa có chuyến đi'
                  : 'Chưa có chuyến đi trong mục này',
              widget.hasMore
                  ? 'Tải thêm chuyến đi hoặc chọn một mục khác.'
                  : 'Lên kế hoạch hôm nay để có điều mong chờ ngày mai.',
              action: filter == 0,
            ),
          if (widget.hasMore)
            OutlinedButton(
              onPressed: widget.loading ? null : widget.loadMore,
              child: const Text('Xem thêm chuyến đi'),
            ),
        ],
      ),
    );
  }

  Widget profile() {
    final name = widget.user?['fullName'] as String? ?? 'Du khách';
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        heading('Cá nhân'),
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.manage_accounts_outlined),
          title: const Text('Hồ sơ & cài đặt'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => openFeature(WebFeature.profile),
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: Theme.of(context)
                      .colorScheme
                      .primaryContainer,
                  child: const Icon(Icons.person_outline_rounded, size: 30),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: Theme.of(context).textTheme.titleLarge
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      SelectableText(
                        widget.user?['email'] as String? ??
                            'Tài khoản PlanTravel',
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        for (final feature in [
          WebFeature.business,
          WebFeature.registration,
          WebFeature.messages,
          WebFeature.notifications,
        ])
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(feature.icon),
            title: Text(feature.title),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => openFeature(feature),
          ),
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.photo_library_outlined),
          title: const Text('Nguồn ảnh điểm đến'),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute<void>(builder: (_) => const ImageCreditsPage()),
          ),
        ),
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.luggage_outlined),
          title: const Text('Chuyến đi của tôi'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => setState(() => tab = 2),
        ),
        const Divider(),
        const ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Icon(Icons.location_on_outlined),
          title: Text('Bạn quyết định khi nào chia sẻ'),
          subtitle: Text(
            'Chỉ bật chia sẻ vị trí trong một chuyến đi khi bạn đồng ý. Bạn có thể dừng bất cứ lúc nào.',
          ),
        ),
        const Divider(),
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.logout_rounded),
          title: const Text('Đăng xuất'),
          onTap: widget.logout,
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    drawer: menu(),
    appBar: AppBar(
      title: const BrandLogo(),
      actions: [
        IconButton(
          onPressed: () => openFeature(WebFeature.notifications),
          tooltip: 'Thông báo',
          icon: const Icon(Icons.notifications_outlined),
        ),
        IconButton(
          onPressed: () => openFeature(WebFeature.messages),
          tooltip: 'Tin nhắn',
          icon: const Icon(Icons.chat_bubble_outline_rounded),
        ),
      ],
    ),
    body: SafeArea(
      top: false,
      child: IndexedStack(
        index: tab,
        children: [
          dashboard(),
          explore(),
          trips(),
          const WebFeaturePreview(
            feature: WebFeature.community,
            embedded: true,
          ),
          profile(),
        ],
      ),
    ),
    bottomNavigationBar: NavigationBar(
      selectedIndex: tab,
      onDestinationSelected: (value) => setState(() => tab = value),
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.home_outlined),
          selectedIcon: Icon(Icons.home_rounded),
          label: 'Trang chủ',
        ),
        NavigationDestination(
          icon: Icon(Icons.explore_outlined),
          selectedIcon: Icon(Icons.explore_rounded),
          label: 'Khám phá',
        ),
        NavigationDestination(
          icon: Icon(Icons.luggage_outlined),
          selectedIcon: Icon(Icons.luggage_rounded),
          label: 'Chuyến đi',
        ),
        NavigationDestination(
          icon: Icon(Icons.newspaper_outlined),
          selectedIcon: Icon(Icons.newspaper_rounded),
          label: 'Bản tin',
        ),
        NavigationDestination(
          icon: Icon(Icons.person_outline_rounded),
          selectedIcon: Icon(Icons.person_rounded),
          label: 'Cá nhân',
        ),
      ],
    ),
  );
}
