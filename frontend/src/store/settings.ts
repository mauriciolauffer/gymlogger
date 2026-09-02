import { reactive } from "vue";
import { api } from "../api/client";

export interface UserSettings {
  theme: "system" | "light" | "dark";
  preferred_weight_unit: "kg" | "lb";
  preferred_length_unit: "cm" | "in";
  language: string;
  rest_timer_duration_seconds: number;
  notifications_enabled: boolean;
}

const state = reactive<UserSettings>({
  theme: "system",
  preferred_weight_unit: "kg",
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
      const data = await api.get<{ settings: UserSettings }>("/api/v1/users/settings");
      if (data.settings) {
        Object.assign(state, data.settings);
      }
    } catch (err) {
      console.error("Failed to fetch user settings", err);
    }
  },

  async updateSettings(newSettings: Partial<UserSettings>) {
    try {
      const data = await api.put<{ settings: UserSettings }>("/api/v1/users/settings", newSettings);
      if (data.settings) {
        Object.assign(state, data.settings);
      }
    } catch (err) {
      console.error("Failed to update user settings", err);
      throw err;
    }
  },
};
