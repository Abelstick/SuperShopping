-- Remove duplicate purchases keeping only the oldest one per session_id.
-- Run once to clean up existing duplicates, then the app fix prevents new ones.
DELETE FROM purchases
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY session_id
        ORDER BY created_at ASC   -- keep the first created
      ) AS rn
    FROM purchases
    WHERE session_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Add a unique constraint so duplicates are impossible going forward
ALTER TABLE purchases
  ADD CONSTRAINT purchases_session_id_unique UNIQUE (session_id);
