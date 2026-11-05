/**
 * @format
 */

// App root, the counterpart of the MaterialApp in frontend/lib/main.dart: the EnvBanner wraps
// everything (above popups); each screen paints its own #0A0E21 over a black ground.
// The screens come from the auth state machine (AuthRouter), as AuthBlocWidget is MaterialApp's
// home in Flutter. Routes pushed over the screens stack in Navigator order: modal popups (the Debug
// Info panel) and popup menus above the screens, dialogs (PopupHost) above those, and toasts
// (ToastHost: toastification's entry in the root overlay) above everything but the EnvBanner.
// Pages pushed over the screens (PageRouteHost: the QR scanner) sit above the screens and under
// the modal popups, menus and dialogs; while one moves, the screens move with it (PageRouteBase).
// Android Back goes to the newest route first; PageBackHandler (mounted first) answers for the
// page itself.
//
// KeyboardProvider reports the keyboard frame by frame, as Flutter's engine does (spec 07 §3.1
// "Scaffold and the keyboard"). The app is edge-to-edge (React Native 0.87 enforces it), which
// the provider detects (react-native-is-edge-to-edge): it then treats both bars as translucent,
// leaves the layout alone, and reports the full keyboard inset, navigation bar included: Flutter's
// viewInsets.bottom. Passing statusBarTranslucent / navigationBarTranslucent / preserveEdgeToEdge
// as well changes nothing and only logs a development warning.
//
// GestureHandlerRootView lets react-native-gesture-handler see every touch first, which the
// pull-to-refresh needs on Android to follow a finger alongside a scrolling list.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EnvBanner } from './src/components/EnvBanner';
import { CupertinoModalPopupHost } from './src/components/popups/CupertinoModalPopup';
import { PageBackHandler } from './src/components/layout/PopScope';
import {
  PageRouteBase,
  PageRouteHost,
} from './src/components/layout/PageRoute';
import { PopupMenuHost } from './src/components/popups/PopupMenu';
import { PopupHost } from './src/components/popups/popups';
import { ToastHost } from './src/components/popups/toasts';
import {
  TooltipLayer,
  TooltipTouchListener,
} from './src/components/tooltip/Tooltip';
import { AuthRouter } from './src/screens/AuthRouter';

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider>
        <PageBackHandler />
        <SafeAreaProvider>
          <TooltipTouchListener>
            <EnvBanner>
              <ToastHost>
                <PopupHost>
                  <View style={styles.scaffold}>
                    <PageRouteBase>
                      <AuthRouter />
                    </PageRouteBase>
                  </View>
                  <PageRouteHost />
                  <CupertinoModalPopupHost />
                  <PopupMenuHost />
                  <TooltipLayer />
                </PopupHost>
              </ToastHost>
            </EnvBanner>
          </TooltipTouchListener>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Flutter draws nothing under the screens, so its surface's black shows through while the
  // AnimatedSwitcher cross-fades two half-transparent screens (measured mid-fade on the RMX5070,
  // 2026-10-13). Every screen paints its own #0A0E21.
  scaffold: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

export default App;
