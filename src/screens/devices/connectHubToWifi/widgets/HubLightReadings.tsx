// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/hub_light_readings.dart: on the
// waiting screen once the hub was silent on its own network, the four things its light can say.
// Help while waiting, never a verdict: the wait goes on underneath.
//
// "Your hub has not reached us yet. The light on it says what is happening." (17, centred), 20,
// then four rows (15 below each), each the light as it looks (a 40 box: an empty circle outline at
// 20 in Gravel for "no light", else the pattern playing) and its meaning (17, at most 260 wide),
// 15 apart, side by side or stacked 5 apart when they do not fit; each row centred.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  hubLightConnectedToServer,
  hubLightConnectedToWifiButNotServer,
  HubLightPatternMeta,
  hubLightWifiAccessPointMode,
  HubLightWidget,
} from '../../../../components/HubLightWidget';
import { Icon } from '../../../../components/icons/Icon';
import { Icons } from '../../../../components/icons/iconData';
import { kCartellLightGray } from '../../../../theme/colors';
import { pairingText } from './pairingText';

export function HubLightReadings() {
  return (
    <View style={styles.column}>
      <Text style={introText}>
        {'Your hub has not reached us yet. The light on it says what is ' +
          'happening.'}
      </Text>
      <View style={styles.gap20} />
      <LightReading
        meta={null}
        meaning="No power. Check that it is plugged in."
      />
      <LightReading
        meta={hubLightConnectedToServer}
        meaning="Already set up. Check your Devices list."
      />
      <LightReading
        meta={hubLightConnectedToWifiButNotServer}
        meaning="On your Wi-Fi, but that network has no internet."
      />
      <LightReading
        meta={hubLightWifiAccessPointMode}
        meaning="Still waiting for setup. Try pairing again."
      />
    </View>
  );
}

/** One row: the light as it looks, and what it means. A null meta is the no-light row. */
function LightReading({
  meta,
  meaning,
}: {
  meta: HubLightPatternMeta | null;
  meaning: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.lightBox}>
        {meta === null ? (
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel="No light"
          >
            <Icon
              icon={Icons.circle_outlined}
              size={20}
              color={kCartellLightGray}
            />
          </View>
        ) : (
          <HubLightWidget
            pattern={meta.pattern}
            semanticLabel={meta.name}
            size={40}
          />
        )}
      </View>
      <Text style={[styles.meaning, meaningText]}>{meaning}</Text>
    </View>
  );
}

const introText = pairingText({ fontSize: 17 }, 'center');
const meaningText = pairingText({ fontSize: 17 });

const styles = StyleSheet.create({
  column: { alignItems: 'center' },
  gap20: { height: 20 },
  // Padding(bottom 15) → Wrap(crossAxisAlignment: center, spacing 15, runSpacing 5).
  row: {
    marginBottom: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 15,
    rowGap: 5,
  },
  lightBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meaning: { maxWidth: 260 },
});
