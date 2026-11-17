// The event list the three history screens build identically (frontend/lib/screens/events/
// history.dart, device_history.dart, sensor_history.dart; spec 12 §2): an Expanded
// TimedPullToRefresh around ListView.builder, each event a HistoryCard, plus, while more pages
// remain, a last item: Padding(25 down) → a 60×60 FittedBox → the blue CircularProgressIndicator
// (its 36-wide default scaled to 60, the stroke with it). Each screen keeps its own paging and
// refresh logic, which differ.
//
// The ScrollController listener: whenever the position changes and stands exactly at the end
// (pixels == maxScrollExtent), `onEnd` (the screen loads the next page if it has one). A position
// that does not change does not notify, so pressing at the end calls it once.

import React, { useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { CircularProgressIndicator } from '../../components/progress/CircularProgressIndicator';
import { TimedPullToRefresh } from '../../components/TimedPullToRefresh';
import type { Results } from '../../models/event';
import { kCartellBlue } from '../../theme/colors';
import { HistoryCard } from './HistoryCard';

/** Flutter's default indicator is 36 wide with a 4 stroke; FittedBox scales both to 60. */
const SPINNER_SIZE = 60;
const SPINNER_STROKE = (4 * SPINNER_SIZE) / 36;

export function HistoryList({
  results,
  loadMore,
  onRefresh,
  onEnd,
}: {
  results: Results[];
  loadMore: boolean;
  onRefresh: () => Promise<void>;
  onEnd: () => void;
}) {
  const windowWidth = useWindowDimensions().width;
  const [width, setWidth] = useState<number | null>(null);
  const lastOffset = useRef<number | null>(null);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const pixels = contentOffset.y;
    if (pixels === lastOffset.current) return;
    lastOffset.current = pixels;
    const maxScrollExtent = Math.max(
      0,
      contentSize.height - layoutMeasurement.height,
    );
    // Device pixels are whole; offsets in dp can differ from the extent by a rounding error.
    if (Math.abs(pixels - maxScrollExtent) < 0.5) onEnd();
  };

  return (
    <View
      style={styles.expanded}
      onLayout={event => {
        setWidth(event.nativeEvent.layout.width);
      }}
    >
      <TimedPullToRefresh
        onRefresh={onRefresh}
        onScroll={onScroll}
        testID="history-list"
      >
        {results.map((result, index) => (
          // By index, as ListView.builder builds: a page fetched twice (two scrolls to the end
          // before it lands) appears twice, as in Flutter.
          <HistoryCard
            key={index}
            data={result}
            maxWidth={width ?? windowWidth}
          />
        ))}
        {loadMore && (
          <View style={styles.spinnerItem} testID="history-load-more">
            <CircularProgressIndicator
              size={SPINNER_SIZE}
              strokeWidth={SPINNER_STROKE}
              color={kCartellBlue}
            />
          </View>
        )}
      </TimedPullToRefresh>
    </View>
  );
}

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  spinnerItem: { paddingVertical: 25, alignItems: 'center' },
});
