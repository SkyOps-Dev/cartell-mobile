// Port of frontend/lib/components/friendly_error_view.dart: a plain message for an error, never
// the error's own text. Padding 24 → Column(min)[error_outline 64 orange, 12, the message
// (centred, the ambient body text), and when there are buttons: 12, Row(centre)["Sign In" (only
// for an expired session, and only with onSignIn), "Retry" (with onRetry)]].
// No caller passes onSignIn or onRetry yet (Edit Phone, the feedback panel); the buttons are
// ported with the component, and its Flutter tests with them.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AccountFetchFailedException,
  AuthExpiredException,
} from '../services/exceptions';
import { MaterialColors } from '../theme/colors';
import { ambientTextStyle, toRN } from '../theme/typography';
import { TextButton } from './buttons/TextButton';
import { Icon } from './icons/Icon';
import { Icons } from './icons/iconData';

function messageFor(error: unknown): string {
  if (error instanceof AuthExpiredException) {
    return 'Your session has expired. Please sign in again.';
  }
  if (error instanceof AccountFetchFailedException) {
    return "We couldn't load your account information. Please try again.";
  }
  return 'Something went wrong. Please try again.';
}

type Props = {
  error: unknown;
  onRetry?: () => void;
  onSignIn?: () => void;
};

export function FriendlyErrorView({ error, onRetry, onSignIn }: Props) {
  const actions: React.ReactElement[] = [];
  if (error instanceof AuthExpiredException && onSignIn !== undefined) {
    actions.push(
      <TextButton key="sign-in" label="Sign In" onPressed={onSignIn} />,
    );
  }
  if (onRetry !== undefined) {
    actions.push(<TextButton key="retry" label="Retry" onPressed={onRetry} />);
  }
  return (
    <View style={styles.padding}>
      <Icon
        icon={Icons.error_outline}
        size={64}
        color={MaterialColors.orange}
      />
      <View style={styles.gap} />
      <Text style={messageStyle}>{messageFor(error)}</Text>
      {actions.length > 0 && (
        <>
          <View style={styles.gap} />
          <View style={styles.actions}>{actions}</View>
        </>
      )}
    </View>
  );
}

const messageStyle = {
  ...toRN(ambientTextStyle),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  padding: { padding: 24, alignItems: 'center' },
  gap: { height: 12 },
  actions: { flexDirection: 'row', justifyContent: 'center' },
});
