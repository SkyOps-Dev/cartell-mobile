// Port of frontend/lib/components/timed_pull_to_refresh.dart: the pull-to-refresh every list screen
// uses (Hubs, a hub, Sensors, a sensor, and the three history screens). A LiquidPullToRefresh in the
// app's colours (an amber band, the ring and circle in the scaffold grey), 40 high, played out five
// times faster than the package's default, with no fading of the list. It waits 2 seconds before
// calling onRefresh, so the spinner always shows for at least that long.

import React from 'react';
import type { ScrollViewProps } from 'react-native';

import { kCartellAppScaffoldColor, kCartellYellow } from '../theme/colors';
import { LiquidPullToRefresh } from './liquidPullToRefresh/LiquidPullToRefresh';

type Props = ScrollViewProps & {
  onRefresh: () => Promise<void>;
  /** The scroll view's AlwaysScrollableScrollPhysics: pullable even when its content fits. */
  alwaysScrollable?: boolean;
};

export function TimedPullToRefresh({ onRefresh, ...scrollViewProps }: Props) {
  const onRefreshWrapper = async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 2000));
    await onRefresh();
  };
  return (
    <LiquidPullToRefresh
      {...scrollViewProps}
      animSpeedFactor={5}
      height={40}
      showChildOpacityTransition={false}
      onRefresh={onRefreshWrapper}
      color={kCartellYellow}
      backgroundColor={kCartellAppScaffoldColor}
    />
  );
}
