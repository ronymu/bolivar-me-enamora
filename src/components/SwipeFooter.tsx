// src/components/SwipeFooter.tsx
import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { X, Heart, RotateCcw } from "lucide-react-native";

const COLORS = {
  ring: "rgba(255,255,255,0.16)",
  surface: "rgba(0,0,0,0.22)",
  white: "#FFFFFF",
  coral: "#FF6969",
};

type Props = {
  onNope: () => void;
  onLike: () => void;
  onUndo: () => void;
  canUndo: boolean;
};

export default function SwipeFooter({ onNope, onLike, onUndo, canUndo }: Props) {
  return (
    <View style={styles.wrap} pointerEvents="box-none" accessibilityRole="none">
      <Pressable
        onPress={onUndo}
        disabled={!canUndo}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Deshacer"
        accessibilityHint="Vuelve al evento anterior"
        accessibilityState={{ disabled: !canUndo }}
        style={({ pressed }) => [
          styles.btn,
          !canUndo ? styles.btnDisabled : null,
          pressed && canUndo ? styles.pressed : null,
        ]}
      >
        <RotateCcw size={20} color={COLORS.white} />
      </Pressable>

      <Pressable
        onPress={onNope}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Descartar"
        accessibilityHint="Descarta este evento"
        style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null]}
      >
        <X size={22} color={COLORS.white} />
      </Pressable>

      <Pressable
        onPress={onLike}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Guardar"
        accessibilityHint="Guarda este evento en favoritos"
        style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null]}
      >
        <Heart size={22} color={COLORS.coral} fill={COLORS.coral} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.ring,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ scale: 0.995 }],
    opacity: 0.96,
  },
});
