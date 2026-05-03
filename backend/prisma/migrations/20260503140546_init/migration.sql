-- CreateTable
CREATE TABLE "Fleet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "droneIds" TEXT NOT NULL,
    "lastModified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionNumber" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "fleetId" TEXT NOT NULL,
    "selectedDroneIds" TEXT NOT NULL,
    "totalDrones" INTEGER NOT NULL,
    "readyToFly" INTEGER NOT NULL,
    "warning" INTEGER NOT NULL,
    "critical" INTEGER NOT NULL,
    "offline" INTEGER NOT NULL,
    "maintenanceDue" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Session_fleetId_fkey" FOREIGN KEY ("fleetId") REFERENCES "Fleet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
