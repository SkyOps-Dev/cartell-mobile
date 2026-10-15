// url_launcher's launchUrl as the app uses it: an http(s) link opens in an in-app browser panel
// (Chrome Custom Tab on Android, SFSafariViewController on iOS), which is url_launcher 6.3's
// default mode for web links (spec 18 §5). Falls back to the system browser if no in-app browser
// is available.

import { Linking } from 'react-native';
import { InAppBrowser } from 'react-native-inappbrowser-reborn';

export async function launchUrl(url: string): Promise<void> {
  try {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url, {});
      return;
    }
  } catch {
    // Fall through to the system browser.
  }
  await Linking.openURL(url);
}
