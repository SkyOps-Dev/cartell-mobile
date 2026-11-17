// Port of HistoryCard (frontend/lib/screens/events/history.dart; spec 12 §1), the event card all
// three history screens share.
//
// Fields, in a Column (start): the sensor's name, else the hub's (17, clipped at 2 lines; "null"
// when neither, as Dart's interpolation writes it); 5; the type's label (17, always red, quirk
// Q5); 5; the time (17); 5; "Connected to <hub>" for a sensor's event, else an empty line (grey
// #A2AAAD, w500, 12). The icon: the type's, 45, amber.
// Layout (LayoutBuilder's maxWidth is the list's width): below a 1.75 text scale, Padding(35
// across, 20 down) → Row (centred across; centred along when wider than 500, else from the
// start) [icon, 35, Flexible(fields), and when wider than 500 an 80-wide box to keep it
// centred]. Otherwise the icon centred above the fields (Padding 8).

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TextStyle } from 'react-native';

import { Icon } from '../../components/icons/Icon';
import type { Results } from '../../models/event';
import {
  kCartellLightGray,
  kCartellYellow,
  MaterialColors,
} from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { parseDartDateTime } from '../../utilities/dartDateTime';
import { useScalingFactor } from '../../utilities/scaling';

const twoDigits = (n: number) => (n >= 10 ? `${n}` : `0${n}`);

function fourDigits(n: number): string {
  const absN = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (absN >= 1000) return `${n}`;
  if (absN >= 100) return `${sign}0${absN}`;
  if (absN >= 10) return `${sign}00${absN}`;
  return `${sign}000${absN}`;
}

/**
 * dateTimeConverter: DateTime.parse(time).toLocal(), then "MM-dd-yyyy h:mm:ss AM/PM", the
 * afternoon hour unpadded and the morning hour zero-padded ("09:05:03 AM", "1:05:03 PM").
 */
export function dateTimeConverter(dateTime: string): string {
  const data = parseDartDateTime(dateTime).toDate();
  const y = fourDigits(data.getFullYear());
  const m = twoDigits(data.getMonth() + 1);
  const d = twoDigits(data.getDate());
  const hour = data.getHours();
  const h = twoDigits(hour);
  const min = twoDigits(data.getMinutes());
  const sec = twoDigits(data.getSeconds());
  if (hour > 12) {
    return `${m}-${d}-${y} ${hour - 12}:${min}:${sec} PM`;
  } else if (hour === 12) {
    return `${m}-${d}-${y} ${h}:${min}:${sec} PM`;
  } else if (hour === 0) {
    return `${m}-${d}-${y} 12:${min}:${sec} AM`;
  }
  return `${m}-${d}-${y} ${h}:${min}:${sec} AM`;
}

export function HistoryCard({
  data,
  maxWidth,
}: {
  data: Results;
  /** The list's width (LayoutBuilder's constraints.maxWidth). */
  maxWidth: number;
}) {
  const scaling = useScalingFactor(15);
  const wide = maxWidth > 500;
  const connectedTo =
    data.sensorName !== null ? `Connected to ${data.deviceName}` : '';

  const fields = (
    <>
      <Text numberOfLines={2} ellipsizeMode="clip" style={line17}>
        {`${data.sensorName ?? data.deviceName}`}
      </Text>
      <View style={styles.gap5} />
      <Text style={label}>{data.eventType.label}</Text>
      <View style={styles.gap5} />
      <Text style={line17}>{dateTimeConverter(`${data.time}`)}</Text>
      <View style={styles.gap5} />
      {connectedTo === '' ? (
        // An empty Flutter Text still takes one line (font size × height).
        <View style={{ height: (connectedToStyle as TextStyle).lineHeight }} />
      ) : (
        <Text style={connectedToStyle}>{connectedTo}</Text>
      )}
    </>
  );
  const icon = (
    <Icon icon={data.eventType.icon} size={45} color={kCartellYellow} />
  );

  if (scaling < 1.75) {
    return (
      <View
        style={[
          styles.padding,
          styles.row,
          wide ? styles.rowCentred : styles.rowFromStart,
        ]}
      >
        {icon}
        <View style={styles.gap35} />
        <View style={styles.flexible}>{fields}</View>
        {wide && <View style={styles.centringOffset} />}
      </View>
    );
  }
  return (
    <View style={[styles.padding, styles.column]}>
      <View style={styles.iconAbove}>{icon}</View>
      {fields}
    </View>
  );
}

const line17 = {
  ...toRN(merge(ambientTextStyle, { fontSize: 17 })),
  includeFontPadding: false,
};
const label = {
  ...toRN(merge(ambientTextStyle, { fontSize: 17, color: MaterialColors.red })),
  includeFontPadding: false,
};
const connectedToStyle = {
  ...toRN(
    merge(ambientTextStyle, {
      color: kCartellLightGray,
      fontWeight: '500',
      fontSize: 12,
    }),
  ),
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  padding: { paddingHorizontal: 35, paddingVertical: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowCentred: { justifyContent: 'center' },
  rowFromStart: { justifyContent: 'flex-start' },
  column: { alignItems: 'flex-start' },
  iconAbove: { alignSelf: 'stretch', alignItems: 'center', padding: 8 },
  flexible: { flexShrink: 1, alignItems: 'flex-start' },
  gap5: { height: 5 },
  gap35: { width: 35 },
  centringOffset: { width: 35 + 45 },
});
