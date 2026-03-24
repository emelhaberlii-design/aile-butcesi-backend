import React from "react";
import { View } from "react-native";

interface AdBannerProps {
  position?: "top" | "bottom";
}

export function AdBanner({ position = "bottom" }: AdBannerProps) {
  return <View />;
}
