import { reactive, computed } from "vue";
import { api } from "../api/client";

interface User {
  id: string;
  email: string;
  name?: string | null;
}

const state = reactive<{
  token: string | null;
  user: User | null;
}>({
  token: localStorage.getItem("gymlogger_token"),
  user: JSON.parse(localStorage.getItem("gymlogger_user") || "null"),
});

export const authStore = {
  get token() {
    return state.token;
  },
  get user() {
    return state.user;
  },
  isAuthenticated: computed(() => !!state.token),

  setAuth(token: string, user: User) {
    state.token = token;
    state.user = user;
    localStorage.setItem("gymlogger_token", token);
    localStorage.setItem("gymlogger_user", JSON.stringify(user));
  },

  async logout() {
    try {
      if (state.token) {
        await api.post("/api/v1/auth/logout");
      }
    } catch (e) {
      console.error("Logout API call failed", e);
    } finally {
      state.token = null;
      state.user = null;
      localStorage.removeItem("gymlogger_token");
      localStorage.removeItem("gymlogger_user");
    }
  },
};
