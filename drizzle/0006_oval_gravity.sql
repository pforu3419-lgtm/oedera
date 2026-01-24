CREATE TABLE `receiptTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`headerText` text,
	`footerText` text,
	`showCompanyName` boolean DEFAULT true,
	`showDate` boolean DEFAULT true,
	`showTime` boolean DEFAULT true,
	`showCashier` boolean DEFAULT true,
	`showTransactionId` boolean DEFAULT true,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `receiptTemplates_id` PRIMARY KEY(`id`)
);
