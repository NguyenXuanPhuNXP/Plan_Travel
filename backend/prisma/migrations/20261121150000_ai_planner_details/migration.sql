ALTER TABLE `itineraries`
  ADD COLUMN `start_latitude` DECIMAL(10, 7) NULL,
  ADD COLUMN `start_longitude` DECIMAL(10, 7) NULL,
  ADD COLUMN `departure_time` VARCHAR(5) NOT NULL DEFAULT '08:00',
  ADD COLUMN `max_stops_per_day` INT NOT NULL DEFAULT 8;
