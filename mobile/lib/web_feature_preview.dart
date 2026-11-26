import 'package:flutter/material.dart';

import 'api_client.dart';
import 'web_destinations.dart';

enum WebFeature {
  ai('Lập kế hoạch (AI)', Icons.auto_awesome_outlined),
  community('Bản tin chuyến đi', Icons.newspaper_outlined),
  business('Cơ sở du lịch', Icons.storefront_outlined),
  registration('Đăng ký Business', Icons.add_business_outlined),
  notifications('Thông báo', Icons.notifications_outlined),
  messages('Tin nhắn', Icons.chat_bubble_outline_rounded),
  profile('Hồ sơ & cài đặt', Icons.manage_accounts_outlined);

  final String title;
  final IconData icon;
  const WebFeature(this.title, this.icon);
}

/// Design-only extensions of the web sections. No requests or account writes.
class WebFeaturePreview extends StatefulWidget {
  final WebFeature feature;
  final Json? user;
  final bool embedded;
  const WebFeaturePreview({
    super.key,
    required this.feature,
    this.user,
    this.embedded = false,
  });

  @override
  State<WebFeaturePreview> createState() => _WebFeaturePreviewState();
}

class _WebFeaturePreviewState extends State<WebFeaturePreview> {
  final form = GlobalKey<FormState>();
  final destination = TextEditingController();
  final businessName = TextEditingController();
  final preferences = <String>{};
  bool generated = false, inApp = true, byEmail = false;
  int days = 3, travelers = 2, category = 0;
  String search = '';

  @override
  void dispose() {
    destination.dispose();
    businessName.dispose();
    super.dispose();
  }

  Widget title(String text) => Padding(
    padding: const EdgeInsets.only(top: 24, bottom: 12),
    child: Text(
      text,
      style: Theme.of(context).textTheme.titleLarge
          ?.copyWith(fontWeight: FontWeight.w700),
    ),
  );

