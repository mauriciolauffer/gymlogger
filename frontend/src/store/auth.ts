import { reactive, computed } from "vue";
import { createAuthClient } from "better-auth/client";

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

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8787",
  fetchOptions: {
    onResponse(context) {
      const token = context.response.headers.get("set-auth-token");
      if (token) {
        state.token = token;
        localStorage.setItem("gymlogger_token", token);
      }
    },
  },
});

export const authStore = {
  get token() {
    return state.token;
  },
  get user() {
    return state.user;
  },
  isAuthenticated: computed(() => !!state.token),

  setUser(user: User) {
    state.user = user;
    localStorage.setItem("gymlogger_user", JSON.stringify(user));
  },

  clearAuth() {
    state.token = null;
    state.user = null;
    localStorage.removeItem("gymlogger_token");
    localStorage.removeItem("gymlogger_user");
  },

  async logout() {
    try {
      if (state.token) {
        await authClient.signOut({
          fetchOptions: {
            headers: { Authorization: `Bearer ${state.token}` },
          },
        });
      }
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      authStore.clearAuth();
    }
  },
};
