// Port of what a release Flutter build shows when a widget's build throws: ErrorWidget in place
// of that widget, a RenderErrorBox filling all the space it is given in #C0C0C0 at alpha 0xF0
// (rendering/error.dart), with no text (the message is debug-only). FlutterError.onError reports
// the error first.
//
// Wrap exactly the component whose render can throw, as Flutter replaces only the element that
// threw. Account Settings is the one so far (quirk Q30).

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { reportError } from '../services/reportError';

type Props = { children: React.ReactNode };
type State = { failed: boolean };

export class ErrorWidgetBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportError(error);
  }

  render() {
    if (this.state.failed) {
      return <View style={styles.errorBox} testID="error-widget" />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorBox: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(192, 192, 192, 0.941)',
  },
});
