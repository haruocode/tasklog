import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { HomePage } from "./pages/HomePage";
import { WorkspacesPage } from "./pages/WorkspacesPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { IssuesPage } from "./pages/IssuesPage";
import { IssueDetailPage } from "./pages/IssueDetailPage";

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

const issuesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$projectId/issues",
  component: IssuesPage,
});

const issueDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$projectId/issues/$issueId",
  component: IssueDetailPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  workspacesRoute,
  projectsRoute,
  issuesRoute,
  issueDetailRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
