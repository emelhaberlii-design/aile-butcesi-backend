import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CurrencyCode, CURRENCIES } from "@/lib/currency";

interface CurrencyPickerProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
}

export default function CurrencyPicker({ value, onChange }: CurrencyPickerProps) {
  return (
    <View style={styles.container}>
      {CURRENCIES.map((c) => (
        <TouchableOpacity
          key={c.code}
          style={[styles.pill, value === c.code && styles.pillActive]}
          onPress={() => onChange(c.code)}
        >
          <Text style={[styles.pillText, value === c.code && styles.pillTextActive]}>
            {c.symbol} {c.code}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#23243a",
    borderWidth: 1,
    borderColor: "#35365a",
  },
  pillActive: {
    backgroundColor: "#4F8CFF",
    borderColor: "#4F8CFF",
  },
  pillText: {
    color: "#b0b3c6",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  pillTextActive: {
    color: "#fff",
  },
});
