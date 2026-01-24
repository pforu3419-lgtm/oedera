CREATE TABLE `discounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`type` enum('percentage','fixed_amount','product_specific','bill_total') NOT NULL,
	`value` decimal(10,2) NOT NULL,
	`productId` varchar(50),
	`minBillAmount` decimal(12,2),
	`maxDiscountAmount` decimal(12,2),
	`startDate` datetime,
	`endDate` datetime,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discounts_id` PRIMARY KEY(`id`)
);
