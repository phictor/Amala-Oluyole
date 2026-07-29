CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`address` text NOT NULL,
	`city` varchar(64) NOT NULL,
	`state` varchar(64) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`latitude` float,
	`longitude` float,
	`openingTime` varchar(8) NOT NULL DEFAULT '08:00',
	`closingTime` varchar(8) NOT NULL DEFAULT '22:00',
	`isActive` boolean NOT NULL DEFAULT true,
	`acceptsDelivery` boolean NOT NULL DEFAULT true,
	`acceptsPickup` boolean NOT NULL DEFAULT true,
	`acceptsReservations` boolean NOT NULL DEFAULT true,
	`deliveryRadiusKm` float DEFAULT 10,
	`deliveryFeeBase` decimal(10,2) DEFAULT '500.00',
	`minOrderAmount` decimal(10,2) DEFAULT '1500.00',
	`imageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `catering_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`branchId` int NOT NULL,
	`contactName` varchar(128) NOT NULL,
	`contactPhone` varchar(20) NOT NULL,
	`contactEmail` varchar(320),
	`eventType` varchar(64) NOT NULL,
	`eventDate` timestamp NOT NULL,
	`guestCount` int NOT NULL,
	`venue` text NOT NULL,
	`mealPreferences` text,
	`budget` decimal(12,2),
	`additionalRequirements` text,
	`status` enum('pending','reviewing','quoted','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
	`quotedAmount` decimal(12,2),
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catering_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(32) NOT NULL DEFAULT 'Home',
	`fullAddress` text NOT NULL,
	`landmark` text,
	`latitude` float,
	`longitude` float,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favourites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mealId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favourites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`points` int NOT NULL DEFAULT 0,
	`tier` enum('bronze','silver','gold','platinum') NOT NULL DEFAULT 'bronze',
	`totalPointsEarned` int NOT NULL DEFAULT 0,
	`totalPointsRedeemed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loyalty_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `loyalty_accounts_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`type` enum('earned','redeemed','bonus','expired','adjusted') NOT NULL,
	`points` int NOT NULL,
	`description` text,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyalty_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_branch_availability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mealId` int NOT NULL,
	`branchId` int NOT NULL,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`stockCount` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meal_branch_availability_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`emoji` varchar(8),
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`imageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meal_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `meal_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `meals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`imageUrl` text,
	`preparationTime` int NOT NULL DEFAULT 15,
	`calories` int,
	`rating` float DEFAULT 4.5,
	`ratingCount` int NOT NULL DEFAULT 0,
	`labels` json DEFAULT ('[]'),
	`isAvailable` boolean NOT NULL DEFAULT true,
	`isPopular` boolean NOT NULL DEFAULT false,
	`isBestSeller` boolean NOT NULL DEFAULT false,
	`isChefSpecial` boolean NOT NULL DEFAULT false,
	`isSpicy` boolean NOT NULL DEFAULT false,
	`allergens` json DEFAULT ('[]'),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`type` enum('order_update','promotion','loyalty','reservation','general') NOT NULL,
	`title` varchar(128) NOT NULL,
	`body` text NOT NULL,
	`data` json DEFAULT ('{}'),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`mealId` int,
	`isCustomMeal` boolean NOT NULL DEFAULT false,
	`customMealConfig` json,
	`name` varchar(128) NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`subtotal` decimal(10,2) NOT NULL,
	`specialInstructions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`status` varchar(32) NOT NULL,
	`note` text,
	`changedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(20) NOT NULL,
	`userId` int NOT NULL,
	`branchId` int NOT NULL,
	`riderId` int,
	`orderType` enum('delivery','pickup') NOT NULL,
	`status` enum('created','awaiting_payment','payment_confirmed','accepted','preparing','ready','rider_assigned','out_for_delivery','delivered','completed','cancelled','rejected','refunded') NOT NULL DEFAULT 'created',
	`paymentMethod` enum('card','transfer','cash_on_delivery','wallet','loyalty_points') NOT NULL,
	`paymentStatus` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`paymentReference` varchar(128),
	`subtotal` decimal(10,2) NOT NULL,
	`deliveryFee` decimal(10,2) NOT NULL DEFAULT '0.00',
	`discount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`loyaltyPointsUsed` int NOT NULL DEFAULT 0,
	`total` decimal(10,2) NOT NULL,
	`promoCode` varchar(32),
	`deliveryAddress` text,
	`deliveryLatitude` float,
	`deliveryLongitude` float,
	`deliveryInstructions` text,
	`estimatedDeliveryTime` int,
	`actualDeliveryTime` timestamp,
	`customerNotes` text,
	`rejectionReason` text,
	`cancellationReason` text,
	`rating` int,
	`review` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `promo_code_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promoCodeId` int NOT NULL,
	`userId` int NOT NULL,
	`orderId` int NOT NULL,
	`discountApplied` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promo_code_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promo_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`description` text,
	`type` enum('percentage','fixed','free_delivery','bogo') NOT NULL,
	`value` decimal(10,2) NOT NULL,
	`minOrderAmount` decimal(10,2) DEFAULT '0.00',
	`maxDiscount` decimal(10,2),
	`usageLimit` int,
	`usageCount` int NOT NULL DEFAULT 0,
	`perUserLimit` int NOT NULL DEFAULT 1,
	`applicableBranchIds` json DEFAULT ('[]'),
	`isActive` boolean NOT NULL DEFAULT true,
	`startsAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promo_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `promo_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `push_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` text NOT NULL,
	`platform` enum('ios','android','web') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `push_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`branchId` int NOT NULL,
	`guestName` varchar(128) NOT NULL,
	`guestPhone` varchar(20) NOT NULL,
	`guestEmail` varchar(320),
	`partySize` int NOT NULL,
	`reservationDate` timestamp NOT NULL,
	`occasion` varchar(64),
	`specialRequests` text,
	`status` enum('pending','confirmed','cancelled','completed','no_show') NOT NULL DEFAULT 'pending',
	`tableNumber` varchar(16),
	`confirmationNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rider_location_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`riderId` int NOT NULL,
	`orderId` int,
	`latitude` float NOT NULL,
	`longitude` float NOT NULL,
	`speed` float,
	`heading` float,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rider_location_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `riders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`branchId` int NOT NULL,
	`vehicleType` enum('motorcycle','bicycle','car') NOT NULL DEFAULT 'motorcycle',
	`vehiclePlate` varchar(16),
	`isOnline` boolean NOT NULL DEFAULT false,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`currentLatitude` float,
	`currentLongitude` float,
	`lastLocationUpdate` timestamp,
	`totalDeliveries` int NOT NULL DEFAULT 0,
	`rating` float DEFAULT 5,
	`ratingCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `riders_id` PRIMARY KEY(`id`),
	CONSTRAINT `riders_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`ticketNumber` varchar(20) NOT NULL,
	`category` enum('order_issue','payment','delivery','food_quality','app_bug','general') NOT NULL,
	`subject` varchar(256) NOT NULL,
	`message` text NOT NULL,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`resolution` text,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_tickets_ticketNumber_unique` UNIQUE(`ticketNumber`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('customer','admin','rider','kitchen','manager') NOT NULL DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `isGuest` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `pushToken` text;--> statement-breakpoint
ALTER TABLE `users` ADD `preferredBranchId` int;