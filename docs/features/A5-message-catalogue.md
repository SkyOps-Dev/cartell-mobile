# A5 — Message Catalogue

Every popup, toast, banner and error message a user can see, **word for word** (typos, odd
spacing and line breaks included), grouped by feature. "↵" marks a line break inside the
message. Normal screen labels and headings are not repeated here; they are in each feature page.

Kinds: **Popup** = centred dialog ([30](30-popups-toasts-and-banners.md)). **Toast** = top
message that fades after 5 s. **Banner** = top message that blocks the screen for 4 s.
**Inline** = text inside the screen or under a field.

## Sign-in, registration, session

| Where | Kind | Title | Message | Buttons |
|---|---|---|---|---|
| Login, empty email | Inline | | "Email field cannot be empty" | |
| Login, empty password | Inline | | "Password field cannot be empty" | |
| Login, wrong credentials | Popup | "Account Not Found" | "Please check your credentials and try again." | Okay |
| Login, other failure | Popup | "An Error Occured" | "An error occured. Please try again. If problem persists, contact support" | Okay |
| Login, biometric offer | Popup | "Unlock with biometrics?" | "Use your fingerprint or face to open Cartell instead of typing your password. You can change this later in Account Settings." | Cancel / Okay |
| Registration, email | Inline (red) | | "Please enter a valid email" | |
| Registration / Change password, rules | Inline (red, one per line) | | "Password field cannot be empty" · "Password must contain at least one uppercase letter" · "Password must contain at least one number" · "Password must contain at least one special character" · "Password must be at least 8 characters long" | |
| Registration, passwords differ | Popup | "Unable to Create Account" | "Passwords do not match. Please re-enter them and try again." | Okay |
| Registration, success | Popup (✓ icon) | "Your account was created. Please login" | "Registration Succeeded" | Okay |
| Registration, server refused | Popup | "Unable to Create Account" | server messages, each as "↵ <message>"; or "An error occurred. Please try again." | Okay |
| Registration, server error | Popup | "Unable to Create Account" | "Something went wrong on our end. Please try again in a moment." | Okay |
| Registration, timeout/error | Popup | "Request timed out. Check your internet connection, and then try again." | "An Error Occured" | Okay |
| Lock screen | Inline | | "Cartell is locked"; after lockout also "Too many attempts. Use your password to sign in instead." | |
| Biometric prompt reason | System | | "Unlock Cartell" | |
| Log out | Popup | "Log Out" | "Are you sure you want to log out?" | Cancel / Okay |
| Log out failed | Popup | "Could Not Sign Out" | "Your session could not be cleared. Please try again." | Okay |
| Maintenance | Inline | | "The server is currently undergoing an update. Please check back later." | Retry |
| Unreachable | Inline | | "We can't reach Cartell right now.↵Check your internet connection and try again." | Retry |
| On a hub's Wi-Fi (where surfaced) | Error text | | "We detected you are on a HUB's network. Please connect to your own WiFi network and try again." | |
| Request timeout (where surfaced) | Error text | | "The request timed out. Check your internet connection and try again." | |

## Debug Info and environments

| Where | Kind | Message |
|---|---|---|
| Debug Info | Inline | "Version: <v>" · "Build Number: <b>" · "Environment Name: <ENV>" |
| Test Connection | Popup rows | "Internet Access" · "Server Access" · "Can Reach Spash Page" · "Can Post to Server" (✓ / ✗ / spinner) |
| Switch Environment | Inline warning | "Warning: When using Beta or Production environments, pairing new hubs to the server will not work." |
| Every screen (non-live) | Tag | "TEST SERVER" / "BETA SERVER" / "DEVELOPMENT SERVER" |
| Verify Sentry Setup | (thrown, not shown) | "This is a test exception" |

## Navigation

| Where | Kind | Title | Message | Buttons |
|---|---|---|---|---|
| Back on Hubs list | Popup | "Leave App" | "Are you sure you want to leave this app?" | Nevermind / Leave |
| Menu, user missing | Inline | | "Unable to get current user. Please restart the app and try again." | |
| Unknown message type | Popup | "Whoops" | "I'm not sure what this is. Sorry!" | Okay |

## Hubs

