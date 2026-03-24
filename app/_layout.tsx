import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useSegments, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { BudgetProvider } from "@/context/BudgetContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SavingsGoalsProvider } from "@/context/SavingsGoalsContext";
import { BusinessProvider } from "@/context/BusinessContext";
import { SpecialDaysProvider } from "@/context/SpecialDaysContext";
import { SpendingLimitsProvider } from "@/context/SpendingLimitsContext";
import { View, ActivityIndicator } from "react-native";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const SHEET_OPTIONS = {
  presentation: "formSheet" as const,
  sheetGrabberVisible: true,
  headerShown: false,
  contentStyle: { backgroundColor: "transparent" },
};

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "login";

    if (!user && !inAuthGroup) {
      router.replace("/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.tint} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" options={{ headerShown: false, animation: "fade" }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="add-income" options={{ ...SHEET_OPTIONS, sheetAllowedDetents: [0.85, 1] }} />
          <Stack.Screen name="add-expense" options={{ ...SHEET_OPTIONS, sheetAllowedDetents: [0.95, 1] }} />
          <Stack.Screen name="add-loan" options={{ ...SHEET_OPTIONS, sheetAllowedDetents: [0.85, 1] }} />
          <Stack.Screen name="manage-cards" options={{ ...SHEET_OPTIONS, sheetAllowedDetents: [0.85, 1] }} />
          <Stack.Screen name="family" options={{ ...SHEET_OPTIONS, sheetAllowedDetents: [0.85, 1] }} />
          <Stack.Screen name="receipt-scan" options={{ ...SHEET_OPTIONS, sheetAllowedDetents: [0.85, 1] }} />
          <Stack.Screen name="corporate" options={{ headerShown: false, animation: "slide_from_bottom" }} />
          <Stack.Screen name="transaction-detail" options={{ ...SHEET_OPTIONS, sheetAllowedDetents: [0.75, 1] }} />
          <Stack.Screen name="voice-assistant" options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="special-days" options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="spending-limits" options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="recurring" options={{ headerShown: false, animation: "slide_from_right" }} />
        </Stack>
      </AuthGuard>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <BudgetProvider>
              <BusinessProvider>
                  <SavingsGoalsProvider>
                    <SpecialDaysProvider>
                      <SpendingLimitsProvider>
                        <GestureHandlerRootView style={{ flex: 1 }}>
                          <KeyboardProvider>
                            <RootLayoutNav />
                          </KeyboardProvider>
                        </GestureHandlerRootView>
                      </SpendingLimitsProvider>
                    </SpecialDaysProvider>
                  </SavingsGoalsProvider>
              </BusinessProvider>
            </BudgetProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
