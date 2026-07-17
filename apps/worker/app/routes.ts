import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("leaderboard/:competitionId", "routes/leaderboard.$competitionId.tsx"),
] satisfies RouteConfig;
