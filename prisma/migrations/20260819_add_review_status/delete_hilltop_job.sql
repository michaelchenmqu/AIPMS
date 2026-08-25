-- Removes the anomalous $4,841 Hilltop Hideaway housekeeping job for demo
-- purposes. Run the SELECT first to confirm it matches exactly one job,
-- then run the DELETE block.

-- 1) Preview — confirm this is the right job before deleting anything.
SELECT j.id, p.name AS property, j."totalCost", j."laborCost", j."linenCost",
       j."computedHours", j.status, j."departureAt"
FROM "Job" j
JOIN "Property" p ON p.id = j."propertyId"
WHERE p.name = 'Hilltop Hideaway'
  AND ROUND(j."totalCost"::numeric) = 4841;

-- 2) Delete — only run this after confirming the preview above looks right.
--    JobRoomCheck and LinenUsage both reference Job with ON DELETE RESTRICT,
--    so their rows must go first.
DELETE FROM "JobRoomCheck"
WHERE "jobId" IN (
  SELECT j.id FROM "Job" j
  JOIN "Property" p ON p.id = j."propertyId"
  WHERE p.name = 'Hilltop Hideaway' AND ROUND(j."totalCost"::numeric) = 4841
);

DELETE FROM "LinenUsage"
WHERE "jobId" IN (
  SELECT j.id FROM "Job" j
  JOIN "Property" p ON p.id = j."propertyId"
  WHERE p.name = 'Hilltop Hideaway' AND ROUND(j."totalCost"::numeric) = 4841
);

DELETE FROM "Job"
WHERE id IN (
  SELECT j.id FROM "Job" j
  JOIN "Property" p ON p.id = j."propertyId"
  WHERE p.name = 'Hilltop Hideaway' AND ROUND(j."totalCost"::numeric) = 4841
);