  void notice() => ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(
      content: Text('Thao tác minh họa giao diện; chưa gửi hay lưu dữ liệu.'),
    ),
  );

  Widget field(
    String label, {
    String? value,
    int lines = 1,
    bool obscure = false,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: TextFormField(
      initialValue: value,
      maxLines: lines,
      obscureText: obscure,
      decoration: InputDecoration(labelText: label),
    ),
  );

  List<Widget> ai() => [
    Text(
      'Một hành trình theo cách của bạn',
      style: Theme.of(context).textTheme.headlineSmall
          ?.copyWith(fontWeight: FontWeight.w700),
    ),
    const SizedBox(height: 8),
    const Text('Chọn điểm đến, thời gian và những điều bạn yêu thích.'),
    title('Thông tin chuyến đi'),
    TextFormField(
      controller: destination,
      decoration: const InputDecoration(
        labelText: 'Bạn muốn đi đâu?',
        prefixIcon: Icon(Icons.place_outlined),
      ),
      validator: (value) => value!.trim().isEmpty ? 'Nhập điểm đến.' : null,
    ),
    const SizedBox(height: 16),
    DropdownButtonFormField<int>(
      initialValue: days,
      decoration: const InputDecoration(labelText: 'Số ngày'),
      items: [
        for (var n = 1; n <= 7; n++)
          DropdownMenuItem(value: n, child: Text('$n ngày')),
      ],
      onChanged: (value) => setState(() => days = value!),
    ),
    const SizedBox(height: 16),
    DropdownButtonFormField<int>(
      initialValue: travelers,
      decoration: const InputDecoration(labelText: 'Số người'),
      items: [
        for (var n = 1; n <= 10; n++)
          DropdownMenuItem(value: n, child: Text('$n người')),
      ],
      onChanged: (value) => setState(() => travelers = value!),
    ),
    const SizedBox(height: 16),
    TextFormField(
      keyboardType: TextInputType.number,
      decoration: const InputDecoration(
        labelText: 'Ngân sách dự kiến',
        suffixText: 'VND',
      ),
    ),
    title('Bạn thích trải nghiệm gì?'),
    Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final label in [
          'Thiên nhiên',
          'Ẩm thực',
          'Văn hóa',
          'Biển đảo',
          'Nghỉ dưỡng',
          'Chụp ảnh',
        ])
          FilterChip(
            label: Text(label),
            selected: preferences.contains(label),
            onSelected: (selected) => setState(
              () =>
                  selected ? preferences.add(label) : preferences.remove(label),
            ),
          ),
      ],
    ),
    const SizedBox(height: 24),
    FilledButton.icon(
      onPressed: () {
        if (form.currentState!.validate()) setState(() => generated = true);
      },
      icon: const Icon(Icons.route_outlined),
      label: const Text('Xem bố cục lịch trình mẫu'),
    ),
    if (generated) ...[
      title('Lịch trình minh họa · $days ngày'),
      const Text('Đây là bản xem bố cục, chưa phải kết quả do AI tạo.'),
      for (var day = 1; day <= days; day++) ...[
        title('Ngày $day · ${destination.text.trim()}'),
        const ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Icon(Icons.place_outlined),
          title: Text('Điểm dừng dự kiến'),
          subtitle: Text(
            'Tên địa điểm, giờ ghé thăm và ghi chú sẽ hiển thị tại đây.',
          ),
        ),
      ],
    ],
  ];

  List<Widget> community() => [
    title('Mỗi chuyến đi, một câu chuyện'),
    const Text('Khám phá kinh nghiệm và lịch trình được cộng đồng chia sẻ.'),
    const SizedBox(height: 20),
    TextField(
      decoration: const InputDecoration(
        hintText: 'Tìm điểm đến trong bản tin',
        prefixIcon: Icon(Icons.search),
      ),
      onChanged: (value) => setState(() => search = value),
    ),
    const SizedBox(height: 12),
    Wrap(
      spacing: 8,
      children: [
        for (final (i, label) in [
          'Tất cả',
          'Biển đảo',
          'Văn hóa',
          'Thiên nhiên',
        ].indexed)
          ChoiceChip(
            label: Text(label),
            selected: category == i,
            onSelected: (_) => setState(() => category = i),
          ),
      ],
    ),
    const SizedBox(height: 16),
    OutlinedButton.icon(
      onPressed: notice,
      icon: const Icon(Icons.edit_outlined),
      label: const Text('Chia sẻ chuyến đi'),
    ),
    for (final d
        in webDestinations
            .where(
              (d) =>
                  normalizeDestination(d.name)
                      .contains(normalizeDestination(search)) &&
                  (category == 0 ||
                      d.type ==
                          [
                            'Tất cả',
                            'Biển đảo',
                            'Văn hóa',
                            'Thiên nhiên',
                          ][category]),
            )
            .take(3))
      Padding(
        padding: const EdgeInsets.only(top: 16),
        child: Card(
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const ListTile(
                leading: CircleAvatar(child: Icon(Icons.person_outline)),
                title: Text('Bài viết minh họa'),
                subtitle: Text('Bố cục bản tin từ web'),
              ),
              Image.asset(
                d.image,
                height: 180,
                fit: BoxFit.cover,
                excludeFromSemantics: true,
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Khám phá ${d.name}',
                      style: Theme.of(context).textTheme.titleLarge
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Text(webDestinationDetails[d.name]?.description ?? ''),
                    title('Lịch trình chia sẻ'),
                    for (final place
                        in webDestinationDetails[d.name]?.places ??
                            <(String, String)>[])
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.place_outlined, size: 20),
                        title: Text(place.$1),
                        subtitle: Text(place.$2),
                      ),
                    const Divider(),
                    Wrap(
                      spacing: 8,
                      children: [
                        TextButton.icon(
                          onPressed: notice,
                          icon: const Icon(Icons.chat_bubble_outline, size: 18),
                          label: const Text('Bình luận'),
                        ),
                        TextButton.icon(
                          onPressed: notice,
                          icon: const Icon(Icons.copy_outlined, size: 18),
                          label: const Text('Lưu lịch trình'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
  ];

  List<Widget> business() => [
    title('Ăn ngon. Nghỉ tốt. Đi nhiều hơn.'),
    const Text('Cơ sở ăn uống, lưu trú và tham quan như trên web.'),
    const SizedBox(height: 20),
    TextField(
      decoration: const InputDecoration(
        hintText: 'Tên cơ sở hoặc điểm đến',
        prefixIcon: Icon(Icons.search),
      ),
    ),
    const SizedBox(height: 16),
    Wrap(
      spacing: 8,
      children: [
        for (final (i, label) in [
          'Tất cả',
          'Ăn uống',
          'Lưu trú',
          'Tham quan',
        ].indexed)
          ChoiceChip(
            label: Text(label),
            selected: category == i,
            onSelected: (_) => setState(() => category = i),
          ),
      ],
    ),
    title('Danh sách cơ sở'),
    Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(
              widget.feature.icon,
              size: 40,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 16),
            const Text(
              'Thông tin cơ sở sẽ xuất hiện tại đây',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Mỗi cơ sở gồm ảnh, địa chỉ, giá tham khảo, thông tin liên hệ và đánh giá đã xác nhận ghé thăm.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    ),
    const SizedBox(height: 20),
    OutlinedButton.icon(
      onPressed: () => Navigator.push(
        context,
        MaterialPageRoute<void>(
          builder: (_) =>
              const WebFeaturePreview(feature: WebFeature.registration),
        ),
      ),
      icon: const Icon(Icons.add_business_outlined),
      label: const Text('Đăng ký Business'),
    ),
  ];

  List<Widget> registration() => [
    title('Giới thiệu cơ sở của bạn'),
    const Text('Thông tin liên hệ, địa chỉ và hình thức kinh doanh.'),
    const SizedBox(height: 24),
    TextFormField(
      controller: businessName,
      decoration: const InputDecoration(labelText: 'Tên cơ sở'),
      validator: (value) => value!.trim().isEmpty ? 'Nhập tên cơ sở.' : null,
    ),
    const SizedBox(height: 16),
    DropdownButtonFormField<String>(
      decoration: const InputDecoration(labelText: 'Loại hình'),
      items: [
        for (final label in ['Ăn uống', 'Lưu trú', 'Tham quan'])
          DropdownMenuItem(value: label, child: Text(label)),
      ],
      onChanged: (_) {},
    ),
    const SizedBox(height: 16),
    field('Địa chỉ'),
    field('Thông tin liên hệ'),
    field('Giới thiệu', lines: 4),
    FilledButton(
      onPressed: () {
        if (form.currentState!.validate()) notice();
      },
      child: const Text('Xem trước hồ sơ'),
    ),
  ];

  List<Widget> profile() => [
    title('Thông tin cá nhân'),
    field('Họ và tên', value: widget.user?['fullName'] as String?),
    field('Email', value: widget.user?['email'] as String?),
    field('Số điện thoại', value: widget.user?['phone'] as String?),
    title('Cách bạn nhận thông báo'),
    SwitchListTile.adaptive(
      contentPadding: EdgeInsets.zero,
      title: const Text('Thông báo trong ứng dụng'),
      value: inApp,
      onChanged: (value) => setState(() => inApp = value),
    ),
    SwitchListTile.adaptive(
      contentPadding: EdgeInsets.zero,
      title: const Text('Nhận cập nhật qua email'),
      value: byEmail,
      onChanged: (value) => setState(() => byEmail = value),
    ),
    const SizedBox(height: 20),
    FilledButton(onPressed: notice, child: const Text('Xem trước thay đổi')),
    title('Bảo mật'),
    field('Mật khẩu hiện tại', obscure: true),
    field('Mật khẩu mới', obscure: true),
    OutlinedButton(
      onPressed: notice,
      child: const Text('Xem bố cục đổi mật khẩu'),
    ),
  ];

  List<Widget> inbox() => [
    title(
      widget.feature == WebFeature.notifications
          ? 'Cập nhật của bạn'
          : 'Kết nối cùng bạn đồng hành',
    ),
    if (widget.feature == WebFeature.messages) ...[
      TextField(
        decoration: const InputDecoration(
          hintText: 'Tìm cuộc trò chuyện',
          prefixIcon: Icon(Icons.search),
        ),
      ),
      const SizedBox(height: 16),
      Wrap(
        spacing: 8,
        children: [
          for (final (i, label) in ['Bạn bè', 'Nhóm chuyến đi'].indexed)
            ChoiceChip(
              label: Text(label),
              selected: category == i,
              onSelected: (_) => setState(() => category = i),
            ),
        ],
      ),
    ],
    const SizedBox(height: 32),
    Icon(
      widget.feature.icon,
      size: 48,
      color: Theme.of(context).colorScheme.primary,
    ),
    const SizedBox(height: 16),
    Text(
      widget.feature == WebFeature.notifications
          ? 'Bạn đã xem hết cập nhật'
          : 'Mỗi hành trình vui hơn khi có bạn',
      textAlign: TextAlign.center,
      style: Theme.of(context).textTheme.titleMedium,
    ),
    const SizedBox(height: 8),
    Text(
      widget.feature == WebFeature.notifications
          ? 'Lời mời kết bạn, lời nhắc và cập nhật chuyến đi sẽ được gom tại đây.'
          : 'Cuộc trò chuyện cá nhân và nhóm chuyến đi sẽ xuất hiện trong mục tương ứng.',
      textAlign: TextAlign.center,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final content = Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (widget.embedded)
            Text(
              widget.feature.title,
              style: Theme.of(context).textTheme.headlineMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'BẢN MẪU GIAO DIỆN · Chưa kết nối dữ liệu',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ),
          ...switch (widget.feature) {
            WebFeature.ai => ai(),
            WebFeature.community => community(),
            WebFeature.business => business(),
            WebFeature.registration => registration(),
            WebFeature.profile => profile(),
            _ => inbox(),
          },
        ],
      ),
    );
    return widget.embedded
        ? content
        : Scaffold(
            appBar: AppBar(title: Text(widget.feature.title)),
            body: SafeArea(top: false, child: content),
          );
  }
}
