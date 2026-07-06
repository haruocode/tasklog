import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { HomePage } from "./pages/HomePage";
import { WorkspacesPage } from "./pages/WorkspacesPage";
import { ProjectsPage } from "./pages/ProjectsPage";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const workspacesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces",
  component: WorkspacesPage,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId/projects",
  component: ProjectsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  workspacesRoute,
  projectsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