| Where | Kind | Title | Message | Buttons |
|---|---|---|---|---|
| Hubs list, empty | Inline | | "No Hubs have been added." · "Press the plus button below to get started." | |
| Hub card | Inline | | "Status: Connected" · "Status: Disconnected" · "Status: Blacklisted" | |
| Hub status | Inline | | "Status: Checking..." · "Status: Connected" · "Status: Disconnected" · "Status: Last known connected" · "Status: Last known disconnected" | |
| Flagged hub | Inline | | "This hub has been flagged for suspicious activity. Please contact support to re-activate this hub" | |
| Open Gate | Toast ✓ | | "Sent message to open gate" | |
| Delete hub | Popup | "Delete Hub?" | "Are you sure you want to delete this Hub? Note: Any sensors paired to this hub will remain paired until manually deleted." | Cancel / Delete |
| Hub settings, success | Toast ✓ | | "Onboard sensor turned on." / "off." · "Integrator support turned on." / "off." · "Notifications turned on." / "off." · "Email notifications turned on." / "off." | |
| Hub settings, failure | Toast ! | | "Hub is not connected. Please connect hub and try again." · "Error encountered of type: <ErrorName>. Onboard sensor turned on/off. Please try again soon." · "Email notifications failed to turn on/off." (integrator and email rows) · "Notifications failed to turn on/off." | |
| Pair Integrator | Toast ✓ | | "Sent pairing message successfully" | |
| Any switch, no reason given | Toast ! | | "Failed to switch." | |

## Add hub

| Where | Kind | Title | Message | Buttons |
|---|---|---|---|---|
| Fields | Inline | | "Device name cannot be empty." · "Mac address cannot be empty." · "Mac Address cannot be empty" | |
| QR scanner | Inline | | "Please scan the QR code on the hub" · "That does not seem to match a QR code on a hub" · button "Clear scan" · button "Tap to use hub QR code" | |
| Change scanned MAC | Popup | "Change Mac Address" | "The Mac Address of your hub has already been scanned. Are you sure you'd like to change it?" | Okay |
| Bad scan (fallback) | Popup | "Failed to validate hub" | "This hub couldn't be validated. Please try again and contact support if the issue persists." (or a stored server message) | Okay |
| Server refused | Popup | "Adding Hub Failed" | " ↵<server message>" per item, or "An Error occurred. Please try again." | Okay |
| Server error | Popup | "Adding Hub Failed" | "Failed to add hub. Please try again. If the problem persists, please contact support." | Okay |
| Empty field guard | Toast ✗ | | "Make sure you enter a Name and valid Mac Address before submitting" | |
| Profile failed on entry | Failure page | | "An error occurred while adding a hub. If this continues to happen contact support." "Error: 15b12a" | |
| Hub added | Inline | | "Hub Added to Account!" · "Your hub is now added to your account." · "Next, we will pair the hub to your Wi-Fi. Are you ready to proceed?" | Proceed and Pair To Wi-Fi / Pair to Wi-Fi Later |

## Hub Wi-Fi pairing

