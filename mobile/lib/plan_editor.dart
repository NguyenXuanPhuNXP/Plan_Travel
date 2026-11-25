import 'package:flutter/material.dart';

import 'api_client.dart';

class PlanEditor extends StatefulWidget {
  final ApiClient api;
  final Json? initial;
  const PlanEditor({super.key, required this.api, this.initial});
  @override
  State<PlanEditor> createState() => _PlanEditorState();
}

class _PlanEditorState extends State<PlanEditor> {
  final form = GlobalKey<FormState>();
  late final name = TextEditingController(
    text: widget.initial?['name'] as String? ?? '',
  );
  late final destination = TextEditingController(
    text: widget.initial?['destination'] as String? ?? '',
  );
  late final stops = ((widget.initial?['items'] ?? []) as List)
      .map((item) => Json.from(item as Map))
      .toList();
  final newStop = TextEditingController();
  bool busy = false;
  @override
  void dispose() {
    name.dispose();
    destination.dispose();
    newStop.dispose();
    super.dispose();
  }

  Future<void> save() async {
    if (!form.currentState!.validate()) return;
    setState(() => busy = true);
    try {
      if (widget.initial == null) {
        await widget.api.request(
          'POST',
          '/itineraries',
          body: {
            'name': name.text.trim(),
            'destination': destination.text.trim(),
            'items': stops,
            'packingItems': [],
            'travelerCount': 1,
            'totalDays': 1,
          },
        );
      } else {
        final source = widget.initial!;
        final draft =
            <String, dynamic>{
                ...source,
                'name': name.text.trim(),
                'destination': destination.text.trim(),
                'expectedUpdatedAt': source['updatedAt'],
                'items': stops
                    .map(
                      (item) => {
                        ...item,
                        'note': (item['note'] as String? ?? '').replaceAll(
                          RegExp(r'\[DAY:\d+\]\s*'),
                          '',
                        ),
                      },
                    )
                    .toList(),
                'packingItems': source['packingItems'] ?? [],
                'travelerCount': source['travelerCount'] ?? 1,
                'costScope': source['costScope'] ?? 'PERSON',
                'status': source['status'] ?? 'draft',
              }
              ..remove('collaborators')
              ..remove('visibility');
        if (draft['preferences'] == null) draft.remove('preferences');
        await widget.api.request(
          'PUT',
          '/itineraries/${source['id']}/plan',
          body: draft,
        );
      }
      if (mounted) Navigator.pop(context);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        widget.initial == null ? 'Lập kế hoạch' : 'Chỉnh sửa kế hoạch',
      ),
    ),
    body: Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          TextFormField(
            controller: name,
            maxLength: 200,
            decoration: const InputDecoration(labelText: 'Tên chuyến đi'),
            validator: (value) =>
                value!.trim().isEmpty ? 'Nhập tên chuyến đi.' : null,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: destination,
            maxLength: 200,
            decoration: const InputDecoration(labelText: 'Điểm đến'),
          ),
          const SizedBox(height: 24),
          Text('Các điểm dừng', style: Theme.of(context).textTheme.titleLarge),
          for (final (index, stop) in stops.indexed)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Text('${index + 1}'),
              title: Text(
                stop['location']?['name'] as String? ??
                    stop['customName'] as String? ??
                    'Điểm dừng',
              ),
              trailing: IconButton(
                tooltip: 'Xóa điểm dừng',
                onPressed: busy
                    ? null
                    : () => setState(() => stops.removeAt(index)),
                icon: const Icon(Icons.close),
              ),
            ),
          const SizedBox(height: 12),
          TextField(
            controller: newStop,
            maxLength: 255,
            decoration: const InputDecoration(labelText: 'Tên điểm dừng mới'),
          ),
          OutlinedButton.icon(
            onPressed: busy
                ? null
                : () {
                    if (newStop.text.trim().isNotEmpty) {
                      setState(() {
                        stops.add({
                          'customName': newStop.text.trim(),
                          'day': 1,
                        });
                        newStop.clear();
                      });
                    }
                  },
            icon: const Icon(Icons.add),
            label: const Text('Thêm điểm'),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: busy ? null : save,
            child: Text(busy ? 'Đang lưu…' : 'Lưu kế hoạch'),
          ),
        ],
      ),
    ),
  );
}
