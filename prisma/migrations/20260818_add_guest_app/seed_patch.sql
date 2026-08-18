-- Backfills guest-facing fields (wifi, checkout time, house manual) onto the
-- properties used in the Guest App demo flow. Safe to run multiple times —
-- matches existing Property rows by name, so it does not depend on IDs.
-- Run this AFTER migration.sql has been applied.

UPDATE "Property" SET
  "wifiNetwork" = 'IslandOasis_5G',
  "wifiPassword" = 'SunsetJetty22',
  "checkoutTime" = '10:00 AM',
  "houseManual" = 'Bins are around the side of the garage — general waste and recycling both collected Tuesdays. The BBQ gas bottle is under the deck; spare key for the shed is in the lockbox. Beach access is a 5-minute walk down Ferry Rd.'
WHERE "name" = 'Island Oasis';

UPDATE "Property" SET
  "wifiNetwork" = 'BayRetreat_WiFi',
  "wifiPassword" = 'VincentiaSands7',
  "checkoutTime" = '10:00 AM',
  "houseManual" = 'Parking is in the driveway — please don''t block the neighbour''s gate. Pool towels are in the laundry cupboard.'
WHERE "name" = 'Bay Retreat';

UPDATE "Property" SET
  "wifiNetwork" = 'HilltopHideaway',
  "wifiPassword" = 'RidgeView2026',
  "checkoutTime" = '10:30 AM',
  "houseManual" = 'Pool filter runs automatically, no need to touch it. Firewood for the pit is stacked under the carport.'
WHERE "name" = 'Hilltop Hideaway';

UPDATE "Property" SET
  "wifiNetwork" = 'FernGully_Cottage',
  "wifiPassword" = 'RainforestWalk9',
  "checkoutTime" = '10:00 AM',
  "houseManual" = 'Watch for the resident water dragon by the creek — friendly, just don''t feed it. Umbrellas are by the front door.'
WHERE "name" = 'Fern Gully Cottage';

-- Ensures at least one reservation is guest-app testable "today" regardless
-- of when this is run: shifts the most recent reservation on Island Oasis so
-- its stay window brackets the current date (mirrors the local seed's
-- "The Patels" test fixture). No-op if Island Oasis has no reservations.
UPDATE "Reservation" r SET
  "checkIn" = now() - interval '3 days',
  "checkOut" = now() + interval '4 days'
WHERE r.id = (
  SELECT r2.id FROM "Reservation" r2
  JOIN "Property" p ON p.id = r2."propertyId"
  WHERE p.name = 'Island Oasis'
  ORDER BY r2."checkIn" DESC
  LIMIT 1
);
