import AsyncStorage from "@react-native-async-storage/async-storage";

export type VoiceGender = "female";

const FAB_ENABLED_KEY = "@budget_fab_enabled";
const TTS_ENABLED_KEY = "@budget_tts_enabled";
const TTS_VOLUME_KEY = "@budget_tts_volume";
const VAD_ENABLED_KEY = "@budget_vad_enabled";

export async function getVoiceGender(): Promise<VoiceGender> {
  return "female";
}

export async function setVoiceGender(_g: VoiceGender): Promise<void> {}

export async function getFabEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(FAB_ENABLED_KEY);
    return v !== "false";
  } catch {
    return true;
  }
}

export async function setFabEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(FAB_ENABLED_KEY, enabled ? "true" : "false");
  } catch {}
}

export async function getTTSEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(TTS_ENABLED_KEY);
    return v !== "false";
  } catch {
    return true;
  }
}

export async function setTTSEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(TTS_ENABLED_KEY, enabled ? "true" : "false");
  } catch {}
}

export async function getTTSVolume(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(TTS_VOLUME_KEY);
    const n = parseFloat(v ?? "1.0");
    return isNaN(n) ? 1.0 : Math.max(0.1, Math.min(1, n));
  } catch {
    return 1.0;
  }
}

export async function setTTSVolume(volume: number): Promise<void> {
  try {
    await AsyncStorage.setItem(TTS_VOLUME_KEY, String(Math.max(0.1, Math.min(1, volume))));
  } catch {}
}

export async function getVADEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(VAD_ENABLED_KEY);
    return v !== "false";
  } catch {
    return true;
  }
}

export async function setVADEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(VAD_ENABLED_KEY, enabled ? "true" : "false");
  } catch {}
}
