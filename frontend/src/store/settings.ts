import { reactive } from "vue";
import { client } from "../api/client";
import type { InferResponseType } from "hono/client";
import type { Theme } from "../db/constants";

type SettingsGetRes = InferResponseType<typeof client.api.v1.users.settings.$get, 200>;
type SettingsPutRes = InferResponseType<typeof client.api.v1.users.settings.$put, 200>;

export interface UserSettings {
  theme: Theme;
  preferred_weight_unit: "kg" | "lbs";
  preferred_length_unit: "cm" | "in";
  language: string;
  rest_timer_duration_seconds: number;
  notifications_enabled: boolean;
}

const state = reactive<UserSettings>({
  theme: "S",
  preferred_weight_unit: "kg" as "kg" | "lbs",
  preferred_length_unit: "cm",
  language: "en",
  rest_timer_duration_seconds: 90,
  notifications_enabled: true,
});

export const settingsStore = {
  get settings() {
    return state;
  },

  async fetchSettings() {
    try {
      const data = (await (await client.api.v1.users.settings.$get()).json()) as SettingsGetRes;
      if (data.settings) {
        Object.assign(state, data.settings);
      }
    } catch (err) {
      console.error("Failed to fetch user settings", err);
    }
  },

  async updateSettings(newSettings: Partial<UserSettings>) {
    try {
      const httpRes = await client.api.v1.users.settings.$put({ json: newSettings });
      if (!httpRes.ok) {
        const body = (await httpRes.json()) as { error?: string };
        throw new Error(body.error || `Request failed with status ${httpRes.status}`);
      }
      const data = (await httpRes.json()) as SettingsPutRes;
      if (data.settings) {
        Object.assign(state, data.settings);
      }
    } catch (err) {
      console.error("Failed to update user settings", err);
      throw err;
    }
  },
};
