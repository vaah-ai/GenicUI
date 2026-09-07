/**
 * CityPicker — TypeBox schema for the interactive city-selector component.
 *
 * Props:
 *   - initialCity (optional string) — pre-selected city
 *   - cityOptions (required string[], min 2) — list of city names
 *   - label (optional string) — display label for the dropdown
 *
 * @see {F47} — Component-event interactivity (CityPicker → WeatherCard)
 */

import { Type } from '@sinclair/typebox';

export const CityPickerSchema = Type.Object(
  {
    initialCity: Type.Optional(Type.String()),
    cityOptions: Type.Array(Type.String(), { minItems: 2 }),
    label: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);
