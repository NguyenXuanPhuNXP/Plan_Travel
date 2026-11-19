ALTER TABLE `trip_post_comments`
  ADD COLUMN `parent_id` BIGINT UNSIGNED NULL,
  ADD INDEX `trip_post_comments_parent_id_id_idx` (`parent_id`, `id`),
  ADD CONSTRAINT `trip_post_comments_parent_id_fkey`
    FOREIGN KEY (`parent_id`) REFERENCES `trip_post_comments` (`id`)
    ON DELETE CASCADE ON UPDATE NO ACTION;
