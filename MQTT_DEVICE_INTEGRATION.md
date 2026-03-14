# MQTT Device Integration Guide — Incubator

This document describes the MQTT protocol contract between the Incubator device (client) and the platform (server).

---

## Broker Connection

| Parameter      | Value                              |
|----------------|------------------------------------|
| Broker IP      | `45.79.206.183`                    |
| Port           | `1883`                             |
| Protocol       | MQTT v3.1.1                        |
| Client ID      | Any unique string (e.g. `incubator_device1`) |
| Authentication | None (username/password optional)  |
| Topic Prefix   | `incubator/device1`                |

> The topic prefix maps to a single physical device. If you add more devices, use `incubator/device2`, etc.

---

## Topic Overview

| Direction         | Topic                                      | Purpose                          |
|-------------------|--------------------------------------------|----------------------------------|
| Device → Platform | `incubator/device1/telemetry/data`          | Sensor readings                        |
| Device → Platform | `incubator/device1/device/status`           | Current actuator states                |
| Device → Platform | `incubator/device1/device/online`           | Online/heartbeat signal                |
| Device → Platform | `incubator/device1/device/request_commands` | Request last command after reconnect   |
| Device → Platform | `incubator/device1/system/alerts`           | Device-generated alerts                |
| Device → Platform | `incubator/device1/system/errors`           | Error messages                         |
| Device → Platform | `incubator/device1/actuator/feedback`       | Confirmation after command             |
| Platform → Device | `incubator/device1/actuator/commands`       | Commands to control actuators          |

---

## Topics: Device → Platform (Publish)

### 1. `incubator/device1/telemetry/data`
Publish sensor readings on a regular interval (recommended: every 5–10 seconds).

**QoS:** 0 (fire and forget is fine for telemetry)

**Payload:**
```json
{
  "temperature": 37.5,
  "humidity": 55.2,
  "soil_temperature": 28.3,
  "pump_status": 1,
  "egg_rotation_motor_status": 1,
  "exhaust_fan_status": 0,
  "inlet_fan_status": 1,
  "radiator_fan_status": 0,
  "timestamp": 1741823400
}
```

| Field                        | Type    | Description                              |
|------------------------------|---------|------------------------------------------|
| `temperature`                | float   | Air temperature in °C                    |
| `humidity`                   | float   | Relative humidity in %                   |
| `soil_temperature`           | float   | Soil / water temperature in °C (send `null` if sensor unavailable) |
| `pump_status`                | int     | `1` = ON, `0` = OFF                      |
| `egg_rotation_motor_status`  | int     | `1` = ON, `0` = OFF                      |
| `exhaust_fan_status`         | int     | `1` = ON, `0` = OFF                      |
| `inlet_fan_status`           | int     | `1` = ON, `0` = OFF                      |
| `radiator_fan_status`        | int     | `1` = ON, `0` = OFF                      |
| `timestamp`                  | int     | Unix timestamp in **seconds** (UTC)      |

**Alert thresholds** (platform-side, automatic):
- Temperature > `39.0°C` → `TEMPERATURE_HIGH` alert
- Temperature < `36.0°C` → `TEMPERATURE_LOW` alert

---

### 2. `incubator/device1/device/status`
Publish the current actuator states. **This is used as confirmation** — the platform UI will only update the toggle switches after receiving this message. Publish immediately after successfully executing a command.

**QoS:** 1 (at least once)

**Payload:**
```json
{
  "pump": true,
  "egg_rotation_motor": true,
  "exhaust_fan": false,
  "inlet_fan": true,
  "radiator_fan": false
}
```

| Field                | Type    | Description           |
|----------------------|---------|-----------------------|
| `pump`               | boolean | `true` = ON           |
| `egg_rotation_motor` | boolean | `true` = ON           |
| `exhaust_fan`        | boolean | `true` = ON           |
| `inlet_fan`          | boolean | `true` = ON           |
| `radiator_fan`       | boolean | `true` = ON           |

> **Important:** The platform waits up to **5 seconds** for this message after sending a command. If no confirmation is received within that window, the UI shows an error and the toggle reverts. Always publish this after executing any command.

---

### 3. `incubator/device1/device/request_commands`
Publish this immediately after connecting/reconnecting to request the platform to re-send the last known command and check for pending OTA updates. This allows the device to sync its actuator states and firmware after being offline.

**QoS:** 1

**Payload:**
```json
{ "reason": "reconnect", "fv": "1.5" }
```

| Field    | Type   | Description                                            |
|----------|--------|--------------------------------------------------------|
| `reason` | string | Any string — informational only                        |
| `fv`     | string | Current firmware version running on the device         |

The platform responds by publishing to `incubator/device1/actuator/commands` with the last actuator command **and**, if an OTA update is available **and the device's `fv` is older**, a `firmware_update` object:

```json
{
  "pump": true,
  "egg_rotation_motor": true,
  "exhaust_fan": false,
  "inlet_fan": true,
  "radiator_fan": false,
  "firmware_update": {
    "available": true,
    "version": "1.6",
    "download_url": "http://45.79.206.183:3001/firmware/v1.6.bin",
    "file_size": 524288
  }
}
```

- If `fv` is omitted, the platform sends the firmware URL anyway (version unknown → safe to update).
- If the device's `fv` is equal to or newer than the available version, `firmware_update` is **not** included.
- If only a firmware update applies (no prior actuator command), the actuator fields are omitted.

