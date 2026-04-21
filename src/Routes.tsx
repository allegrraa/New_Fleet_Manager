/*
 * Routes.tsx
 *
 * Centralised route configuration for the entire application.
 * Uses React Router v6's createBrowserRouter (Data Router API) so that
 * route params (:fleetId, :sessionId, :robotId) are automatically extracted
 * and made available inside each page via the useParams() hook --> extract key-value pair from dynamic url
 *
 * Route hierarchy (URL → Component):
 *   /                                   → FleetSelection   (home: list / create / delete fleets)
 *   /fleet/:fleetId                     → FleetDashboard   (drone list + flight log for one fleet)
 *   /fleet/:fleetId/session/new         → SessionSelection (pick drones & name a new session)
 *   /fleet/:fleetId/session/:sessionId  → Dashboard        (live overview + events for a session)
 *   /fleet/:fleetId/robot/:robotId      → RobotHistory     (per-drone history — stub page)
 */

import { createBrowserRouter } from "react-router-dom";
import { FleetSelection} from "./pages/FleetSelection";
import { FleetDashboard} from "./pages/FleetDashboard";
import { SessionSelection} from "./pages/SessionSelection";
import { Dashboard} from "./pages/Dashboard";
import { RobotHistory } from "./pages/RobotHistory";

// Define the routes for the application
export const router = createBrowserRouter([
    {
        path: "/",
        Component: FleetSelection,
    },
    {
        // :fleetId is a dynamic segment — its value is readable with useParams() in the component.
        path: "/fleet/:fleetId",
        Component: FleetDashboard
    },
    {
        // The literal string "new" is placed before ":sessionId" so the router
        // can distinguish between creating a session and viewing an existing one.
        path: "/fleet/:fleetId/session/new",
        Component: SessionSelection
    },
    {
        path: "/fleet/:fleetId/session/:sessionId",
        Component: Dashboard
    },
    {
        path: "/fleet/:fleetId/robot/:robotId",
        Component: RobotHistory
    },
    ]);

    /* Quick reference:
       /                           → choose fleet
       /fleet/1                    → see all drones in fleet 1
       /fleet/1/session/new        → create a session for fleet 1
       /fleet/1/session/SES-001    → session dashboard for SES-001
       /fleet/1/robot/RBT-001      → robot history for RBT-001
    */