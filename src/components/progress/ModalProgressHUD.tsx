// Port of ModalProgressHUD from modal_progress_hud_nsn 0.5.1 with its defaults (spec 07 §3.1):
// Stack[child, Opacity(0.3, ModalBarrier(grey #9E9E9E, not dismissible)), Center(spinner)].
// The barrier blocks every touch on the child while `inAsyncCall` is true. Blur is 0, so the
// BackdropFilter has no visible effect and is not reproduced.
//
// Layout note (Q47): in Flutter the barrier expands to the HUD's maximum size and the Stack
// places its child top-start. Where the HUD sits inside `Center` (Login), the HUD grows while
// busy and the form moves to the top. Screens reproduce that by how they place this component.

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { MaterialColors } from '../../theme/colors';
import { CircularProgressIndicator } from './CircularProgressIndicator';

type Props = {
  inAsyncCall: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function ModalProgressHUD({ inAsyncCall, children, style }: Props) {
  return (
    <View style={style}>
      {children}
      {inAsyncCall && (
        // One modal overlay: screen readers skip the form below it (Flutter's ModalBarrier blocks
        // the semantics painted before it) but still find the spinner above.
        <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
          <View
            style={[StyleSheet.absoluteFill, styles.barrier]}
            onStartShouldSetResponder={() => true}
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.center]}
          >
            <CircularProgressIndicator />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  barrier: { backgroundColor: MaterialColors.grey, opacity: 0.3 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
