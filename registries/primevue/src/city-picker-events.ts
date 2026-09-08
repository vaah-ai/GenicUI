/**
 * CityPicker — event declarations for the city-selector component.
 *
 * Events:
 *   - submit — the user selected a city and clicked "Show weather"
 *     payload: { city: string }
 *
 * @see {F47} — Component-event interactivity (CityPicker → WeatherCard)
 */

import { Type } from '@sinclair/typebox';

export const CityPickerEvents = [
  {
    name: 'submit',
    payloadSchema: Type.Object(
      {
        city: Type.String(),
      },
      { additionalProperties: false },
    ),
  },
] as const;