| Where | Kind | Title | Message | Buttons |
|---|---|---|---|---|
| Step 2 help | Popup | "Plugging In Your Hub" | "Connect the power adapter to your hub and plug it into a wall outlet. Your hub needs to stay plugged in from now on. It is what keeps your sensors talking to Cartell.↵↵Once it has power, a light next to the antenna will start to blink. Contact support if no light comes on at all." | Got it |
| Step 3 reset | Popup | "Reset Your Hub?" | "Resetting erases the Wi-Fi settings stored on your hub so it can start pairing again. Your account and your sensors are not affected.↵↵If your hub is already working on another network, resetting it will disconnect it." | Reset the hub / Keep trying |
| Step 3 help, "I can't find the light" | Popup | "Finding the Light on Your Hub" | "The light sits next to the antenna. It is small, and in daylight you may need to shade it with your hand.↵↵Make sure the hub is plugged in and has had a few seconds to start up. If you still cannot see any light at all, contact support." | Contact support / Look again |
| Step 4 help | Popup | "Connecting to Your Hub" | 'Press "Connect to Hub" and your phone will ask permission to join a temporary network named "Cartell Hub" followed by your hub's Mac Address. Confirm when your phone asks.↵↵Your phone leaves your home Wi-Fi while it hands the hub your network details, then rejoins on its own once setup finishes.↵↵If no permission request appears, check that Wi-Fi is on and that your hub's light is still blinking.' | Got it |
| Step 4 Wi-Fi off (Android) | Inline | | "Your WiFi is turned off. Please enable WiFi to connect to your Hub." | |
| Connecting help | Popup | "Joining the HUB's Network" | "To set up your HUB, your phone leaves your home network and joins the network the HUB makes. Your phone asks permission before it does that.↵↵Answer as soon as you see the prompt. If it goes unanswered this step times out, and you will have to start it again.↵↵If you already tapped Cancel on it, cancel this step and begin again." | Got it |
| Connecting | Inline | | 'Tap "Join" if your phone asks for permission.' (iOS) / 'Tap "Connect" if your phone asks for permission.' (Android) · "Your phone may ask each time it joins a HUB. Pairing cannot continue until you answer." | |
| Network list | Inline | | "Looking for networks..." · "No networks found" · "Your hub can only see 2.4GHz networks. Check your router settings, then scan again." · "If your network does not appear in the list, it may not be a 2.4GHz network. Please check your router settings and ensure your network is set to 2.4GHz." | |
| Password too long | Inline | | "This password is too long for the hub, which stores 64 characters. Accented and emoji characters use more than one each." | |
| Empty password | Popup | "Connect without a password?" | "<network name> will be joined as an open network, so anyone nearby can see the traffic between your hub and your router." | Connect anyway / Go back |
| Leaving mid-pairing | Popup | "Stop Pairing?" | "Your hub is part-way through setup. If you stop now it may not connect, and you will need to start again." | Stop pairing / Keep pairing |
| Waiting for hub | Inline | | "Reconnecting your phone to your wifi network." · "Waiting for your hub to reach our servers." · "Having trouble reaching Cartell. Still trying." · "Checking on your hub." · "Still waiting for your hub." · "<m:ss> elapsed" · "This can take a few minutes." | |
| Light readings | Inline | | "Your hub has not reached us yet. The light on it says what is happening." · "No power. Check that it is plugged in." · "Already set up. Check your Devices list." · "On your Wi-Fi, but that network has no internet." · "Still waiting for setup. Try pairing again." | |
| Success | Screen | "Hub has successfully connected to the network." | | Continue |
| Reverted | Screen | "Your hub could not join that network" | "It went back to waiting for setup, so the details it was given did not work." · "The Wi-Fi password, which is the usual cause." · "That the hub is close enough to your router." · "That your router is powered on and its network is up." | Try Again / Return to Devices |
| Stopped | Screen | "Pairing stopped" | "Your hub may already be connected.↵Check your Devices list before pairing again." · "Code: e5b1907d-C" | Return to Devices / Begin Pairing Again |
| Failures | Screen | (message) | "Your phone never reached the HUB." · "The connection to your hub could not be verified. ↵Please try again." · "Could not open a connection to your hub.↵Please try again." · "We weren't able to connect to your hub. ↵Please try again later." · "Connection is unreliable. ↵Please try again." · "Pairing was cancelled. ↵Please try again later." · "Your session has expired.↵Please sign in again to finish setting up your hub." · plus "Error: <code>" | Begin Pairing Again / Return to Devices |
| No-reply detail | Screen subtitle | | 'If your phone asked for permission to join a network, that prompt may still be waiting, or it may have been dismissed. Try again, and tap "Join" when you see it.' ("Connect" on Android) | |
| Reconnecting | Screen | "Reconnecting to the server" | "Please wait" | Cancel |
| Reconnect failed | Screen | "Please verify your network connection and try again" | | Try Reconnecting Again |
| Reconnected | Screen | "Successfully reconnected to the server." | | Continue |

## Firmware

