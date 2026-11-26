ALTER TABLE `itineraries`
  ADD COLUMN `cost_estimates` JSON NULL;

ALTER TABLE `itinerary_items`
  ADD COLUMN `travel_is_estimated` BOOLEAN NOT NULL DEFAULT FALSE;
