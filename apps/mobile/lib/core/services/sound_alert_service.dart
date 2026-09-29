import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class SoundAlertService {
  static final SoundAlertService _instance = SoundAlertService._internal();
  factory SoundAlertService() => _instance;
  SoundAlertService._internal();

  AudioPlayer? _player;
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

  /// Play clean dual-tone chime (no vibration)
  /// Fired on order/KOT status changes and updates
  Future<void> playDualToneChime({String reason = 'Order/KOT Update'}) async {
    // Throttle double-triggers arriving within 600ms
    final now = DateTime.now();
    if (_lastAlertTime != null && now.difference(_lastAlertTime!).inMilliseconds < 600) {
      debugPrint('[SoundAlertService] Alert throttled ($reason)');
      return;
    }
    _lastAlertTime = now;

    debugPrint('🔔 [SoundAlertService] Playing dual-tone chime: $reason');

    try {
      if (_player == null) {
        _player = AudioPlayer();
        await _player?.setVolume(1.0);
      }
      await _player?.stop();
      await _player?.setVolume(1.0);
      await _player?.play(AssetSource('sounds/dual_tone_chime.wav'), volume: 1.0);
    } catch (e) {
      debugPrint('[SoundAlertService] Audio playback error: $e');
      SystemSound.play(SystemSoundType.alert);
    }
  }

  /// Backward-compatible alias
  Future<void> playLoudOrderAlert({String reason = 'Order/KOT Update'}) async {
    await playDualToneChime(reason: reason);
  }

  Future<void> stop() async {
    try {
      await _player?.stop();
    } catch (_) {}
  }

  void dispose() {
    _player?.dispose();
  }
}
