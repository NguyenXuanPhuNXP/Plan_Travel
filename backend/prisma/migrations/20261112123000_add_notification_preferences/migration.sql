ALTER TABLE `users`
  ADD COLUMN `notify_in_app` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notify_by_email` BOOLEAN NOT NULL DEFAULT true;
