// LayoutBuilder's constraints.maxWidth, for screens that pad by their own width: the width of the
// view given `onLayout`. Until it is measured, the window's width stands in (the body fills the
// window on a phone), so the first frame does not jump.

import { useCallback, useState } from 'react';
import { LayoutChangeEvent, useWindowDimensions } from 'react-native';

export function useLayoutWidth(): [number, (event: LayoutChangeEvent) => void] {
  const window = useWindowDimensions().width;
  const [measured, setMeasured] = useState<number | null>(null);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setMeasured(event.nativeEvent.layout.width);
  }, []);
  return [measured ?? window, onLayout];
}
