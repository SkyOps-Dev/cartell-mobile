// Port of frontend/lib/components/errors/* (RenderedMessage and its three kinds) and
// frontend/lib/utilities/bloc_popups.dart drawMessage (spec 06 §6).
//
// Sign-in, registration and log-out raise these on the auth state machine's message stream, and
// the host draws them over whatever screen is current.

import type { IconData } from '../icons/iconData';
import { popPopup, showPopupMessage } from './popups';

export type PopupError = { kind: 'PopupError'; title: string; message: string };
export type PopupNotification = {
  kind: 'PopupNotification';
  title: string;
  message: string;
  icon: IconData;
};
export type PopupDialog = {
  kind: 'PopupDialog';
  title: string;
  message: string;
  /** Runs when the user presses Okay; the dialog then closes itself. */
  onOkay: () => void;
};

export type RenderedMessage = PopupError | PopupNotification | PopupDialog;

export function drawMessage(message: RenderedMessage | { kind: string }): void {
  const m = message as RenderedMessage;
  switch (m.kind) {
    case 'PopupError':
      showPopupMessage({ title: m.title, message: m.message });
      break;
    case 'PopupNotification':
      showPopupMessage({ title: m.title, message: m.message, icon: m.icon });
      break;
    case 'PopupDialog':
      showPopupMessage({
        title: m.title,
        message: m.message,
        onOkay: () => {
          m.onOkay();
          popPopup();
        },
        showCancel: true,
      });
      break;
    default:
      showPopupMessage({
        title: 'Whoops',
        message: "I'm not sure what this is. Sorry!",
      });
      break;
  }
}
