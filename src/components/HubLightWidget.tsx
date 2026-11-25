// Port of frontend/lib/components/hub_light_widget.dart: the hub's light patterns (with the names
// and descriptions the Hub Light Guide shows) and the widget that plays one.
//
// The widget is a 45 × 45 circle with a 5 white border (smaller if its parent is), filled with the
// pattern's current colour. A pattern is a looping sequence of (colour, duration); each colour is
// shown for its duration, then the next, starting from the first when the widget appears. Nothing
// is shown before the first colour arrives (Flutter's StreamBuilder starts without data). With
// the system's reduce-motion setting on, it holds the sequence's first lit colour instead. The
// widget names the pattern for screen readers when given a label, and is hidden from them
// otherwise.

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { kCartellBlack, MaterialColors } from '../theme/colors';
import { useDisableAnimations } from '../utilities/disableAnimations';

/** Colors.lightGreen, Colors.lightBlue (shade 500). */
const lightGreen = '#8BC34A';
const lightBlue = '#03A9F4';

export type HubLightPatternPart = {
  /** kCartellBlack (the light off) when not given in Flutter. */
  color: string;
  durationInMilliseconds: number;
};

export type HubLightPattern = { sequence: HubLightPatternPart[] };

export type HubLightPatternMeta = {
  pattern: HubLightPattern;
  name: string;
  description: string;
};

const off = (durationInMilliseconds: number): HubLightPatternPart => ({
  color: kCartellBlack,
  durationInMilliseconds,
});

export const hubLightWifiAccessPointMode: HubLightPatternMeta = {
  name: 'Wi-Fi Pairing Mode',
  description: 'Waiting to be given a Wi-Fi network to join.',
  pattern: {
    sequence: [{ color: lightGreen, durationInMilliseconds: 60 }, off(3000)],
  },
};

export const hubLightConnectedToServer: HubLightPatternMeta = {
  name: 'Connected to Server',
  description: 'Everything is set up correctly.',
  pattern: { sequence: [{ color: lightGreen, durationInMilliseconds: 1000 }] },
};

export const hubLightConnectedToWifiButNotServer: HubLightPatternMeta = {
  name: 'Connected to Wi-Fi, But Not Server',
  description:
    'On your network, but not reaching us. Usually that network has no internet.',
  pattern: { sequence: [{ color: lightBlue, durationInMilliseconds: 1000 }] },
};

export const hubLightNotConnectedToWifi: HubLightPatternMeta = {
  name: 'Not Connected to Wi-Fi',
  description: 'Cannot find the network it was set up with.',
  pattern: {
    sequence: [
      { color: lightGreen, durationInMilliseconds: 1000 },
      off(1000),
      { color: lightBlue, durationInMilliseconds: 1000 },
      off(1000),
    ],
  },
};

/** Blue, once a second: the hub is listening for a new sensor. */
export const hubLightPairingMode: HubLightPatternMeta = {
  name: 'Sensor Pairing Mode',
  description: 'Waiting for a new sensor to connect.',
  pattern: {
    sequence: [{ color: lightBlue, durationInMilliseconds: 1000 }, off(1000)],
  },
};

export const hubLightResetting: HubLightPatternMeta = {
  name: 'Resetting to Factory Defaults',
  description:
    'Currently deleting all on-device settings. (Reset button is being held in.)',
  pattern: {
    sequence: [
      { color: MaterialColors.red, durationInMilliseconds: 100 },
      off(100),
    ],
  },
};

export const hubLightUnknown: HubLightPatternMeta = {
  name: 'Unknown Mode',
  description: 'Unknown state. Please call support.',
  pattern: {
    sequence: [
      { color: MaterialColors.red, durationInMilliseconds: 1000 },
      off(1000),
    ],
  },
};

/** The colour the pattern shows now: each part for its duration, looping, from the first. */
function usePatternColor(
  pattern: HubLightPattern,
  enabled: boolean,
): string | null {
  const [color, setColor] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || pattern.sequence.length === 0) {
      return;
    }
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleNext = () => {
      const part = pattern.sequence[index];
      setColor(part.color);
      timer = setTimeout(() => {
        index = (index + 1) % pattern.sequence.length;
        scheduleNext();
      }, part.durationInMilliseconds);
    };
    scheduleNext();
    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [pattern, enabled]);
  return color;
}

/** The first part that is not "off" (or the first part), for the still swatch. */
function firstLitColor(pattern: HubLightPattern): string | null {
  const { sequence } = pattern;
  if (sequence.length === 0) {
    return null;
  }
  return (sequence.find(part => part.color !== kCartellBlack) ?? sequence[0])
    .color;
}

type Props = {
  pattern: HubLightPattern;
  /** Names the pattern for screen readers (the meta's name). */
  semanticLabel?: string;
  /** The box it is given (Flutter's tight parent constraints); 45 otherwise. */
  size?: number;
};

export function HubLightWidget({ pattern, semanticLabel, size = 45 }: Props) {
  const reduceMotion = useDisableAnimations();
  const animated = usePatternColor(pattern, !reduceMotion);
  const color = reduceMotion ? firstLitColor(pattern) : animated;
  const labelled = semanticLabel !== undefined && semanticLabel !== '';
  return (
    <View
      testID="hub-light"
      accessible={labelled}
      accessibilityRole={labelled ? 'image' : undefined}
      accessibilityLabel={labelled ? semanticLabel : undefined}
      importantForAccessibility={labelled ? 'yes' : 'no-hide-descendants'}
      style={[
        styles.swatch,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color ?? 'transparent',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  swatch: { borderWidth: 5, borderColor: MaterialColors.white },
});
