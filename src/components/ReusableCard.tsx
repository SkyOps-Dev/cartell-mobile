// Port of frontend/lib/components/reusable_card.dart: a rounded (20) box in `cardColor` around its
// child, tappable when onPress is given (a plain GestureDetector: no ink, and no Android click,
// which only Material ink plays).
// The `showThing` variant (a badge in the top-right corner) is used by no screen, so it is not
// ported.

import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

type Props = {
  cardColor: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ReusableCard({ cardColor, children, onPress, style }: Props) {
  const card = [styles.card, { backgroundColor: cardColor }, style];
  if (onPress === undefined) {
    return <View style={card}>{children}</View>;
  }
  return (
    <Pressable onPress={onPress} android_disableSound style={card}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20 },
});
