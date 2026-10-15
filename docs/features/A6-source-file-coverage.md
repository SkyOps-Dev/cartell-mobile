# A6 — Source File Coverage

Proof of completeness: every one of the **266 Dart files** in the Flutter app's `frontend/lib/`
is listed here with the feature page(s) that describe its behaviour. If a file appears here, what
it does for the user is described in the linked page. Generated on 2026-10-06; re-check after any
change to `frontend/`.

Codes: `01`–`32` are the feature pages ([index](README.md)); `A1`–`A5` are the appendices.
**B (all screens)** marks a shared building block (buttons, cards, spacing, result types) with no
behaviour of its own. Its exact look is specified in `docs/spec/07-design-system.md`.

Native shell files (Android/iOS configuration, icons, splash, permissions) are covered by
[32](32-permissions-and-platform-behaviour.md), [20](20-notifications.md) and
`docs/spec/01-platform-shell.md`. The file-by-file build plan is `docs/spec/22-file-coverage-matrix.md`.

| File (`frontend/lib/…`) | Feature page(s) |
|---|---|
| `bloc/auth/auth_bloc.dart` | 01, 08 |
| `bloc/auth/bloc.dart` | 01, 08 |
| `bloc/auth/event.dart` | 01, 08 |
| `bloc/auth/events/attempt_log_out_event.dart` | 06 |
| `bloc/auth/events/attempt_logging_in_event.dart` | 04, 05 |
| `bloc/auth/events/attempt_registration_event.dart` | 03 |
| `bloc/auth/events/auto_login_event.dart` | 01, 05 |
| `bloc/auth/events/go_to_login_screen_event.dart` | 04 |
| `bloc/auth/events/go_to_registration_screen_event.dart` | 03 |
| `bloc/auth/events/go_to_welcome_screen_event.dart` | 02 |
| `bloc/auth/events/maintenance_mode_event.dart` | 07 |
| `bloc/auth/state.dart` | 01, 08 |
| `bloc/devices/bloc.dart` | 08, 06 |
| `bloc/devices/devices_bloc.dart` | 08, 06 |
| `bloc/devices/event.dart` | 08, 06 |
| `bloc/devices/events/go_back_n_states_event.dart` | 08, 06 |
| `bloc/devices/events/go_to_about_device_screen.dart` | 14 |
| `bloc/devices/events/go_to_add_a_hub_screen.dart` | 10 |
| `bloc/devices/events/go_to_add_hub_success_screen.dart` | 10 |
| `bloc/devices/events/go_to_add_sensor_start.dart` | 17 |
| `bloc/devices/events/go_to_connect_hub_bloc.dart` | 11 |
| `bloc/devices/events/go_to_device_firmware_updates_event.dart` | 15 |
| `bloc/devices/events/go_to_device_settings.dart` | 13 |
| `bloc/devices/events/go_to_devices_home_screen.dart` | 09 |
| `bloc/devices/events/go_to_edit_device_screen.dart` | 14 |
| `bloc/devices/events/go_to_edit_sensor_location_screen.dart` | 19 |
| `bloc/devices/events/go_to_edit_sensor_screen.dart` | 19 |
| `bloc/devices/events/go_to_is_removing_case_for_add_sensor.dart` | 17 |
| `bloc/devices/events/go_to_sensor_connect_screen.dart` | 17 |
| `bloc/devices/events/go_to_sensor_history_event.dart` | 21 |
| `bloc/devices/events/go_to_sensors_screen_event.dart` | 16 |
| `bloc/devices/events/go_to_specific_device_event.dart` | 12 |
| `bloc/devices/events/go_to_specific_device_history_event.dart` | 21 |
| `bloc/devices/events/go_to_specific_sensor_about_screen.dart` | 19 |
| `bloc/devices/events/go_to_specific_sensor_screen.dart` | 18 |
| `bloc/devices/events/go_to_update_device_firmware_screen.dart` | 15 |
| `bloc/devices/events/refresh_devices_event.dart` | 09 |
| `bloc/devices/state.dart` | 08, 06 |
| `bloc/main_app/bloc.dart` | 08, 06 |
| `bloc/main_app/event.dart` | 08, 06 |
| `bloc/main_app/events/go_back_n_states_event.dart` | 08, 06 |
| `bloc/main_app/events/go_to_account_settings_edit_name_screen.dart` | 23 |
| `bloc/main_app/events/go_to_account_settings_edit_password_screen.dart` | 23 |
| `bloc/main_app/events/go_to_account_settings_edit_phone_number_screen.dart` | 23 |
| `bloc/main_app/events/go_to_account_settings_screen.dart` | 22 |
| `bloc/main_app/events/go_to_alexa_help_screen_state.dart` | 27 |
| `bloc/main_app/events/go_to_contact_us_screen.dart` | 25 |
| `bloc/main_app/events/go_to_event_history_screen.dart` | 21 |
| `bloc/main_app/events/go_to_hub_lights_help_screen.dart` | 28 |
| `bloc/main_app/events/go_to_hubs_screen_event.dart` | 09, 08 |
| `bloc/main_app/main_app_bloc.dart` | 08, 06 |
| `bloc/main_app/state.dart` | 08, 06 |
| `bloc/shared/bloc.dart` | 08 |
| `bloc/shared/events.dart` | 08 |
| `bloc/shared/generic_bloc.dart` | 08 |
| `bloc/shared/states.dart` | 08 |
| `components/app_scaffold.dart` | 08 |
| `components/conditional_view_widget.dart` | 22, 25 |
| `components/ellipsis.dart` | 08 |
| `components/env_banner.dart` | 29 |
| `components/errors/popup_dialog.dart` | 30 |
| `components/errors/popup_error.dart` | 30 |
| `components/errors/popup_notification.dart` | 30 |
| `components/errors/rendered_message.dart` | 30 |
| `components/forms/additional_info_field.dart` | 27 |
| `components/forms/auto_switch.dart` | 13, 22 |
| `components/forms/qr_scanner.dart` | 10 |
| `components/forms/rounded_button.dart` | B (all screens) |
| `components/forms/scalable_button.dart` | A4 |
| `components/forms/text_field_with_post_change_validators.dart` | 10 |
| `components/forms/toggle_button.dart` | A4 |
| `components/friendly_error_view.dart` | 30 |
| `components/hub_light_widget.dart` | 28, 11 |
| `components/hub_status_glyph.dart` | 12 |
| `components/icon_content.dart` | A4 |
| `components/key_value_pair_display.dart` | 14, 15 |
| `components/navbar.dart` | 08 |
| `components/pairing/pairing_step_scaffold.dart` | 11 |
| `components/popups.dart` | 30 |
| `components/responsive_spacer.dart` | B (all screens) |
| `components/reusable_card.dart` | B (all screens) |
| `components/reusable_listing.dart` | B (all screens) |
| `components/rounded_loader.dart` | 10 |
| `components/sensor_ellipsis.dart` | 16 |
| `components/sensors/sensor_card.dart` | 16 |
| `components/teast_popups.dart` | 30 |
| `components/three_button_rows/icon_button_row_entry.dart` | 12, 18 |
| `components/three_button_rows/three_button_row.dart` | 12, 18 |
| `components/timed_pull_to_refresh.dart` | 08 |
| `components/top_appbar.dart` | A4 |
| `components/user_feedback.dart` | 26 |
| `main.dart` | 01, 31 |
| `models/abstract_model.dart` | A1, A2 |
| `models/connection.dart` | A1, A2 |
| `models/device.dart` | A1, A2 |
| `models/device_model.dart` | A1, A2 |
| `models/event.dart` | A1, A2 |
| `models/firmware.dart` | A1, A2 |
| `models/firmware_update_model.dart` | A1, A2 |
| `models/json_parser.dart` | A1, A2 |
| `models/location.dart` | A1, A2 |
| `models/models.dart` | A1, A2 |
| `models/profile.dart` | A1, A2 |
| `models/sensor.dart` | A1, A2 |
| `models/setting_model.dart` | A1, A2 |
| `models/user.dart` | A1, A2 |
| `screens/account/account_settings.dart` | 22, 24 |
| `screens/account/account_settings_skeleton.dart` | 22 |
| `screens/account/edit_name.dart` | 23 |
| `screens/account/edit_password.dart` | 23 |
| `screens/account/edit_phone.dart` | 23 |
| `screens/bloc_widgets/auth_bloc_widget.dart` | 01, 07 |
| `screens/bloc_widgets/devices_bloc_widget.dart` | 08 |
| `screens/bloc_widgets/main_app_bloc_widget.dart` | 08 |
| `screens/devices/add_device/add_device.dart` | 10 |
| `screens/devices/add_device/add_device_screen.dart` | 10 |
| `screens/devices/add_device/bloc/add_device_bloc.dart` | 10 |
| `screens/devices/add_device/bloc/events/add_device_error_event.dart` | 10 |
| `screens/devices/add_device/bloc/events/add_device_event.dart` | 10 |
| `screens/devices/add_device/bloc/events/add_device_hide_mac_address_event.dart` | 10 |
| `screens/devices/add_device/bloc/events/add_device_init_event.dart` | 10 |
| `screens/devices/add_device/bloc/events/add_device_scanned_mac_address_event.dart` | 10 |
| `screens/devices/add_device/bloc/events/add_device_show_mac_address_event.dart` | 10 |
| `screens/devices/add_device/bloc/events/add_device_start_scanning_event.dart` | 10 |
| `screens/devices/add_device/bloc/events/add_device_submit_event.dart` | 10 |
| `screens/devices/add_device/bloc/events/add_device_warn_about_editing_event.dart` | 10 |
| `screens/devices/add_device/bloc/events/base_add_device_event.dart` | 10 |
| `screens/devices/add_device/bloc/states/add_device_initial_state.dart` | 10 |
| `screens/devices/add_device/bloc/states/add_device_loading_state.dart` | 10 |
| `screens/devices/add_device/bloc/states/add_device_showing_mac_address_field_state.dart` | 10 |
| `screens/devices/add_device/bloc/states/add_device_state.dart` | 10 |
| `screens/devices/add_device/bloc/states/add_device_warn_about_editing_state.dart` | 10 |
| `screens/devices/add_device/bloc/states/base_add_device_state.dart` | 10 |
| `screens/devices/add_device/successfully_added_device_screen.dart` | 10 |
| `screens/devices/connect_hub_to_wifi/bloc.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/connect_hub.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/connection_constants.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/events/error_events.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/events/hub_connection_events.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/events/hub_event.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/events/hub_setup_events.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/events/wifi_connection_events.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/events/wifi_network_events.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/hub_access_point_probe.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/hub_registration_check.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/hub_registration_poller.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/hub_wifi.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/pairing_error_codes.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/pairing_step_index.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/reply_guard.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/server_reachability.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/states.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/timer_manager.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/utilities.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/begin_pairing_hub_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/check_if_plugged_in_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/checking_if_hub_connected_to_server_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/connecting_to_hub_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/failure_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/hub_connect_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/hub_light_readings.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/hub_reverted_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/intitial_connection_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/list_wifi_networks_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/pairing_stopped_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/reestablish_connection_to_server_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/resetting_hub_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/start_hub_connecting_to_wifi_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/success_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/validating_connection_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/verifying_hub_state_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/view_wifi_network_widget.dart` | 11 |
| `screens/devices/connect_hub_to_wifi/widgets/wifi_reconnect_failed_widget.dart` | 11 |
| `screens/devices/device_meta.dart` | 14 |
| `screens/devices/device_settings_screen.dart` | 13 |
| `screens/devices/device_view.dart` | 12, 14 |
| `screens/devices/devices_screen.dart` | 09 |
| `screens/devices/edit_device.dart` | 14 |
| `screens/devices/firmware_update/available_firmware_updates_screen.dart` | 15 |
| `screens/devices/firmware_update/firmware_update_listener.dart` | 15 |
| `screens/devices/firmware_update/firmware_update_status_code.dart` | 15 |
| `screens/devices/firmware_update/firmware_update_status_type.dart` | 15 |
| `screens/devices/firmware_update/update_device_screen.dart` | 15 |
| `screens/devices/firmware_update/update_progress_snapshot.dart` | 15 |
| `screens/devices/firmware_update/websocket_close_codes.dart` | A4 |
| `screens/events/device_history.dart` | 21 |
| `screens/events/history.dart` | 21 |
| `screens/events/phone_rotation_manager.dart` | 21, 32 |
| `screens/events/sensor_history.dart` | 21 |
| `screens/misc/add_location.dart` | A4 |
| `screens/misc/alexa_cheat_sheet.dart` | 27 |
| `screens/misc/contact_us.dart` | 25 |
| `screens/misc/debug_menu.dart` | 02, 29 |
| `screens/misc/hub_lights.dart` | 28 |
| `screens/misc/invite_shared_user.dart` | A4 |
| `screens/sensors/add_sensor/00_enter_name_for_add_sensor.dart` | 17 |
| `screens/sensors/add_sensor/01_remove_case_for_add_sensor.dart` | 17 |
| `screens/sensors/add_sensor/02_sensor_connect_screen.dart` | 17 |
| `screens/sensors/edit_coordinates.dart` | 19 |
| `screens/sensors/edit_sensor.dart` | 19 |
| `screens/sensors/sensor_flagged_banner.dart` | 18, 19 |
| `screens/sensors/sensor_meta.dart` | 19 |
| `screens/sensors/sensor_view.dart` | 18, 19 |
| `screens/sensors/sensors_screen.dart` | 16 |
| `screens/welcome/load_screen.dart` | 01 |
| `screens/welcome/lock_screen.dart` | 05 |
| `screens/welcome/login_screen.dart` | 04 |
| `screens/welcome/maintenance_mode_screen.dart` | 07 |
| `screens/welcome/registration_screen.dart` | 03 |
| `screens/welcome/welcome_screen.dart` | 02 |
| `services/auth_manager/check_creds.dart` | 01, 04, 20 |
| `services/biometric_service.dart` | 05 |
| `services/data/data_persistor.dart` | A2 |
| `services/encryption.dart` | 11 |
| `services/enums/result.dart` | B (all screens) |
| `services/hash_mac_address.dart` | 10 |
| `services/immediate_timer.dart` | 17, 11 |
| `services/library.dart` | B (all screens) |
| `services/notifications.dart` | 20 |
| `services/request.dart` | 06, A1 |
| `services/requests/auth_gateway.dart` | 06, A1 |
| `services/requests/auth_requests.dart` | 06, A1 |
| `services/requests/authorized_requester.dart` | 06, A1 |
| `services/requests/device_requests.dart` | A1 |
| `services/requests/event_requests.dart` | A1 |
| `services/requests/exceptions.dart` | 06, A1 |
| `services/requests/firmware_requests.dart` | A1 |
| `services/requests/firmware_update_requests.dart` | A1 |
| `services/requests/hub_network_name_check.dart` | 07 |
| `services/requests/location_requests.dart` | A1, A4 |
| `services/requests/networking.dart` | 06, A1 |
| `services/requests/sensor_requests.dart` | A1 |
| `services/requests/settings_requests.dart` | A1 |
| `services/requests/user_requests.dart` | A1 |
| `services/secure_storage.dart` | A2 |
| `services/text_formatters.dart` | 10 |
| `udp_commands/commands.dart` | 11 |
| `udp_commands/commands/abstract_udp_command.dart` | 11 |
| `udp_commands/commands/firmware_version_commands.dart` | 11 |
| `udp_commands/commands/network_password_check_and_save.dart` | 11 |
| `udp_commands/commands/network_password_check_and_save_encrypted.dart` | 11 |
| `udp_commands/commands/scan_wifi_commands.dart` | 11 |
| `udp_commands/commands/set_websocket_uri_commands.dart` | 11 |
| `udp_commands/commands/set_wifi_ssid_and_password_commands.dart` | 11 |
| `udp_commands/commands/wifi_test_commands.dart` | 11 |
| `udp_commands/udp_connection.dart` | 11 |
| `udp_commands/upd_command_routing.dart` | 11 |
| `utilities/AppWatchers/mode_debouncer.dart` | 07 |
| `utilities/AppWatchers/mode_watcher.dart` | 07 |
| `utilities/Exceptions/AccountExceptions.dart` | 31 |
| `utilities/Exceptions/Exceptions.dart` | 31 |
| `utilities/Exceptions/HubExceptions.dart` | 31 |
| `utilities/Exceptions/NetworkExceptions.dart` | 31 |
| `utilities/Exceptions/ProfileExceptions.dart` | 31 |
| `utilities/Exceptions/SettingsExceptions.dart` | 31 |
| `utilities/Exceptions/json_parsing_exceptions.dart` | 31 |
| `utilities/Exceptions/model_exceptions.dart` | 31 |
| `utilities/bloc_popups.dart` | 30 |
| `utilities/constants.dart` | 29 |
| `utilities/device_info.dart` | 20 |
| `utilities/logging.dart` | 31 |
| `utilities/notifications.dart` | 20 |
| `utilities/object_stack.dart` | 08 |
| `utilities/scaling.dart` | 32 |
| `utilities/start_services.dart` | 01, 06 |
| `utilities/text_formatters.dart` | 22, 32 |
