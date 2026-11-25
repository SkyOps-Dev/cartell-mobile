// Port of PairingStepScaffold and PairingExit from
// frontend/lib/components/pairing/pairing_step_scaffold.dart: the frame every pairing wizard
// screen shares. (PairingStep, the step value, is in pairingStep.ts.)
//
// AppScaffold without the side menu (actions: a 50-wide gap), a yellow help FAB ("Help with this
// step", help_outline in kCartellBlack) when `help` is given → the body's remaining width → SafeArea
// → a scroll view, padded 20 above and 25 below, and across 20, or 20 % of the width each side
// when wider than 800 → a centred column:
// - "Step N of 6" (14, Gravel, letter spacing 1.1) and 10, on numbered steps;
// - step screens: title (20, w700, white, centred), 25, hero; outcome screens (`heroLeads`): hero,
//   25, title;
// - subtitle (17, centred) 10 below, when given;
// - 25, then the children, with the exit (10, then a blue RoundedButton, black title, FA arrowLeft)
//   after them, or before them with `exitLeads`.
//
// The step and the exit come from the wizard through context (Flutter's Provider), not props.
// Like Flutter's context.watch<PairingStep>(), a scaffold with no step above it throws while
// rendering (Add Hub's profile failure page, quirk Q14).

import React, { createContext, useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  kCartellBlack,
  kCartellBlue,
  kCartellLightGray,
  kCartellYellow,
  MaterialColors,
} from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { useLayoutWidth } from '../../utilities/layoutWidth';
import { FloatingActionButton } from '../buttons/FloatingActionButton';
import { RoundedButton } from '../buttons/RoundedButton';
import { Icon } from '../icons/Icon';
import { FontAwesomeIcons, Icons } from '../icons/iconData';
import { AppScaffold, LARGE_SCREEN_SIZE } from '../layout/AppScaffold';
import { RevealingScrollView } from '../layout/RevealingScrollView';
import { SafeArea } from '../layout/SafeArea';
import { PairingStep } from './pairingStep';

/** Provider<PairingStep>: where the screen sits in the wizard. */
export const PairingStepContext = createContext<PairingStep | undefined>(
  undefined,
);

/** PairingExit: leaves the flow, confirming first when leaving would strand the hub. */
export type PairingExit = { request: () => void };
export const PairingExitContext = createContext<PairingExit | undefined>(
  undefined,
);

/** What package:provider throws when nothing above provides the value. */
export class ProviderNotFoundException extends Error {
  constructor(valueType: string, widgetType: string) {
    super(
      `Error: Could not find the correct Provider<${valueType}> above this ${widgetType} Widget`,
    );
    this.name = 'ProviderNotFoundException';
  }
}

type Props = {
  /** Named in the body; the app bar carries the logo, never a title. */
  title: string;
  subtitle?: string | null;
  hero?: React.ReactNode;
  children?: React.ReactNode;
  /** Opens this step's help; shows the FAB. */
  help?: () => void;
  /** Outcome screens: hero, then title. */
  heroLeads?: boolean;
  /** The exit's label; no exit when not given. */
  exitLabel?: string;
  /** The exit above the children instead of below. */
  exitLeads?: boolean;
};

export function PairingStepScaffold({
  title,
  subtitle,
  hero,
  children,
  help,
  heroLeads = false,
  exitLabel,
  exitLeads = false,
}: Props) {
  const step = useContext(PairingStepContext);
  if (step === undefined) {
    throw new ProviderNotFoundException('PairingStep', 'PairingStepScaffold');
  }
  const pairingExit = useContext(PairingExitContext);
  const [width, onLayout] = useLayoutWidth();
  const horizontal = width > LARGE_SCREEN_SIZE ? width * 0.2 : 20;

  const exit =
    exitLabel === undefined ? null : (
      <>
        <View style={styles.gap10} />
        <RoundedButton
          // Resolved on tap, as Flutter reads PairingExit inside onPressed.
          onPressed={() => {
            if (pairingExit === undefined) {
              throw new ProviderNotFoundException(
                'PairingExit',
                'PairingStepScaffold',
              );
            }
            pairingExit.request();
          }}
          title={exitLabel}
          icon={FontAwesomeIcons.arrowLeft}
          iconColor={MaterialColors.black}
          buttonColor={kCartellBlue}
          buttonTitleColor={MaterialColors.black}
        />
      </>
    );

  return (
    <AppScaffold
      showNavigation={false}
      actions={<View style={styles.actionsGap} />}
      floatingActionButton={
        help === undefined ? undefined : (
          <FloatingActionButton
            onPressed={help}
            backgroundColor={kCartellYellow}
            tooltip="Help with this step"
          >
            <Icon icon={Icons.help_outline} color={kCartellBlack} />
          </FloatingActionButton>
        )
      }
      body={
        <SafeArea style={styles.expanded}>
          <View style={styles.expanded} onLayout={onLayout}>
            <RevealingScrollView
              contentContainerStyle={[
                styles.content,
                { paddingHorizontal: horizontal },
              ]}
            >
              {step.isNumbered && (
                <>
                  <Text style={stepText}>
                    {`Step ${step.index} of ${step.total}`}
                  </Text>
                  <View style={styles.gap10} />
                </>
              )}
              {heroLeads && hero !== undefined && (
                <>
                  {hero}
                  <View style={styles.gap25} />
                </>
              )}
              <Text style={titleText}>{title}</Text>
              {!heroLeads && hero !== undefined && (
                <>
                  <View style={styles.gap25} />
                  {hero}
                </>
              )}
              {subtitle !== undefined && subtitle !== null && (
                <>
                  <View style={styles.gap10} />
                  <Text style={subtitleText}>{subtitle}</Text>
                </>
              )}
              <View style={styles.gap25} />
              {exitLeads && exit}
              {children}
              {!exitLeads && exit}
            </RevealingScrollView>
          </View>
        </SafeArea>
      }
    />
  );
}

const stepText = {
  ...toRN(
    merge(ambientTextStyle, {
      fontSize: 14,
      color: kCartellLightGray,
      letterSpacing: 1.1,
    }),
  ),
  includeFontPadding: false,
};
const titleText = {
  ...toRN(
    merge(ambientTextStyle, {
      fontSize: 20,
      fontWeight: '700',
      color: MaterialColors.white,
    }),
  ),
  textAlign: 'center' as const,
  includeFontPadding: false,
};
const subtitleText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 17 })),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  content: { paddingTop: 20, paddingBottom: 25, alignItems: 'center' },
  actionsGap: { width: 50 },
  gap10: { height: 10 },
  gap25: { height: 25 },
});
