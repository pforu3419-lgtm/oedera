ALTER TABLE `users`
  ADD COLUMN `passwordHash` varchar(255) NULL,
  ADD COLUMN `passwordSalt` varchar(255) NULL;
