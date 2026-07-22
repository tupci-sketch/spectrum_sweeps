import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("community", "routes/community.tsx"),
  route("draws", "routes/draws.tsx"),
  route("draw/:competitionId", "routes/draw.$competitionId.tsx"),
  route("audit/:competitionId", "routes/audit.$competitionId.tsx"),
  route("u/:userId", "routes/profile.$userId.tsx"),
  route("leaderboard/:competitionId", "routes/leaderboard.$competitionId.tsx"),
  route("admin", "routes/admin.tsx"),
  route("admin/competitions/:competitionId", "routes/admin.competitions.$competitionId.tsx"),
] satisfies RouteConfig;
