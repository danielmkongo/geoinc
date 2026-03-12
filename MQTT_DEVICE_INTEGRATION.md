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
| Device → Platform | `incubator/device1/telemetry/data`         | Sensor readings                  |
| Device → Platform | `incubator/device1/device/status`          | Current actuator states          |
| Device → Platform | `incubator/device1/device/online`          | Online/heartbeat signal          |
| Device → Platform | `incubator/device1/system/alerts`          | Device-generated alerts          |
| Device → Platform | `incubator/device1/system/errors`          | Error messages                   |
| Device → Platform | `incubator/device1/actuator/feedback`      | Confirmation after command       |
| Platform → Device | `incubator/device1/actuator/commands`      | Commands to control actuators    |

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
  "heater_status": 1,
  "humidifier_status": 0,
  "linear_actuator_status": 1,
  "timestamp": 1741823400
}
```

| Field                    | Type    | Description                              |
|--------------------------|---------|------------------------------------------|
| `temperature`            | float   | Air temperature in °C                    |
| `humidity`               | float   | Relative humidity in %                   |
| `soil_temperature`       | float   | Soil / water temperature in °C (send `null` if sensor unavailable) |
| `heater_status`          | int     | `1` = ON, `0` = OFF                      |
| `humidifier_status`      | int     | `1` = ON, `0` = OFF                      |
| `linear_actuator_status` | int     | `1` = ON, `0` = OFF                      |
| `timestamp`              | int     | Unix timestamp in **seconds** (UTC)      |

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
  "heater": true,
  "humidifier": false,
  "linear_actuator": true
}
```

| Field             | Type    | Description           |
|-------------------|---------|-----------------------|
| `heater`          | boolean | `true` = ON           |
| `humidifier`      | boolean | `true` = ON           |
| `linear_actuator` | boolean | `true` = ON           |

> **Important:** The platform waits up to **5 seconds** for this message after sending a command. If no confirmation is received within that window, the UI shows an error and the toggle reverts. Always publish this after executing any command.

---

### 3. `incubator/device1/device/online`
Heartbeat / online signal. Publish periodically to indicate the device is alive.

**QoS:** 0

**Payload:** Any JSON — e.g.:
```json
{ "online": true }
```

---

### 4. `incubator/device1/system/alerts`
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

### 5. `incubator/device1/system/errors`
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

### 6. `incubator/device1/actuator/feedback`
Optional — publish after executing a command as explicit acknowledgement. The platform subscribes to this topic. For confirmation purposes, `device/status` is preferred and is what the UI currently listens to.

**QoS:** 1

**Payload:**
```json
{
  "heater": true,
  "humidifier": false,
  "linear_actuator": true,
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
  "heater": true,
  "humidifier": false,
  "linear_actuator": true
}
```

| Field             | Type    | Description                   |
|-------------------|---------|-------------------------------|
| `heater`          | boolean | Desired heater state          |
| `humidifier`      | boolean | Desired humidifier state      |
| `linear_actuator` | boolean | Desired linear actuator state |

> The payload always contains **all three actuator states**, not just the changed one. Apply all values on receipt.

**Device must:**
1. Receive the command
2. Apply the requested states to the hardware
3. Publish current states to `incubator/device1/device/status` to confirm execution

---

## Command Flow

```
Platform                          Device
   |                                 |
   |-- actuator/commands ----------->|  (heater: true, humidifier: false, linear_actuator: true)
   |                                 |  [device applies the command]
   |<-- device/status ---------------|  (heater: true, humidifier: false, linear_actuator: true)
   |                                 |
   [UI toggle updates]
```

If the device does not publish `device/status` within 5 seconds, the platform times out and shows an error.

---

## Recommended Device Loop

```
on boot:
  connect to MQTT broker
  subscribe to: incubator/device1/actuator/commands
  publish to:   incubator/device1/device/online  { online: true }

every 5-10 seconds:
  read sensors
  publish to: incubator/device1/telemetry/data  { temperature, humidity, ..., timestamp }

on message received on actuator/commands:
  parse payload
  apply heater, humidifier, linear_actuator states
  publish to: incubator/device1/device/status  { heater, humidifier, linear_actuator }
```
