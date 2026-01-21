import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { X, Heart } from "lucide-react-native";

type Props = {
  onNope: () => void;
  onLike: () => void;
};

export default function SwipeFooter({ onNope, onLike }: Props) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onNope} style={styles.button}>
        <X size={28} color="white" />
      </Pressable>

      <View style={styles.separator} />

      <Pressable onPress={onLike} style={styles.button}>
        <Heart size={28} color="#FF5A5F" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    padding: 16,
  },
  separator: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: 12,
  },
});
