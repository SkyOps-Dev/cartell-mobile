// Port of frontend/lib/components/responsive_spacer.dart: side padding of sidePaddingPercent
// (10%) of the available width once that width is over 500 dp, else normalSpacing (0).
// The width is the space this spacer is given (Flutter's LayoutBuilder constraints).

import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

type Props = {
  children: React.ReactNode;
  normalSpacing?: number;
  sidePaddingPercent?: number;
};

export function ResponsiveSpacer({
  children,
  normalSpacing = 0,
  sidePaddingPercent = 0.1,
}: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);
  return (
    <View
      onLayout={onLayout}
      style={[
        styles.spacer,
        {
          paddingHorizontal:
            width > 500 ? width * sidePaddingPercent : normalSpacing,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  spacer: { flex: 1 },
});
