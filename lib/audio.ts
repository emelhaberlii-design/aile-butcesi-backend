import { Platform } from "react-native";
import {
  AudioModule,
  type AudioPlayer,
  type AudioRecorder,
  RecordingPresets,
  IOSOutputFormat,
  setAudioModeAsync,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";

export { IOSOutputFormat };

export function createAudioPlayer(uri: string, volume: number = 1.0): AudioPlayer {
  const player = new AudioModule.AudioPlayer(uri, 500, false);
  player.volume = volume;
  return player;
}

export function createAudioRecorder(isMeteringEnabled: boolean = true): AudioRecorder {
  return new AudioModule.AudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled,
    android: {
      ...RecordingPresets.HIGH_QUALITY.android,
      extension: ".m4a",
      outputFormat: "mpeg4",
      audioEncoder: "aac",
    },
    ios: {
      ...RecordingPresets.HIGH_QUALITY.ios,
      extension: ".m4a",
      outputFormat: IOSOutputFormat.MPEG4AAC,
    },
  });
}

export async function setAudioMode(opts: {
  allowsRecordingIOS?: boolean;
  playsInSilentModeIOS?: boolean;
  staysActiveInBackground?: boolean;
  shouldDuckAndroid?: boolean;
  playThroughEarpieceAndroid?: boolean;
}) {
  if (Platform.OS === "web") return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: opts.playsInSilentModeIOS ?? true,
      allowsRecording: opts.allowsRecordingIOS ?? false,
      shouldRouteThroughEarpiece: opts.playThroughEarpieceAndroid ?? false,
    });
  } catch (_e) {}
}

export async function getRecordingPermissions() {
  if (Platform.OS === "web") return { status: "granted" as const };
  return getRecordingPermissionsAsync();
}

export async function requestRecordingPermissions() {
  if (Platform.OS === "web") return { status: "granted" as const };
  return requestRecordingPermissionsAsync();
}
