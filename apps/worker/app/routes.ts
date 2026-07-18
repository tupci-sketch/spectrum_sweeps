import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("leaderboard/:competitionId", "routes/leaderboard.$competitionId.tsx"),
  route("admin", "routes/admin.tsx"),
  route("admin/competitions/:competitionId", "routes/admin.competitions.$competitionId.tsx"),
] satisfies RouteConfig;
