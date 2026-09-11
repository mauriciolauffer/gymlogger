import { createRouter, createWebHistory } from "vue-router";
import { authStore } from "../store/auth";

export const routes = [
  { path: "/login", name: "login", component: () => import("../views/LoginView.vue"), meta: { public: true } },
  { path: "/register", name: "register", component: () => import("../views/RegisterView.vue"), meta: { public: true } },
  { path: "/workouts", name: "workouts", component: () => import("../views/WorkoutHistoryView.vue") },
  { path: "/active-workout", name: "active-workout", component: () => import("../views/ActiveWorkoutView.vue") },
  { path: "/templates", name: "templates", component: () => import("../views/TemplatesView.vue") },
  { path: "/exercises", name: "exercises", component: () => import("../views/ExercisesView.vue") },
  { path: "/analytics", name: "analytics", component: () => import("../views/AnalyticsView.vue") },
  { path: "/measurements", name: "measurements", component: () => import("../views/MeasurementsView.vue") },
  { path: "/profile", name: "profile", component: () => import("../views/ProfileView.vue") },
  { path: "/settings", name: "settings", component: () => import("../views/SettingsView.vue") },
  { path: "/:pathMatch(.*)*", redirect: "/workouts" },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from) => {
  const isAuth = authStore.isAuthenticated.value;
  if (!to.meta.public && !isAuth) {
    return { name: "login" };
  } else if (to.meta.public && isAuth) {
    return { name: "workouts" };
  }
});
