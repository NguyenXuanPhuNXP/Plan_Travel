UPDATE `users` SET `notify_by_email` = true WHERE `notify_by_email` = false;
ALTER TABLE `users` ALTER COLUMN `notify_by_email` SET DEFAULT true;
