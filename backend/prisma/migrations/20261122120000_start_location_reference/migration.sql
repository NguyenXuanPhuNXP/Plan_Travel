ALTER TABLE `itineraries`
  ADD COLUMN `start_location_id` BIGINT UNSIGNED NULL,
  ADD INDEX `idx_itineraries_start_location` (`start_location_id`),
  ADD CONSTRAINT `FK_itineraries_start_location`
    FOREIGN KEY (`start_location_id`) REFERENCES `locations`(`id`)
    ON DELETE SET NULL ON UPDATE NO ACTION;
