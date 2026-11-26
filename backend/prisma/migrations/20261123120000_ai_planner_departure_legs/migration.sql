ALTER TABLE `itinerary_items`
  ADD COLUMN `travel_minutes_from_previous` INT UNSIGNED NULL,
  ADD COLUMN `travel_distance_from_previous_km` DECIMAL(8, 2) NULL,
  ADD COLUMN `travel_is_estimated_from_previous` BOOLEAN NOT NULL DEFAULT FALSE;