| Field                          | Type    | Description                              |
|--------------------------------|---------|------------------------------------------|
| `firmware_update.available`    | boolean | Always `true` when present               |
| `firmware_update.version`      | string  | New firmware version                     |
| `firmware_update.download_url` | string  | HTTP URL to download the binary          |
| `firmware_update.file_size`    | int     | Expected binary size in bytes            |

> If no command has ever been sent and no firmware update is pending, the platform does nothing.

---

### 4. `incubator/device1/device/online`
Heartbeat / online signal. Publish periodically to indicate the device is alive.

**QoS:** 0

**Payload:** Any JSON — e.g.:
```json
{ "online": true }
```

---

### 5. `incubator/device1/system/alerts`
Publish when the device detects a condition that requires attention (separate from sensor threshold alerts handled server-side).

**QoS:** 1

**Payload:**
```json
{
  "type": "TEMPERATURE_HIGH",
  "value": 41.2,
  "threshold": 39.0
}
```

| Field       | Type   | Description                                      |
|-------------|--------|--------------------------------------------------|
| `type`      | string | Alert type. Use `CRITICAL`, `HIGH`, or `LOW` in the name for severity classification |
| `value`     | float  | The measured value that triggered the alert      |
| `threshold` | float  | The threshold that was crossed                   |

**Example alert types:**
- `TEMPERATURE_HIGH`
- `TEMPERATURE_LOW`
- `HUMIDITY_HIGH`
- `HUMIDITY_LOW`
- `SENSOR_ERROR`

---

### 6. `incubator/device1/system/errors`
Publish when the device encounters an internal error (sensor failure, hardware fault, etc.).

**QoS:** 1

**Payload:**
```json
{
  "error": "Sensor read failure",
  "code": "ERR_SENSOR_001"
}
```

---

### 7. `incubator/device1/actuator/feedback`
Optional — publish after executing a command as explicit acknowledgement. The platform subscribes to this topic. For confirmation purposes, `device/status` is preferred and is what the UI currently listens to.

**QoS:** 1

**Payload:**
```json
{
  "pump": true,
  "egg_rotation_motor": true,
  "exhaust_fan": false,
  "inlet_fan": true,
  "radiator_fan": false,
  "success": true
}
```

---

## Topic: Platform → Device (Subscribe)

### `incubator/device1/actuator/commands`
The platform publishes commands here when a user toggles an actuator on the dashboard.

**QoS:** 1 (guaranteed delivery)

**Payload:**
```json
{
  "pump": true,
  "egg_rotation_motor": true,
  "exhaust_fan": false,
  "inlet_fan": true,
  "radiator_fan": false
}
```

| Field                | Type    | Description                        |
|----------------------|---------|------------------------------------|
| `pump`               | boolean | Desired pump state                 |
| `egg_rotation_motor` | boolean | Desired egg rotation motor state   |
| `exhaust_fan`        | boolean | Desired exhaust fan state          |
| `inlet_fan`          | boolean | Desired inlet fan state            |
| `radiator_fan`       | boolean | Desired radiator fan state         |

> The payload always contains **all five actuator states**, not just the changed one. Apply all values on receipt.

**Device must:**
1. Receive the command
2. Apply the requested states to the hardware
3. Publish current states to `incubator/device1/device/status` to confirm execution

**Command status lifecycle (platform-side):**

| Status      | Meaning                                                  |
|-------------|----------------------------------------------------------|
| `pending`   | Command sent to broker — device has not yet confirmed    |
| `confirmed` | Device replied via `device/status` — actuators applied  |
| `failed`    | MQTT broker/network error — command was never sent       |

Commands remain `pending` until the device publishes `device/status`. If the device reconnects after being offline and sends `device/request_commands`, the platform re-publishes the last command (regardless of its current status) so the device can apply and confirm it.

---

## Command Flow

**Normal (online) flow:**
```
Platform                          Device
   |                                 |
   |-- actuator/commands ----------->|  (pump, egg_rotation_motor, exhaust_fan, inlet_fan, radiator_fan)
   |                                 |  [device applies the command]
   |<-- device/status ---------------|  (pump, egg_rotation_motor, exhaust_fan, inlet_fan, radiator_fan)
   |                                 |
   [UI toggle updates]
```

If the device does not publish `device/status` within 5 seconds, the platform times out and shows an error.

**Reconnect flow (device was offline):**
```
Platform                          Device
   |                                 |
   |                                 |  [device reconnects to broker]
   |<-- device/request_commands -----|  { reason: "reconnect" }
   |                                 |
   |-- actuator/commands ----------->|  { pump, egg_rotation_motor, exhaust_fan,
   |                                 |    inlet_fan, radiator_fan,
   |                                 |    firmware_update: {...} }   ← if device fv < available
   |                                 |  [device applies actuator states]
   |<-- device/status ---------------|  { pump, egg_rotation_motor, exhaust_fan, ... }
   |                                 |  [device performs OTA if firmware_update present]
```

---

## Recommended Device Loop

```
on boot / reconnect:
  connect to MQTT broker
  subscribe to: incubator/device1/actuator/commands
  publish to:   incubator/device1/device/online           { online: true }
  publish to:   incubator/device1/device/request_commands { reason: "reconnect", fv: FIRMWARE_VERSION }
  // platform will respond with last command on actuator/commands

every 5-10 seconds:
  read sensors
  publish to: incubator/device1/telemetry/data  { temperature, humidity, ..., timestamp }

on message received on actuator/commands:
  parse payload
  apply pump, egg_rotation_motor, exhaust_fan, inlet_fan, radiator_fan states
  publish to: incubator/device1/device/status  { pump, egg_rotation_motor, exhaust_fan, inlet_fan, radiator_fan }
```
