-- Add SAJ to cabang if it doesn't exist
INSERT INTO cabang (name)
VALUES ('SAJ')
ON CONFLICT DO NOTHING;