| Where | Kind | Title | Message | Buttons |
|---|---|---|---|---|
| Overview | Inline | | "HUB connected" · "HUB offline — versions shown are the last we heard" · "Not reported" · "Update in progress" · "<Controller/Transmitter> firmware is updating to v<n>. Keep the hub powered on." · "1 update available" / "<n> updates available" · "Reconnect the hub before updating." · "Firmware is up to date" · "Both components are running the latest versions." · "Both components were on the latest versions when the hub last checked in." | View progress / Update now |
| Confirm | Popup | "Update this hub?" | "This takes a few minutes. Keep the hub powered on and on WiFi. You can leave this screen while it runs, and the hub keeps its current firmware if the update fails." | Not now / Update |
| Progress | Inline | | "Starting update" / "Keep the hub powered on." · "Updating firmware" / "Keep the hub powered on. You can leave this screen — the update keeps running." · "Update complete" / "Your hub is now running v<n> and is back to watching for vehicles." · "Update did not finish" / "Your hub kept its previous firmware and is still working. Check that it is powered on and connected, then try again." · "Calculating..." · "Reference: <code>" | Try again |
| Refused | Dialog | "Cannot start update" | (server's reason) | OK |
| Session expired | Dialog | "Sign in again" | "Your session expired before the update could start. Your hub is untouched. Sign in again and retry." | OK |
| Lost contact | Dialog | "Lost contact" | "We lost contact with the hub while watching the update. The update may still be running. Check that the hub is powered on and connected, then open Firmware again to see where it got to." | OK |
| Screen reader | Announcement | | "Firmware update <N> percent complete" | |

## Sensors

| Where | Kind | Title | Message | Buttons |
|---|---|---|---|---|
| Sensors list, empty | Inline | | "No Sensors have been added." · "Press the plus button below to get started." | |
| Add sensor | Inline | | "Add a sensor" · "Name of sensor" · "Prepare to add" · "Remove the top of the sensor's case. ↵↵Find the red button. (Don't press it yet.)" · "Press and release the red button for 1 second" · "Searching for sensor... <n>" · "The sensor has successfully connected to the Hub." | Continue / I see the red button! / Cancel / Return |
| Add sensor, failures | Inline | | "Hub is not connected. Reconnect it, wait 15 seconds, and then try again." · "The sensor was unable to connect to the Hub. Please try again. If the problem persists, please contact support." | Return |
| Sensor details | Inline | | "Battery Status: Checking..." · "Battery Status: Low" · "Battery Status: Good" | |
| Flagged sensor | Inline | | "This sensor has been flagged for suspicious activity. Please contact support to re-activate this sensor" | Contact Support |
| Sensor alerts switch | Toast | | "Notifications turned on." / "off." · failure "Notifications failed to turn on." / "off." | |
| Pair Sounder | Banner ✓ | | "Sent pairing message successfully" | |
| Find Sensor failed | Popup | "An error occurred." | "Could not find location. Please make sure you have set a location for this sensor. If the problem persists, please contact support." | Okay |
| Delete sensor | Popup | "Delete Sensor?" | "Are you sure you want to delete this Sensor?" | Cancel / Delete |
| Coordinates missing | Popup | "Coordinates Needed" | "Enter a latitude and longitude, or tap Detect Location to use where you are now." | Okay |
| Location problems | Popup | "Can't Get Location" | "Location services are turned off on this device. Turn them on in Settings, or type the coordinates in by hand." · "Cartell needs location access to place this sensor. Allow it when prompted, or type the coordinates in by hand." · "Location access is turned off for Cartell. Turn it on in Settings > Cartell > Location, or type the coordinates in by hand." · "Could not get a location fix. Move somewhere with a clearer view of the sky and try again, or type the coordinates in by hand." | Okay |

## Event history

| Where | Kind | Message |
|---|---|---|
| Event labels | Inline (red) | "Motion Detected" · "Connected" · "Disconnected" |
| Sensor events | Inline | "Connected to <hub name>" |
| Hub history error | Inline | the raw error text, e.g. "Instance of 'UnableToUpdateExceptions'" |

## Account

| Where | Kind | Title | Message | Buttons |
|---|---|---|---|---|
| Phone placeholder | Inline | | "Enter Phone Number" | |
| Notifications switch | Toast | | "Notifications turned on." / "off." · "Error encountered of type: <ErrorName>. Notifications are still off/on. Please try again soon." | |
| Email switch | Toast | | "Email notifications turned on." / "off." · "Error encountered of type: <ErrorName>. Email notifications are still off/on. Please try again soon." | |
| Biometrics switch | Toast | | "Cartell will ask for your fingerprint or face when it opens." · "Biometric unlock turned off." · "Could not save that setting. Please try again." | |
| Delete account | Popup + field | "Delete Account" | "You are about to delete your account. Possible data loss can occur. If you are sure that you want to delete your account, please enter your password." (field: "Enter your password") | Cancel / Delete |
| Deleted | Popup | "Account Successfully Removed" | "Your account has been removed." | Okay |
| Passwords differ | Popup | "Passwords Do Not Match" | "Please make sure your new password and confirmation match." | Okay |
| Password changed | Popup | "Password Change Successful!" | (empty) | Okay |
| Generic failure | Popup | "An error occurred." | "Please try again. Contact support if errors persist." | Okay |
| Load failure (edit phone, feedback) | Inline | | "Something went wrong. Please try again." · "Your session has expired. Please sign in again." · "We couldn't load your account information. Please try again." | |

## Help, feedback, Alexa

| Where | Kind | Title | Message | Buttons |
|---|---|---|---|---|
| Help | Inline | | "Version: <v>↵Build: <b>↵Env: <ENV>↵App Name: <name>" | |
| Feedback prompt | Popup | "Give Feedback" | "Thank you for using the Cartell app! If you have a second, we'd appreciate any feedback you'd like to give!" | No thanks / Sure! |
| Feedback declined | Toast (black) | | "If you'd like to give feedback in the future, you can do so on the help screen." | |
| Feedback panel | Inline | | "How'd We Do?" · "Let us know what you think of our app!" | Close / Submit |
| Feedback sent | Toast (black) | | "Thank you for your feedback!" | |
| Alexa | Inline | | "Connected" / "Not Connected" · "Notifications will automatically be send to Alexa when a sensor is triggered" · four command rows ([27](27-alexa-voice-commands.md)) | Link to Cartell Skill |

## Notifications (from the server, for reference)

| Kind | Title | Message |
|---|---|---|
| Test notification | "Test Notification" | "You can ignore this." |
| Alerts | set by the server | set by the server |
