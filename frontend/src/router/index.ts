import { createRouter, createWebHistory } from "vue-router";
import { authStore } from "../store/auth";

import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/RegisterView.vue";
import ActiveWorkoutView from "../views/ActiveWorkoutView.vue";
import WorkoutHistoryView from "../views/WorkoutHistoryView.vue";
import TemplatesView from "../views/TemplatesView.vue";
import ExercisesView from "../views/ExercisesView.vue";
import AnalyticsView from "../views/AnalyticsView.vue";
import MeasurementsView from "../views/MeasurementsView.vue";
import ProfileView from "../views/ProfileView.vue";
import SettingsView from "../views/SettingsView.vue";

export const routes = [
  { path: "/login", name: "login", component: LoginView, meta: { public: true } },
  { path: "/register", name: "register", component: RegisterView, meta: { public: true } },
  { path: "/workouts", name: "workouts", component: WorkoutHistoryView },
  { path: "/active-workout", name: "active-workout", component: ActiveWorkoutView },
  { path: "/templates", name: "templates", component: TemplatesView },
  { path: "/exercises", name: "exercises", component: ExercisesView },
  { path: "/analytics", name: "analytics", component: AnalyticsView },
  { path: "/measurements", name: "measurements", component: MeasurementsView },
  { path: "/profile", name: "profile", component: ProfileView },
  { path: "/settings", name: "settings", component: SettingsView },
  { path: "/:pathMatch(.*)*", redirect: "/workouts" },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const isAuth = authStore.isAuthenticated.value;
  if (!to.meta.public && !isAuth) {
    next({ name: "login" });
  } else if (to.meta.public && isAuth) {
    next({ name: "workouts" });
  } else {
    next();
  }
});
