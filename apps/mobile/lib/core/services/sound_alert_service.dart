import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:vibration/vibration.dart';

class SoundAlertService {
  static final SoundAlertService _instance = SoundAlertService._internal();
  factory SoundAlertService() => _instance;
  SoundAlertService._internal();

  AudioPlayer? _player;
  Timer? _vibrationTimer;
  DateTime? _lastAlertTime;
  bool _isInitialized = false;

  Future<void> init() async {
    if (_isInitialized) return;
    try {
      _player = AudioPlayer();
      await _player?.setReleaseMode(ReleaseMode.stop);
      await _player?.setVolume(1.0);
      _isInitialized = true;
      debugPrint('[SoundAlertService] Initialized successfully');
    } catch (e) {
      debugPrint('[SoundAlertService] init error: $e');
    }
  }

  /// Play loud 5-second alert tone with vibration
  /// Fired on order status change (e.g. READY, PREPARING, SERVED, CANCELLED)
  /// and KOT received/created.
  Future<void> playLoudOrderAlert({String reason = 'Order/KOT Update'}) async {
    // Throttle double-triggers arriving within 1.2s
    final now = DateTime.now();
    if (_lastAlertTime != null && now.difference(_lastAlertTime!).inMilliseconds < 1200) {
      debugPrint('[SoundAlertService] Alert throttled ($reason)');
      return;
    }
    _lastAlertTime = now;

    debugPrint('🔔 [SoundAlertService] Playing 5-second loud alert: $reason');

    // 1. Play loud 5-second chime audio
    try {
      if (_player == null) {
        _player = AudioPlayer();
        await _player?.setVolume(1.0);
      }
      await _player?.stop();
      await _player?.setVolume(1.0);
      await _player?.play(AssetSource('sounds/alert_5s.wav'), volume: 1.0);
    } catch (e) {
      debugPrint('[SoundAlertService] Audio playback error: $e');
      SystemSound.play(SystemSoundType.alert);
    }

    // 2. Continuous 5-second rhythmic vibration pattern
    _start5SecondVibration();
  }

  void _start5SecondVibration() {
    _vibrationTimer?.cancel();

    try {
      Vibration.hasVibrator().then((hasVibrator) {
        if (hasVibrator == true) {
          // Vibrate in 5-second rhythmic pulse pattern: 400ms on, 200ms off
          Vibration.vibrate(
            pattern: [0, 400, 200, 400, 200, 400, 200, 400, 200, 400, 200, 400, 200, 400, 200, 400],
            intensities: [0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255],
          );
        } else {
          _pulseHaptics();
        }
      }).catchError((_) {
        _pulseHaptics();
      });
    } catch (_) {
      _pulseHaptics();
    }
  }

  void _pulseHaptics() {
    int count = 0;
    _vibrationTimer = Timer.periodic(const Duration(milliseconds: 500), (t) {
      count++;
      HapticFeedback.heavyImpact();
      if (count >= 10) { // 10 pulses * 500ms = 5 seconds
        t.cancel();
      }
    });
  }

  Future<void> stop() async {
    _vibrationTimer?.cancel();
    try {
      await _player?.stop();
      Vibration.cancel();
    } catch (_) {}
  }

  void dispose() {
    _vibrationTimer?.cancel();
    _player?.dispose();
  }
}
