# Data Logger HTTP Integration Guide

This document describes how a weather/data logger device sends readings to the Joto Ardhi platform over HTTP.

---

## Overview

Data loggers authenticate using a per-device **API key** included in every POST request. No tokens, no login. Each logger is registered in the Admin panel where its API key is generated and can be copied.

---

## Ingest Endpoint

### `POST /api/data-loggers/ingest`

Send a weather reading to the platform. This endpoint is **public** — no JWT token needed. Authentication is via the `api_key` field in the request body.

**Base URL:** `http://45.79.206.183:3001`

**Full URL:** `http://45.79.206.183:3001/api/data-loggers/ingest`

---

### Request

**Method:** `POST`
**Content-Type:** `application/json`

**Body:**
```json
{
  "api_key": "YOUR_DEVICE_API_KEY",
  "serialNumber": "WS-001",
  "temperature": 28.5,
  "humidity": 72.3,
  "atmosphericPressure": 1013.2,
  "windSpeed": 3.4,
  "windDirection": 180,
  "windGust": 5.1,
  "dewPoint": 22.1,
  "lightIntensity": 850,
  "waterTemp": 24.6,
  "batteryVoltage": 3.85,
  "rainfall": 0.0
}
```

| Field                 | Type   | Required | Description                                         |
|-----------------------|--------|----------|-----------------------------------------------------|
| `api_key`             | string | **Yes**  | Device API key from Admin panel                     |
| `serialNumber`        | string | No       | Device serial number (informational)                |
| `temperature`         | float  | No       | Air temperature in °C                               |
| `humidity`            | float  | No       | Relative humidity in %                              |
| `atmosphericPressure` | float  | No       | Atmospheric pressure in hPa                         |
| `windSpeed`           | float  | No       | Wind speed in m/s                                   |
| `windDirection`       | int    | No       | Wind direction in degrees (0–360, 0 = North)        |
| `windGust`            | float  | No       | Wind gust speed in m/s                              |
| `dewPoint`            | float  | No       | Dew point temperature in °C                         |
| `lightIntensity`      | float  | No       | Light intensity in lux                              |
| `waterTemp`           | float  | No       | Water / soil temperature in °C                      |
| `batteryVoltage`      | float  | No       | Battery voltage in V                                |
| `rainfall`            | float  | No       | Rainfall accumulation in mm                         |

> All sensor fields are optional. Send only the fields your device supports — missing fields are stored as `null`. Only `api_key` is required.

---

### Response

**Success — `200 OK`:**
```json
{ "ok": true }
```

**Missing API key — `401 Unauthorized`:**
```json
{ "error": "api_key required" }
```

**Wrong API key — `401 Unauthorized`:**
```json
{ "error": "Invalid api_key" }
```

**Server error — `500 Internal Server Error`:**
```json
{ "error": "Failed to store reading" }
```

---

## How Often to Send

Send one reading every **30 seconds to 5 minutes** depending on your power constraints. The platform stores every reading — more frequent = higher resolution graphs.

---

## Arduino / ESP32 Example

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID     = "YourWiFi";
const char* WIFI_PASSWORD = "YourPassword";
const char* SERVER_URL    = "http://45.79.206.183:3001/api/data-loggers/ingest";
const char* API_KEY       = "YOUR_DEVICE_API_KEY";  // from Admin panel

void sendReading(float temp, float humidity, float pressure, float battery) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  // Build JSON payload
  StaticJsonDocument<512> doc;
  doc["api_key"]             = API_KEY;
  doc["serialNumber"]        = "WS-001";
  doc["temperature"]         = temp;
  doc["humidity"]            = humidity;
  doc["atmosphericPressure"] = pressure;
  doc["batteryVoltage"]      = battery;
  // Add more fields as needed:
  // doc["windSpeed"]      = wind;
  // doc["rainfall"]       = rain;

  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  if (httpCode == 200) {
    Serial.println("✅ Reading sent");
  } else {
    Serial.printf("❌ HTTP %d\n", httpCode);
    Serial.println(http.getString());
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("WiFi connected");
}

void loop() {
  float temp     = 28.5;  // read from your sensor
  float humidity = 72.3;
  float pressure = 1013.2;
  float battery  = 3.85;

  sendReading(temp, humidity, pressure, battery);
  delay(60000);  // send every 60 seconds
}
```

---

## Python Example

```python
import requests

SERVER_URL = "http://45.79.206.183:3001/api/data-loggers/ingest"
API_KEY    = "YOUR_DEVICE_API_KEY"

payload = {
    "api_key":             API_KEY,
    "serialNumber":        "WS-001",
    "temperature":         28.5,
    "humidity":            72.3,
    "atmosphericPressure": 1013.2,
    "windSpeed":           3.4,
    "batteryVoltage":      3.85,
}

response = requests.post(SERVER_URL, json=payload, timeout=10)
print(response.json())  # {"ok": true}
```

---

## cURL Example

```bash
curl -X POST http://45.79.206.183:3001/api/data-loggers/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_DEVICE_API_KEY",
    "serialNumber": "WS-001",
    "temperature": 28.5,
    "humidity": 72.3,
    "atmosphericPressure": 1013.2,
    "batteryVoltage": 3.85
  }'
```

---

## Getting Your API Key

1. Log in to the platform as an Admin
2. Go to **Admin → Data Loggers**
3. Your device's API key is shown in the table — click the copy button
4. If no device is registered yet, click **Register Logger** to create one

---

## Online / Offline Status

The platform considers a data logger **online** if it sent a reading within the last **30 minutes**. The `last_seen` timestamp is updated on every successful ingest request.

---

## Notes

- The ingest endpoint has **no rate limiting** — be reasonable (max 1 req/sec)
- Readings are timestamped **server-side** when received (UTC, stored as EAT in display)
- If the device has no connectivity, buffer locally and send when reconnected — each POST is independent
- Do not retry failed requests in a tight loop; back off on repeated `500` errors
