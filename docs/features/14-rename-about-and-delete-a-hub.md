# 14 — Rename, View Info About, or Delete a Hub

## In short

Three housekeeping actions from the hub's ⋮ menu: give the hub a new name, see its technical
details (MAC address and firmware versions), or remove it from the account.

| | |
|---|---|
| **Who** | Hub owners |
| **Where** | Hub details → ⋮ → **Rename Hub** / **About** / **Delete Hub** |
| **Flutter source** | `screens/devices/edit_device.dart`, `screens/devices/device_meta.dart`, `screens/devices/device_view.dart` (delete), `components/key_value_pair_display.dart` |
| **Detailed spec** | `docs/spec/10-hubs.md` §3, §5, §6 |
| **Porting plan** | Phase 9 (9.5, 9.6) |

## Rename a hub

### What the user sees

- Top bar with ☰, logo and **X**.
- **←** arrow; a small satellite-dish icon with **"Hub Settings"** in amber (this heading says
  "Hub Settings" although the screen renames the hub).
- **"Enter Your Hub Name."**
- A text field labelled **Hub Name**, filled in with the current name.
- **Submit** (blue, ✓ icon).

### What happens

| The user... | What happens |
|---|---|
| taps **Submit** | The new name is saved (`PATCH /devices/{id}/` with `name`). When the server confirms (200), the app returns to Hub details with the new name. |
| taps **X**, **←** or Back | Returns to Hub details without saving |

### When something goes wrong

If saving fails, **nothing visible happens**: the user stays on the form and the error is only
reported to Sentry (Q27). An empty name is sent to the server as-is; the app does not check it.

## About this hub

### What the user sees

- Top bar with ☰, logo and **X**.
- **←**, the hub name, and the **status picture** (checking / connected / disconnected / last
  known), refreshed when the screen opens.
- Three rows, label on the left and value on the right (stacked when the phone's text is large):

  | Label | Value |
  |---|---|
  | "Mac Address" | e.g. `48:27:e2:b1:94:44`, as the server stores it |
  | "Controller Firmware Version" | the ESP32 chip's version number, e.g. `1025` |
  | "Transmitter Firmware Version" | the RFM6601 radio chip's version number |

- "Last Updated: " followed by the **current** date and time.

**X**, **←** or Back return to Hub details.

### What the app asks of the server

`POST /devices/{id}/message/get_health/` and `GET /devices/{id}/` when the screen opens.

### Odd but true

- **Q18**: a missing firmware version is displayed as the word **"null"**.
- **Q18**: "Last Updated" shows the time the screen was **drawn**, and changes whenever it redraws,
  rather than the time of the last refresh.

## Delete a hub

### What happens

1. ⋮ → **Delete Hub** (red). The popup opens **on top of the still-open menu**.
2. Popup **"Delete Hub?"** / "Are you sure you want to delete this Hub? Note: Any sensors paired
   to this hub will remain paired until manually deleted." with **Cancel** and **Delete**.
3. **Delete**: the app deletes the hub on the server. On success, the popup and the menu close and
   the **Hubs list** reloads without the hub.
4. **Cancel**: closes the popup; the ⋮ menu is still open underneath.

### What the app asks of the server

| Request | Expects |
|---|---|
| `DELETE /devices/{id}/` | status below 300 |

### When something goes wrong

If the delete fails, **the popup simply stays open**. There is no message; the error goes to
Sentry (code `5486f`, or `cda7f` if the session check failed) (Q27).

### Odd but true

- The delete popup's text says sensors "will remain paired until manually deleted".
- There is no undo.

## Related

- [12 Hub details](12-hub-details.md) · [15 Firmware updates](15-firmware-updates.md) ·
  [30 Popups](30-popups-toasts-and-banners.md)
