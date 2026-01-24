CREATE TABLE `loyaltySettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pointsPerBaht` decimal(5,2) DEFAULT '1',
	`pointValue` decimal(10,2) DEFAULT '1',
	`pointExpirationDays` int,
	`minPointsToRedeem` int DEFAULT 100,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loyaltySettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyaltyTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`transactionId` int,
	`type` enum('earn','redeem','expire','admin_adjust') NOT NULL,
	`points` int NOT NULL,
	`balanceBefore` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyaltyTransactions_id` PRIMARY KEY(`id`)
);
