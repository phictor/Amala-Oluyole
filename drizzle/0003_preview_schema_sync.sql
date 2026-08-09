CREATE TABLE `inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`category` enum('swallow','soup','protein','spice','vegetable','drink','packaging','other') NOT NULL DEFAULT 'other',
	`unit` varchar(32) NOT NULL DEFAULT 'kg',
	`currentStock` decimal(10,2) NOT NULL DEFAULT '0.00',
	`minimumStock` decimal(10,2) NOT NULL DEFAULT '0.00',
	`costPerUnit` decimal(10,2) NOT NULL DEFAULT '0.00',
	`supplier` varchar(128),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastRestockedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryId` int NOT NULL,
	`branchId` int NOT NULL,
	`type` enum('restock','usage','waste','adjustment') NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`note` text,
	`recordedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `pickupCode` varchar(6);
