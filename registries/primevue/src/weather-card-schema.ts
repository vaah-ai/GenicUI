/**
 * WeatherCard — TypeBox schema for the display-only weather card.
 *
 * Props:
 *   - city (required string) — the city to display weather for
 *   - units (optional 'metric' | 'imperial') — temperature units
 *
 * @see {F47} — Component-event interactivity (CityPicker → WeatherCard)
 */

import { Type } from '@sinclair/typebox';

export const WeatherCardSchema = Type.Object(
  {
    city: Type.String(),
    units: Type.Optional(
      Type.Union([
        Type.Literal('metric'),
        Type.Literal('imperial'),
      ]),
    ),
  },
  { additionalProperties: false },
);
