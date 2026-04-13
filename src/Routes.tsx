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
        path: "/fleet/:fleetId",
        Component: FleetDashboard 
    },
    {
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
    
    /* / → choose fleet
/fleet/1 → see all drones
/fleet/1/session/new → create session
/fleet/1/session/SES-001 → session dashboard
/fleet/1/robot/RBT-001 → robot page
*/