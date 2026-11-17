// Port of frontend/lib/screens/events/sensor_history.dart (spec 12 §4): a sensor's event history,
// from the sensor page's View History.
//
// Opening and closing allow every orientation (see History.tsx). Seeded from the state's Event,
// and again whenever a new one arrives. AppScaffold with X → the sensor's page; Back does the
// same. Body Expanded → SafeArea → Column (stretch): Padding(10, 0, 30, 0) → ← at the left; the
// sensor's name (18, bold, centred); Padding(3 down) → "Sensor's Event History" (12, centred);
// Padding(top 8) → Divider(20, white, 1); then, while the bloc is still `checking`, a centred
// spinner, else the list (./HistoryList.tsx).
// At the list's end with a next page: setSensorEventData(next) appended (a failure is only
// reported; the spinner row stays). Pull to refresh: the list cleared, then page one, with no
// loading state; a failure is only reported.

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../components/buttons/IconButton';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import { Divider } from '../../components/lists/Divider';
import { CircularProgressIndicator } from '../../components/progress/CircularProgressIndicator';
import type { Device } from '../../models/device';
import type { Event, Results } from '../../models/event';
import type { Sensor } from '../../models/sensor';
import { allowAllOrientations } from '../../services/phoneRotationManager';
import { reportError } from '../../services/reportError';
import { setSensorEventData } from '../../services/requests/eventRequests';
import { GoToSpecificSensorScreenEvent } from '../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../state/devices/DevicesBlocContext';
import { RefreshState } from '../../state/genericBloc';
import {
  ColorScheme,
  kAppBarActionsIconColor,
  MaterialColors,
} from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { HistoryList } from './HistoryList';

const hasNext = (next: string | null | undefined) =>
  next !== null && next !== undefined && next !== '';

export function SensorHistory({
  sensor,
  event,
  device,
  refresh = RefreshState.ready,
}: {
  sensor: Sensor;
  event: Event;
  device: Device;
  refresh?: RefreshState;
}) {
  const readDevicesBloc = useReadDevicesBloc();
  const [results, setResults] = useState<Results[]>(event.results ?? []);
  const [loadMore, setLoadMore] = useState(hasNext(event.next));
  const nextPage = useRef<string | null>(event.next);
  const mounted = useRef(true);
  const seeded = useRef(event);

  useEffect(() => {
    mounted.current = true;
    allowAllOrientations();
    return () => {
      mounted.current = false;
      allowAllOrientations();
    };
  }, []);

  // didUpdateWidget: a new Event seeds the list again.
  useEffect(() => {
    if (seeded.current === event) return;
    seeded.current = event;
    setResults(event.results ?? []);
    nextPage.current = event.next;
    setLoadMore(hasNext(event.next));
  }, [event]);

  const toSensor = () => {
    readDevicesBloc().add(new GoToSpecificSensorScreenEvent(device, sensor));
  };

  const updateEvents = async (url: string | null) => {
    try {
      const page = await setSensorEventData({ sensor, nextUrl: url });
      if (!mounted.current) return;
      setResults(current => [...current, ...(page.results ?? [])]);
      nextPage.current = page.next;
      setLoadMore(hasNext(page.next));
    } catch (error) {
      // Not caught in Flutter: the zone reports it.
      reportError(error);
    }
  };

  const updateHistory = async () => {
    setResults([]);
    setLoadMore(true);
    try {
      const page = await setSensorEventData({ sensor });
      if (!mounted.current) return;
      setResults(current => [...current, ...(page.results ?? [])]);
      nextPage.current = page.next;
      setLoadMore(hasNext(page.next));
    } catch (error) {
      reportError(error);
    }
  };

  return (
    <AppScaffold
      actions={
        <IconButton
          icon={FontAwesomeIcons.xmark}
          color={kAppBarActionsIconColor}
          onPressed={toSensor}
        />
      }
      body={
        <PopScope canPop onPopInvoked={toSensor}>
          <SafeArea style={styles.expanded}>
            <View style={styles.backRow}>
              <IconButton
                icon={FontAwesomeIcons.arrowLeftLong}
                color={ColorScheme.onSurfaceVariant}
                onPressed={toSensor}
              />
            </View>
            <Text style={name}>{sensor.name}</Text>
            <View style={styles.subtitlePadding}>
              <Text style={subtitle}>Sensor&apos;s Event History</Text>
            </View>
            <View style={styles.dividerPadding}>
              <Divider height={20} color={MaterialColors.white} thickness={1} />
            </View>
            {refresh === RefreshState.checking ? (
              <View style={[styles.expanded, styles.centre]}>
                <CircularProgressIndicator />
              </View>
            ) : (
              <HistoryList
                results={results}
                loadMore={loadMore}
                onRefresh={updateHistory}
                onEnd={() => {
                  if (loadMore) updateEvents(nextPage.current);
                }}
              />
            )}
          </SafeArea>
        </PopScope>
      }
    />
  );
}

const name = {
  ...toRN(merge(ambientTextStyle, { fontSize: 18, fontWeight: 'bold' })),
  textAlign: 'center' as const,
  includeFontPadding: false,
};
const subtitle = {
  ...toRN(merge(ambientTextStyle, { fontSize: 12 })),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  centre: { alignItems: 'center', justifyContent: 'center' },
  backRow: { paddingLeft: 10, paddingRight: 30, alignItems: 'flex-start' },
  subtitlePadding: { paddingVertical: 3 },
  dividerPadding: { paddingTop: 8 },
});
