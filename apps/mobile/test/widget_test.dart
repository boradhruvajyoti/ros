import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ros_mobile/main.dart';

void main() {
  testWidgets('RosApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: RosApp(),
      ),
    );
    expect(find.byType(RosApp), findsOneWidget);
  });
}
