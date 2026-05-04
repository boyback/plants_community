/*
 Navicat Premium Data Transfer

 Source Server         : localhost_3306
 Source Server Type    : MySQL
 Source Server Version : 80027 (8.0.27)
 Source Host           : localhost:3306
 Source Schema         : plants_community

 Target Server Type    : MySQL
 Target Server Version : 80027 (8.0.27)
 File Encoding         : 65001

 Date: 05/05/2026 02:49:44
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for badges
-- ----------------------------
DROP TABLE IF EXISTS `badges`;
CREATE TABLE `badges` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderIdx` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `badges_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of badges
-- ----------------------------
BEGIN;
INSERT INTO `badges` (`id`, `slug`, `name`, `icon`, `description`, `orderIdx`) VALUES ('cmojwbr4d0000zc8wbmeugvnm', 'b1', '新苗', '🌱', '加入社区', 0);
INSERT INTO `badges` (`id`, `slug`, `name`, `icon`, `description`, `orderIdx`) VALUES ('cmojwbr4m0001zc8wuv32v5qe', 'b2', '达人', '🌿', '发布 10 篇帖子', 0);
INSERT INTO `badges` (`id`, `slug`, `name`, `icon`, `description`, `orderIdx`) VALUES ('cmojwbr4o0002zc8wpt7jvkmk', 'b3', '园艺师', '🪴', '发布 100 篇帖子', 0);
INSERT INTO `badges` (`id`, `slug`, `name`, `icon`, `description`, `orderIdx`) VALUES ('cmojwbr4p0003zc8wtkxqysde', 'b4', '摄影家', '📷', '累计上传 50 张图', 0);
INSERT INTO `badges` (`id`, `slug`, `name`, `icon`, `description`, `orderIdx`) VALUES ('cmojwbr4q0004zc8wn6p2v6wy', 'b5', '小太阳', '☀️', '连续签到 30 天', 0);
INSERT INTO `badges` (`id`, `slug`, `name`, `icon`, `description`, `orderIdx`) VALUES ('cmojwbr4r0005zc8w8qui0zg8', 'b6', '夜行者', '🌙', '凌晨发帖 x 10', 0);
INSERT INTO `badges` (`id`, `slug`, `name`, `icon`, `description`, `orderIdx`) VALUES ('cmojwbr4s0006zc8w2hjnbvbb', 'b7', '评论家', '💬', '发表 200 条评论', 0);
INSERT INTO `badges` (`id`, `slug`, `name`, `icon`, `description`, `orderIdx`) VALUES ('cmojwbr4t0007zc8wmtauamvv', 'b8', '收藏家', '⭐', '收藏 100 个帖子', 0);
INSERT INTO `badges` (`id`, `slug`, `name`, `icon`, `description`, `orderIdx`) VALUES ('cmojwbr4v0008zc8weuaqsyem', 'b9', '老司机', '🚜', '注册满 1 年', 0);
INSERT INTO `badges` (`id`, `slug`, `name`, `icon`, `description`, `orderIdx`) VALUES ('cmojwbr4w0009zc8wspptkxbj', 'b10', '花仙子', '🌸', '开花帖 x 20', 0);
INSERT INTO `badges` (`id`, `slug`, `name`, `icon`, `description`, `orderIdx`) VALUES ('cmojwbr4x000azc8wruzr66ef', 'b11', 'EVENT 先锋', '🎉', '参与 5 次活动', 0);
INSERT INTO `badges` (`id`, `slug`, `name`, `icon`, `description`, `orderIdx`) VALUES ('cmojwbr4y000bzc8wd9x37d2s', 'b12', '投票王', '🗳️', '发起 10 次投票', 0);
COMMIT;

-- ----------------------------
-- Table structure for banners
-- ----------------------------
DROP TABLE IF EXISTS `banners`;
CREATE TABLE `banners` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subtitle` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `image` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `link` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tint` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderIdx` int NOT NULL DEFAULT '0',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of banners
-- ----------------------------
BEGIN;
INSERT INTO `banners` (`id`, `title`, `subtitle`, `image`, `link`, `tint`, `orderIdx`, `enabled`) VALUES ('cmojwbr9q0010zc8who06vi7q', '夏日度夏季开启', '老玩家和新人一起,安全渡过炎炎夏日', 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1600', '/board/jingtian', 'from-leaf-700/70', 0, 1);
INSERT INTO `banners` (`id`, `title`, `subtitle`, `image`, `link`, `tint`, `orderIdx`, `enabled`) VALUES ('cmojwbr9q0011zc8wl30fzesn', '第三届·多肉图鉴大赛', '上传你珍藏的多肉照片,赢取精美肉盆', 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1600', '/plants', 'from-leaf-900/70', 1, 1);
INSERT INTO `banners` (`id`, `title`, `subtitle`, `image`, `link`, `tint`, `orderIdx`, `enabled`) VALUES ('cmojwbr9r0012zc8wx9actnmf', '北京线下茶话会', '8 月 20 日 · 带上你的肉肉一起来玩', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1600', '/', 'from-sand-300/60', 2, 1);
COMMIT;

-- ----------------------------
-- Table structure for boards
-- ----------------------------
DROP TABLE IF EXISTS `boards`;
CREATE TABLE `boards` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `cover` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `members` int NOT NULL DEFAULT '0',
  `orderIdx` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `boards_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of boards
-- ----------------------------
BEGIN;
INSERT INTO `boards` (`id`, `slug`, `name`, `description`, `cover`, `icon`, `members`, `orderIdx`) VALUES ('cmojwbr9c000kzc8w37ggs309', 'jingtian', '景天科', '拟石莲、长生草、景天、风车等景天科大家族', 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=800', '🌿', 12843, 0);
INSERT INTO `boards` (`id`, `slug`, `name`, `description`, `cover`, `icon`, `members`, `orderIdx`) VALUES ('cmojwbr9d000lzc8wpfwq2rsm', 'fanxing', '番杏科', '生石花、肉锥、碧光环,番杏圈集结地', 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800', '🪨', 6421, 1);
INSERT INTO `boards` (`id`, `slug`, `name`, `description`, `cover`, `icon`, `members`, `orderIdx`) VALUES ('cmojwbr9e000mzc8w1bm6qol2', 'baihe', '百合科', '十二卷、玉露、寿、软叶鲨鱼', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800', '💎', 8932, 2);
INSERT INTO `boards` (`id`, `slug`, `name`, `description`, `cover`, `icon`, `members`, `orderIdx`) VALUES ('cmojwbr9e000nzc8wxi3bk2nd', 'xianrenzhang', '仙人掌科', '球、柱、瑞凤玉、牡丹、乌羽玉', 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=800', '🌵', 7812, 3);
INSERT INTO `boards` (`id`, `slug`, `name`, `description`, `cover`, `icon`, `members`, `orderIdx`) VALUES ('cmojwbr9f000ozc8wbfh7k8o4', 'dajike', '大戟科', '麒麟、铁甲丸、布纹球', 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=800', '🗿', 3421, 4);
INSERT INTO `boards` (`id`, `slug`, `name`, `description`, `cover`, `icon`, `members`, `orderIdx`) VALUES ('cmojwbr9g000pzc8wv3yqiguw', 'yangzhi', '养殖交流', '浇水、配土、光照,经验分享和求助', 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800', '💧', 21034, 5);
INSERT INTO `boards` (`id`, `slug`, `name`, `description`, `cover`, `icon`, `members`, `orderIdx`) VALUES ('cmojwbr9g000qzc8w79w118gs', 'jiaoyi', '交易市场', '出肉、收肉、拼团,请文明交易', 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800', '💰', 15623, 6);
INSERT INTO `boards` (`id`, `slug`, `name`, `description`, `cover`, `icon`, `members`, `orderIdx`) VALUES ('cmojwbr9h000rzc8w3smylxdn', 'xinshou', '新手村', '萌新报道、小白问答,老手带带新人', 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=800', '🌱', 32145, 7);
COMMIT;

-- ----------------------------
-- Table structure for comments
-- ----------------------------
DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `postId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `authorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `likes` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `comments_postId_createdAt_idx` (`postId`,`createdAt`),
  KEY `comments_authorId_fkey` (`authorId`),
  KEY `comments_parentId_fkey` (`parentId`),
  CONSTRAINT `comments_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `comments_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `comments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `comments_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of comments
-- ----------------------------
BEGIN;
INSERT INTO `comments` (`id`, `postId`, `authorId`, `parentId`, `content`, `likes`, `createdAt`) VALUES ('cmojwbr9u0016zc8whwl6r4kp', 'cmojwbr9t0014zc8w591mkogj', 'cmojwbr79000dzc8w2nnm2ehu', NULL, '太有用啦!我南方的肉肉今年全军覆没 😭', 18, '2026-04-28 22:12:19.794');
INSERT INTO `comments` (`id`, `postId`, `authorId`, `parentId`, `content`, `likes`, `createdAt`) VALUES ('cmojwbr9v0018zc8wa29y200v', 'cmojwbr9t0014zc8w591mkogj', 'cmojwbr7d000ezc8wffqzsjxl', NULL, '通风确实是王道,我仙人球也是一样。', 9, '2026-04-29 00:36:19.795');
INSERT INTO `comments` (`id`, `postId`, `authorId`, `parentId`, `content`, `likes`, `createdAt`) VALUES ('cmojwbr9v001azc8wo3vww9mn', 'cmojwbr9t0014zc8w591mkogj', 'cmojwbr7e000fzc8wui4gzz7f', NULL, '请问代森锰锌和多菌灵哪个更好?', 3, '2026-04-29 03:00:19.795');
INSERT INTO `comments` (`id`, `postId`, `authorId`, `parentId`, `content`, `likes`, `createdAt`) VALUES ('cmojwbr9w001czc8wghw23dk5', 'cmojwbr9t0014zc8w591mkogj', 'cmojwbr7f000gzc8w31udsnet', NULL, '学到了,明年试试。', 5, '2026-04-29 04:12:19.795');
INSERT INTO `comments` (`id`, `postId`, `authorId`, `parentId`, `content`, `likes`, `createdAt`) VALUES ('cmojwbr9z001ozc8wq3xe3cht', 'cmojwbr9x001gzc8wa56catyx', 'cmojwbr7e000fzc8wui4gzz7f', NULL, '我选胧月,便宜好养!', 12, '2026-04-27 10:12:19.799');
INSERT INTO `comments` (`id`, `postId`, `authorId`, `parentId`, `content`, `likes`, `createdAt`) VALUES ('cmojwbr9z001qzc8whegl1cpb', 'cmojwbr9x001gzc8wa56catyx', 'cmojwbr7d000ezc8wffqzsjxl', NULL, '生石花的选项笑死了 🤣', 25, '2026-04-27 15:00:19.799');
INSERT INTO `comments` (`id`, `postId`, `authorId`, `parentId`, `content`, `likes`, `createdAt`) VALUES ('cmojwbra0001uzc8w58iq9g4m', 'cmojwbra0001szc8wjb3jj65c', 'cmojwbr74000czc8wxsx0umvo', NULL, '老王出品,必属精品 👍', 20, '2026-04-26 10:12:19.800');
INSERT INTO `comments` (`id`, `postId`, `authorId`, `parentId`, `content`, `likes`, `createdAt`) VALUES ('cmojwbra1001wzc8wjqkomxmw', 'cmojwbra0001szc8wjb3jj65c', 'cmojwbr7j000jzc8w78xnmxr9', NULL, '请问稻壳炭去哪里买啊?', 5, '2026-04-26 15:00:19.801');
INSERT INTO `comments` (`id`, `postId`, `authorId`, `parentId`, `content`, `likes`, `createdAt`) VALUES ('cmojwbra20021zc8w2bgo1zod', 'cmojwbra2001yzc8wffhcbh61', 'cmojwbr79000dzc8w2nnm2ehu', NULL, '报名 +1,带两棵玉露过去!', 8, '2026-04-25 10:12:19.802');
INSERT INTO `comments` (`id`, `postId`, `authorId`, `parentId`, `content`, `likes`, `createdAt`) VALUES ('cmojwbra30023zc8wni6emu5z', 'cmojwbra2001yzc8wffhcbh61', 'cmojwbr7f000gzc8w31udsnet', NULL, '北京肉友集结啦 🥳', 5, '2026-04-25 12:36:19.803');
INSERT INTO `comments` (`id`, `postId`, `authorId`, `parentId`, `content`, `likes`, `createdAt`) VALUES ('cmojwcty80001zcn7gouytmgy', 'cmojwbr9t0014zc8w591mkogj', 'cmojwbr74000czc8wxsx0umvo', NULL, '这条来自自动化测试的评论 🌵', 0, '2026-04-29 10:13:09.920');
COMMIT;

-- ----------------------------
-- Table structure for drafts
-- ----------------------------
DROP TABLE IF EXISTS `drafts`;
CREATE TABLE `drafts` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('rich','short','vote','video','event') COLLATE utf8mb4_unicode_ci NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `drafts_userId_updatedAt_idx` (`userId`,`updatedAt`),
  CONSTRAINT `drafts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of drafts
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for event_attendees
-- ----------------------------
DROP TABLE IF EXISTS `event_attendees`;
CREATE TABLE `event_attendees` (
  `eventId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`eventId`,`userId`),
  KEY `event_attendees_userId_fkey` (`userId`),
  CONSTRAINT `event_attendees_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `event_attendees_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of event_attendees
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for events
-- ----------------------------
DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `postId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `startAt` datetime(3) NOT NULL,
  `endAt` datetime(3) NOT NULL,
  `location` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `events_postId_key` (`postId`),
  CONSTRAINT `events_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of events
-- ----------------------------
BEGIN;
INSERT INTO `events` (`id`, `postId`, `startAt`, `endAt`, `location`) VALUES ('cmojwbra2001zzc8w7vdsi9uq', 'cmojwbra2001yzc8wffhcbh61', '2026-05-19 10:12:19.801', '2026-05-19 10:12:19.801', '北京市朝阳区某咖啡馆');
COMMIT;

-- ----------------------------
-- Table structure for follows
-- ----------------------------
DROP TABLE IF EXISTS `follows`;
CREATE TABLE `follows` (
  `followerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `followeeId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`followerId`,`followeeId`),
  KEY `follows_followeeId_idx` (`followeeId`),
  CONSTRAINT `follows_followeeId_fkey` FOREIGN KEY (`followeeId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `follows_followerId_fkey` FOREIGN KEY (`followerId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of follows
-- ----------------------------
BEGIN;
INSERT INTO `follows` (`followerId`, `followeeId`, `createdAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr79000dzc8w2nnm2ehu', '2026-04-29 10:12:19.836');
INSERT INTO `follows` (`followerId`, `followeeId`, `createdAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr7d000ezc8wffqzsjxl', '2026-04-29 10:12:19.837');
INSERT INTO `follows` (`followerId`, `followeeId`, `createdAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr74000czc8wxsx0umvo', '2026-04-29 10:12:19.837');
INSERT INTO `follows` (`followerId`, `followeeId`, `createdAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr74000czc8wxsx0umvo', '2026-04-29 10:12:19.838');
INSERT INTO `follows` (`followerId`, `followeeId`, `createdAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr74000czc8wxsx0umvo', '2026-04-29 10:12:19.838');
INSERT INTO `follows` (`followerId`, `followeeId`, `createdAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbr74000czc8wxsx0umvo', '2026-04-29 10:12:19.839');
INSERT INTO `follows` (`followerId`, `followeeId`, `createdAt`) VALUES ('cmojwd64h0004zcn7gwxa7jwp', 'cmojwbr74000czc8wxsx0umvo', '2026-04-29 10:13:48.623');
COMMIT;

-- ----------------------------
-- Table structure for messages
-- ----------------------------
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fromId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `toId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `readAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `messages_fromId_toId_createdAt_idx` (`fromId`,`toId`,`createdAt`),
  KEY `messages_toId_fromId_createdAt_idx` (`toId`,`fromId`,`createdAt`),
  CONSTRAINT `messages_fromId_fkey` FOREIGN KEY (`fromId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `messages_toId_fkey` FOREIGN KEY (`toId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of messages
-- ----------------------------
BEGIN;
INSERT INTO `messages` (`id`, `fromId`, `toId`, `text`, `readAt`, `createdAt`) VALUES ('cmojwbray002uzc8w4rf6bl54', 'cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr74000czc8wxsx0umvo', '你好!请问你那边还有多头胧月吗?', '2026-04-29 16:27:26.867', '2026-04-29 09:12:19.833');
INSERT INTO `messages` (`id`, `fromId`, `toId`, `text`, `readAt`, `createdAt`) VALUES ('cmojwbray002vzc8wtrkrbhly', 'cmojwbr74000czc8wxsx0umvo', 'cmojwbr79000dzc8w2nnm2ehu', '有的,还剩 3 棵。', '2026-04-29 09:22:19.833', '2026-04-29 09:17:19.833');
INSERT INTO `messages` (`id`, `fromId`, `toId`, `text`, `readAt`, `createdAt`) VALUES ('cmojwbray002wzc8w9ownwnew', 'cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr74000czc8wxsx0umvo', '那能包邮到上海吗?', '2026-04-29 16:27:26.867', '2026-04-29 09:52:19.833');
INSERT INTO `messages` (`id`, `fromId`, `toId`, `text`, `readAt`, `createdAt`) VALUES ('cmojwbray002xzc8w2ib5h781', 'cmojwbr74000czc8wxsx0umvo', 'cmojwbr79000dzc8w2nnm2ehu', '包邮可以,80 一棵,三棵优惠到 220。', '2026-04-29 09:58:19.833', '2026-04-29 09:57:19.833');
INSERT INTO `messages` (`id`, `fromId`, `toId`, `text`, `readAt`, `createdAt`) VALUES ('cmojwbray002yzc8wkz2kw04f', 'cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr74000czc8wxsx0umvo', '成交!', '2026-04-29 16:27:26.867', '2026-04-29 10:02:19.833');
INSERT INTO `messages` (`id`, `fromId`, `toId`, `text`, `readAt`, `createdAt`) VALUES ('cmojwbray002zzc8w1cwze4l8', 'cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr74000czc8wxsx0umvo', '好的,那我明天发你。', '2026-04-29 16:27:26.867', '2026-04-29 10:07:19.833');
INSERT INTO `messages` (`id`, `fromId`, `toId`, `text`, `readAt`, `createdAt`) VALUES ('cmojwbray0030zc8wvlk52xku', 'cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr74000czc8wxsx0umvo', '王哥,请教一下仙人球配土?', '2026-04-29 08:14:19.834', '2026-04-29 08:12:19.834');
INSERT INTO `messages` (`id`, `fromId`, `toId`, `text`, `readAt`, `createdAt`) VALUES ('cmojwbray0031zc8wyy1c9czk', 'cmojwbr74000czc8wxsx0umvo', 'cmojwbr7d000ezc8wffqzsjxl', '配土比例我一会发你。', '2026-04-29 09:14:19.834', '2026-04-29 09:12:19.834');
INSERT INTO `messages` (`id`, `fromId`, `toId`, `text`, `readAt`, `createdAt`) VALUES ('cmojwbraz0032zc8wgjm97y3f', 'cmojwbr7f000gzc8w31udsnet', 'cmojwbr74000czc8wxsx0umvo', '在吗?', '2026-04-29 16:27:35.905', '2026-04-29 06:52:19.835');
INSERT INTO `messages` (`id`, `fromId`, `toId`, `text`, `readAt`, `createdAt`) VALUES ('cmojwbraz0033zc8wg56jvquy', 'cmojwbr7f000gzc8w31udsnet', 'cmojwbr74000czc8wxsx0umvo', '周末一起去花市呗?', '2026-04-29 16:27:35.905', '2026-04-29 07:12:19.835');
INSERT INTO `messages` (`id`, `fromId`, `toId`, `text`, `readAt`, `createdAt`) VALUES ('cmojwbraz0034zc8wqrpt1vtn', 'cmojwbr7i000izc8wm5o9i3l7', 'cmojwbr74000czc8wxsx0umvo', '你那篇度夏帖子太有用了,已收藏!', '2026-04-28 14:13:19.835', '2026-04-28 14:12:19.835');
INSERT INTO `messages` (`id`, `fromId`, `toId`, `text`, `readAt`, `createdAt`) VALUES ('cmojwdnvs000hzcn77kxtvwfk', 'cmojwd64h0004zcn7gwxa7jwp', 'cmojwbr74000czc8wxsx0umvo', '你好阿绿,来自自动化测试 🌵', '2026-04-29 16:27:17.138', '2026-04-29 10:13:48.713');
COMMIT;

-- ----------------------------
-- Table structure for notifications
-- ----------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipientId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fromId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('like','comment','follow','mention','system') COLLATE utf8mb4_unicode_ci NOT NULL,
  `text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `link` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `read` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `notifications_recipientId_createdAt_idx` (`recipientId`,`createdAt`),
  KEY `notifications_fromId_fkey` (`fromId`),
  CONSTRAINT `notifications_fromId_fkey` FOREIGN KEY (`fromId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `notifications_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of notifications
-- ----------------------------
BEGIN;
INSERT INTO `notifications` (`id`, `recipientId`, `fromId`, `type`, `text`, `link`, `read`, `createdAt`) VALUES ('cmojwbrax002nzc8wcm0r6ubv', 'cmojwbr74000czc8wxsx0umvo', 'cmojwbr79000dzc8w2nnm2ehu', 'like', '赞了你的帖子《夏天来了,我的景天们终于度夏成功!》', '/post/cmojwbr9t0014zc8w591mkogj', 1, '2026-04-29 08:12:19.832');
INSERT INTO `notifications` (`id`, `recipientId`, `fromId`, `type`, `text`, `link`, `read`, `createdAt`) VALUES ('cmojwbrax002ozc8w029pmvaa', 'cmojwbr74000czc8wxsx0umvo', 'cmojwbr7d000ezc8wffqzsjxl', 'comment', '评论了你:「通风确实是王道,我仙人球也是一样。」', '/post/cmojwbr9t0014zc8w591mkogj', 1, '2026-04-29 05:12:19.832');
INSERT INTO `notifications` (`id`, `recipientId`, `fromId`, `type`, `text`, `link`, `read`, `createdAt`) VALUES ('cmojwbrax002pzc8w8kwygm9k', 'cmojwbr74000czc8wxsx0umvo', 'cmojwbr7e000fzc8wui4gzz7f', 'follow', '关注了你', '/user/cmojwbr7e000fzc8wui4gzz7f', 1, '2026-04-29 00:12:19.832');
INSERT INTO `notifications` (`id`, `recipientId`, `fromId`, `type`, `text`, `link`, `read`, `createdAt`) VALUES ('cmojwbrax002qzc8w2iahonp8', 'cmojwbr74000czc8wxsx0umvo', 'cmojwbr7f000gzc8w31udsnet', 'mention', '在《今日份的阳台》中提到了你', NULL, 1, '2026-04-28 10:12:19.832');
INSERT INTO `notifications` (`id`, `recipientId`, `fromId`, `type`, `text`, `link`, `read`, `createdAt`) VALUES ('cmojwbrax002rzc8w4ypce67i', 'cmojwbr74000czc8wxsx0umvo', NULL, 'system', '恭喜!你获得了新徽章「小太阳」—— 连续签到 30 天', '/user/cmojwbr74000czc8wxsx0umvo', 1, '2026-04-27 10:12:19.832');
INSERT INTO `notifications` (`id`, `recipientId`, `fromId`, `type`, `text`, `link`, `read`, `createdAt`) VALUES ('cmojwbrax002szc8wdhswlev2', 'cmojwbr74000czc8wxsx0umvo', 'cmojwbr7f000gzc8w31udsnet', 'like', '赞了你的帖子《玉露叶片扦插的完整记录》', NULL, 1, '2026-04-26 22:12:19.832');
INSERT INTO `notifications` (`id`, `recipientId`, `fromId`, `type`, `text`, `link`, `read`, `createdAt`) VALUES ('cmojwbrax002tzc8w9xmzpp0m', 'cmojwbr74000czc8wxsx0umvo', NULL, 'system', '你发起的投票「新手入坑多肉」已截止,点击查看最终结果', '/post/cmojwbr9x001gzc8wa56catyx', 1, '2026-04-26 10:12:19.832');
INSERT INTO `notifications` (`id`, `recipientId`, `fromId`, `type`, `text`, `link`, `read`, `createdAt`) VALUES ('cmojwdntr000fzcn71axzmkpv', 'cmojwbr74000czc8wxsx0umvo', 'cmojwd64h0004zcn7gwxa7jwp', 'follow', '关注了你', '/user/cmojwd64h0004zcn7gwxa7jwp', 1, '2026-04-29 10:13:48.639');
COMMIT;

-- ----------------------------
-- Table structure for plants
-- ----------------------------
DROP TABLE IF EXISTS `plants`;
CREATE TABLE `plants` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `latinName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `family` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cover` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `difficulty` int NOT NULL DEFAULT '1',
  `light` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `watering` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hardiness` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tips` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `gallery` text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plants_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of plants
-- ----------------------------
BEGIN;
INSERT INTO `plants` (`id`, `slug`, `name`, `latinName`, `family`, `cover`, `difficulty`, `light`, `watering`, `hardiness`, `description`, `tips`, `gallery`) VALUES ('cmojwbr9i000szc8wu23q010k', 'longyue', '胧月', 'Graptopetalum paraguayense', '景天科 · 风车草属', 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000', 1, '全日照', '见干见湿,一周一次', '-5°C', '胧月是入门级多肉的代表,非常皮实,耐旱耐寒,上色后叶片呈粉紫色,出状态极美。适合新手入坑。', '[\"多晒少水,才能出状态\",\"夏季适度遮阳,避免正午暴晒\",\"叶插成功率极高,非常适合练手\",\"耐寒能力强,北方室内越冬没问题\"]', '[\"https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000\",\"https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1000\",\"https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000\"]');
INSERT INTO `plants` (`id`, `slug`, `name`, `latinName`, `family`, `cover`, `difficulty`, `light`, `watering`, `hardiness`, `description`, `tips`, `gallery`) VALUES ('cmojwbr9j000tzc8w6j1tx6g2', 'yulu', '玉露', 'Haworthia cooperi', '百合科 · 十二卷属', 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000', 3, '散射光', '表土干透再浇', '0°C', '玉露叶片剔透如水晶,顶部有透明「窗」,能让阳光穿透进行光合作用。喜散射光,忌烈日。', '[\"强光下叶片会变得不透明,失去水晶感\",\"夏天高温会休眠,减少浇水\",\"根系脆弱,建议透气配土\",\"繁殖多靠分株,叶插偶有成功\"]', '[\"https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000\",\"https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000\"]');
INSERT INTO `plants` (`id`, `slug`, `name`, `latinName`, `family`, `cover`, `difficulty`, `light`, `watering`, `hardiness`, `description`, `tips`, `gallery`) VALUES ('cmojwbr9k000uzc8whssjr5w2', 'shengshihua', '生石花', 'Lithops', '番杏科 · 生石花属', 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=1000', 5, '充足光照', '严格控水,夏季几乎断水', '5°C', '生石花外形酷似石头,是多肉里最具话题性的品种之一。一年一蜕皮,老壳被新叶吸收。对水敏感,被誉为「劝退专用」。', '[\"夏季高温休眠,必须断水避免黑腐\",\"蜕皮期间不要浇水,让其吸收老壳\",\"秋天是生长旺季,可适当水肥\",\"烈日下要遮阳,防止晒伤\"]', '[\"https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=1000\"]');
INSERT INTO `plants` (`id`, `slug`, `name`, `latinName`, `family`, `cover`, `difficulty`, `light`, `watering`, `hardiness`, `description`, `tips`, `gallery`) VALUES ('cmojwbr9l000vzc8ws0tuflqy', 'hongzhiyu', '虹之玉', 'Sedum rubrotinctum', '景天科 · 景天属', 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000', 1, '全日照', '耐旱,干透浇透', '-3°C', '虹之玉小巧可爱,叶片糖果色,低温 + 强光下会转为橙红色,非常讨喜。新手友好型。', '[\"温差越大,颜色越好看\",\"秋冬是最佳观赏期\",\"叶插成功率极高\",\"夏季闷热可能徒长,注意通风\"]', '[\"https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000\"]');
INSERT INTO `plants` (`id`, `slug`, `name`, `latinName`, `family`, `cover`, `difficulty`, `light`, `watering`, `hardiness`, `description`, `tips`, `gallery`) VALUES ('cmojwbr9m000wzc8w6dtsbzm8', 'jiwawa', '吉娃娃', 'Echeveria chihuahuaensis', '景天科 · 拟石莲属', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1000', 3, '全日照', '控水,避免叶心积水', '-2°C', '吉娃娃叶片肥厚,叶尖粉红,出状态时像一朵盛开的莲花。是拟石莲属中的经典品种。', '[\"浇水时避开叶心,否则易黑腐\",\"夏季适度遮阳并保持通风\",\"冬季强日照有助上色\",\"换盆可刺激新根生长\"]', '[\"https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1000\"]');
INSERT INTO `plants` (`id`, `slug`, `name`, `latinName`, `family`, `cover`, `difficulty`, `light`, `watering`, `hardiness`, `description`, `tips`, `gallery`) VALUES ('cmojwbr9n000xzc8wbvrp6gi7', 'aierfeide', '艾伦费尔德', 'Turbinicarpus schmiedickeanus', '仙人掌科 · 陀螺球属', 'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=1000', 4, '全日照', '严格控水', '0°C', '陀螺球属的小型种,球体带钩刺,花开如烟火。生长缓慢,对水极度敏感,资深玩家最爱。', '[\"严格颗粒土,否则易烂根\",\"花期通常在春季\",\"勿用深盆,浅盆更佳\",\"冬季完全断水休眠\"]', '[\"https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=1000\"]');
INSERT INTO `plants` (`id`, `slug`, `name`, `latinName`, `family`, `cover`, `difficulty`, `light`, `watering`, `hardiness`, `description`, `tips`, `gallery`) VALUES ('cmojwbr9n000yzc8wr7snvnqr', 'heifashi', '黑法师', 'Aeonium arboreum', '景天科 · 莲花掌属', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1000', 2, '全日照', '冬季生长,夏季休眠', '0°C', '黑法师是冬型种,夏季休眠时叶片会收拢包住茎干,冬天是疯狂生长季。叶片墨紫黑,极具戏剧感。', '[\"冬天反而要勤浇水,夏天要少\",\"生长快速,可修剪塑形\",\"全日照才能黑得漂亮\",\"修剪下来的枝条可直接扦插\"]', '[\"https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1000\"]');
INSERT INTO `plants` (`id`, `slug`, `name`, `latinName`, `family`, `cover`, `difficulty`, `light`, `watering`, `hardiness`, `description`, `tips`, `gallery`) VALUES ('cmojwbr9o000zzc8w414jwb0l', 'qilinhua', '麒麟花', 'Euphorbia milii', '大戟科 · 大戟属', 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000', 2, '全日照', '耐旱,少水', '5°C', '虽然叫「花」,实为多肉质灌木,茎布满硬刺,顶端苞片鲜艳,四季开花,非常皮实。汁液有毒,操作时戴手套。', '[\"汁液有毒,避免接触皮肤和眼睛\",\"开花性极好,常年不断花\",\"耐修剪,可塑造造型\",\"不耐寒,北方需室内越冬\"]', '[\"https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000\"]');
COMMIT;

-- ----------------------------
-- Table structure for post_collects
-- ----------------------------
DROP TABLE IF EXISTS `post_collects`;
CREATE TABLE `post_collects` (
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `postId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`userId`,`postId`),
  KEY `post_collects_postId_fkey` (`postId`),
  CONSTRAINT `post_collects_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `post_collects_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of post_collects
-- ----------------------------
BEGIN;
INSERT INTO `post_collects` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr9t0014zc8w591mkogj', '2026-04-29 10:13:09.429');
COMMIT;

-- ----------------------------
-- Table structure for post_likes
-- ----------------------------
DROP TABLE IF EXISTS `post_likes`;
CREATE TABLE `post_likes` (
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `postId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`userId`,`postId`),
  KEY `post_likes_postId_fkey` (`postId`),
  CONSTRAINT `post_likes_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `post_likes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of post_likes
-- ----------------------------
BEGIN;
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr9t0014zc8w591mkogj', '2026-04-29 10:13:08.995');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr9w001ezc8w9xhii1en', '2026-04-29 10:12:19.831');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr9x001gzc8wa56catyx', '2026-04-29 10:12:19.828');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbra0001szc8wjb3jj65c', '2026-04-29 10:12:19.815');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbra2001yzc8wffhcbh61', '2026-04-29 10:12:19.812');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbra30025zc8w0cgvmjdd', '2026-04-29 10:12:19.814');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbra40027zc8wbbprmlq5', '2026-04-29 10:12:19.820');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbra50029zc8w9ck97jqm', '2026-04-29 10:12:19.824');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbra6002gzc8wwazkh1lb', '2026-04-29 10:12:19.818');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbra6002izc8wfp4tyl09', '2026-04-29 10:12:19.826');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbra7002kzc8wy10vgnn2', '2026-04-29 10:12:19.822');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbra7002mzc8w5x03iaka', '2026-04-29 10:12:19.827');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr9t0014zc8w591mkogj', '2026-04-29 10:12:19.810');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr9w001ezc8w9xhii1en', '2026-04-29 10:12:19.831');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr9x001gzc8wa56catyx', '2026-04-29 10:12:19.828');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbra0001szc8wjb3jj65c', '2026-04-29 10:12:19.816');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbra2001yzc8wffhcbh61', '2026-04-29 10:12:19.812');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbra30025zc8w0cgvmjdd', '2026-04-29 10:12:19.814');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbra40027zc8wbbprmlq5', '2026-04-29 10:12:19.820');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbra50029zc8w9ck97jqm', '2026-04-29 10:12:19.824');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbra6002gzc8wwazkh1lb', '2026-04-29 10:12:19.818');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbra6002izc8wfp4tyl09', '2026-04-29 10:12:19.826');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbra7002kzc8wy10vgnn2', '2026-04-29 10:12:19.823');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbra7002mzc8w5x03iaka', '2026-04-29 10:12:19.827');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr9t0014zc8w591mkogj', '2026-04-29 10:12:19.810');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr9w001ezc8w9xhii1en', '2026-04-29 10:12:19.832');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr9x001gzc8wa56catyx', '2026-04-29 10:12:19.829');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbra0001szc8wjb3jj65c', '2026-04-29 10:12:19.816');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbra2001yzc8wffhcbh61', '2026-04-29 10:12:19.813');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbra30025zc8w0cgvmjdd', '2026-04-29 10:12:19.815');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbra40027zc8wbbprmlq5', '2026-04-29 10:12:19.821');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbra50029zc8w9ck97jqm', '2026-04-29 10:12:19.824');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbra6002gzc8wwazkh1lb', '2026-04-29 10:12:19.819');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbra6002izc8wfp4tyl09', '2026-04-29 10:12:19.826');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbra7002kzc8wy10vgnn2', '2026-04-29 10:12:19.823');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbra7002mzc8w5x03iaka', '2026-04-29 10:12:19.828');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr9t0014zc8w591mkogj', '2026-04-29 10:12:19.811');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr9w001ezc8w9xhii1en', '2026-04-29 10:12:19.832');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr9x001gzc8wa56catyx', '2026-04-29 10:12:19.829');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbra0001szc8wjb3jj65c', '2026-04-29 10:12:19.817');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbra2001yzc8wffhcbh61', '2026-04-29 10:12:19.813');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbra40027zc8wbbprmlq5', '2026-04-29 10:12:19.821');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbra50029zc8w9ck97jqm', '2026-04-29 10:12:19.825');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbra6002gzc8wwazkh1lb', '2026-04-29 10:12:19.819');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbr9t0014zc8w591mkogj', '2026-04-29 10:12:19.811');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbr9x001gzc8wa56catyx', '2026-04-29 10:12:19.830');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbra0001szc8wjb3jj65c', '2026-04-29 10:12:19.817');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbra40027zc8wbbprmlq5', '2026-04-29 10:12:19.822');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbra50029zc8w9ck97jqm', '2026-04-29 10:12:19.825');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbra6002gzc8wwazkh1lb', '2026-04-29 10:12:19.820');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbr9t0014zc8w591mkogj', '2026-04-29 10:12:19.811');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbr9x001gzc8wa56catyx', '2026-04-29 10:12:19.830');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbra0001szc8wjb3jj65c', '2026-04-29 10:12:19.818');
INSERT INTO `post_likes` (`userId`, `postId`, `createdAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbra40027zc8wbbprmlq5', '2026-04-29 10:12:19.822');
COMMIT;

-- ----------------------------
-- Table structure for posts
-- ----------------------------
DROP TABLE IF EXISTS `posts`;
CREATE TABLE `posts` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('rich','short','vote','video','event') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `cover` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `images` text COLLATE utf8mb4_unicode_ci,
  `videoUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` text COLLATE utf8mb4_unicode_ci,
  `views` int NOT NULL DEFAULT '0',
  `shares` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `authorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `boardId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `posts_boardId_createdAt_idx` (`boardId`,`createdAt`),
  KEY `posts_authorId_idx` (`authorId`),
  CONSTRAINT `posts_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `posts_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `boards` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of posts
-- ----------------------------
BEGIN;
INSERT INTO `posts` (`id`, `type`, `title`, `content`, `cover`, `images`, `videoUrl`, `tags`, `views`, `shares`, `createdAt`, `updatedAt`, `authorId`, `boardId`) VALUES ('cmojwbr9t0014zc8w591mkogj', 'rich', '夏天来了,我的景天们终于度夏成功!分享一下我的度夏经验', '\n        <p>各位肉友大家好,我是<b>多肉阿绿</b>。今年华北的夏天异常炎热,但我的阳台军团居然全部度夏成功了 🎉</p>\n        <p>先上几张刚刚拍的图:</p>\n        <p>下面分享几个我觉得最关键的要点:</p>\n        <ol>\n          <li><b>通风第一位</b>。我把小风扇从早开到晚,即使 38 度也没有出现黑腐。</li>\n          <li><b>遮阳 70%</b>。正午直射会把叶片晒软,我用了 70% 遮阳网。</li>\n          <li><b>控水,不是断水</b>。整个夏天一个月给一次小水,沿盆边,傍晚进行。</li>\n          <li><b>提前预防</b>。入夏前喷了一次代森锰锌,效果很好。</li>\n        </ol>\n        <p>希望对南方的朋友也有参考意义。评论区可以继续交流~</p>\n      ', 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000', '[\"https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000\",\"https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1000\",\"https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000\"]', NULL, '[\"度夏\",\"景天\",\"经验\"]', 3843, 15, '2026-04-28 10:12:19.792', '2026-05-01 15:55:16.043', 'cmojwbr74000czc8wxsx0umvo', 'cmojwbr9c000kzc8w37ggs309');
INSERT INTO `posts` (`id`, `type`, `title`, `content`, `cover`, `images`, `videoUrl`, `tags`, `views`, `shares`, `createdAt`, `updatedAt`, `authorId`, `boardId`) VALUES ('cmojwbr9w001ezc8w9xhii1en', 'short', '今天拍到的生石花,刚蜕完皮', '刚蜕完皮的石头显得格外水灵,忍不住来晒一张。📸', 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=1000', '[\"https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=1000\",\"https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000\"]', NULL, '[\"生石花\",\"蜕皮\",\"晒图\"]', 1203, 3, '2026-04-27 10:12:19.796', '2026-04-29 10:12:19.797', 'cmojwbr7i000izc8wm5o9i3l7', 'cmojwbr9d000lzc8wpfwq2rsm');
INSERT INTO `posts` (`id`, `type`, `title`, `content`, `cover`, `images`, `videoUrl`, `tags`, `views`, `shares`, `createdAt`, `updatedAt`, `authorId`, `boardId`) VALUES ('cmojwbr9x001gzc8wa56catyx', 'vote', '你觉得新手入坑最适合哪一种多肉?', '看到新手村一直有人问这个问题,不如大家投个票帮他们做个参考吧 🌱', NULL, NULL, NULL, '[\"新手\",\"投票\"]', 2433, 2, '2026-04-26 10:12:19.797', '2026-04-30 02:00:53.175', 'cmojwbr7g000hzc8w8r5gx02y', 'cmojwbr9h000rzc8w3smylxdn');
INSERT INTO `posts` (`id`, `type`, `title`, `content`, `cover`, `images`, `videoUrl`, `tags`, `views`, `shares`, `createdAt`, `updatedAt`, `authorId`, `boardId`) VALUES ('cmojwbra0001szc8wjb3jj65c', 'video', '【配土教程】通用多肉配土,5 分钟学会', '把我的配土方子录成了视频,给新手朋友参考。', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1000', '[\"https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1000\"]', 'https://www.w3schools.com/html/mov_bbb.mp4', '[\"配土\",\"教程\",\"视频\"]', 8421, 45, '2026-04-25 10:12:19.800', '2026-04-29 10:12:19.800', 'cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr9g000pzc8wv3yqiguw');
INSERT INTO `posts` (`id`, `type`, `title`, `content`, `cover`, `images`, `videoUrl`, `tags`, `views`, `shares`, `createdAt`, `updatedAt`, `authorId`, `boardId`) VALUES ('cmojwbra2001yzc8wffhcbh61', 'event', '【线下活动】8 月 20 日·北京·多肉交流茶话会', '由本版主发起,邀请京津冀肉友线下面基,带上你家的肉肉,一起喝茶聊肉!现场还有<b>盲盒交换</b>环节 🎁', 'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=1000', '[\"https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=1000\"]', NULL, '[\"线下\",\"活动\",\"北京\"]', 4213, 30, '2026-04-24 10:12:19.801', '2026-04-29 10:12:19.802', 'cmojwbr74000czc8wxsx0umvo', 'cmojwbr9c000kzc8w37ggs309');
INSERT INTO `posts` (`id`, `type`, `title`, `content`, `cover`, `images`, `videoUrl`, `tags`, `views`, `shares`, `createdAt`, `updatedAt`, `authorId`, `boardId`) VALUES ('cmojwbra30025zc8w0cgvmjdd', 'rich', '玉露叶片扦插的完整记录(持续更新)', '<p>从 6 月 1 日开始记录,每周拍一次照。</p>\n          <p><b>Day 1</b>:掰下来健康叶片,伤口晾 3 天。</p>\n          <p><b>Day 14</b>:根点出现。</p>\n          <p><b>Day 30</b>:小芽探头。</p>\n          <p><b>Day 60</b>:移盆!</p>\n          <p>关键:避光 + 不浇水只喷水雾。</p>', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1000', '[\"https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1000\",\"https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000\"]', NULL, '[\"玉露\",\"扦插\",\"记录\"]', 2132, 12, '2026-04-23 10:12:19.803', '2026-04-29 10:12:19.804', 'cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr9e000mzc8w1bm6qol2');
INSERT INTO `posts` (`id`, `type`, `title`, `content`, `cover`, `images`, `videoUrl`, `tags`, `views`, `shares`, `createdAt`, `updatedAt`, `authorId`, `boardId`) VALUES ('cmojwbra40027zc8wbbprmlq5', 'short', '今日份的阳台', '阳光正好,微风不燥,肉肉们都乖乖的。☀️🌿', 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000', '[\"https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000\"]', NULL, '[\"日常\"]', 421, 0, '2026-04-22 10:12:19.803', '2026-04-29 10:12:19.804', 'cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr9g000pzc8wv3yqiguw');
INSERT INTO `posts` (`id`, `type`, `title`, `content`, `cover`, `images`, `videoUrl`, `tags`, `views`, `shares`, `createdAt`, `updatedAt`, `authorId`, `boardId`) VALUES ('cmojwbra50029zc8w9ck97jqm', 'vote', '你家肉肉的盆用哪种材质?', '想换盆,纠结选哪种,来投个票看看大家的选择。', NULL, NULL, NULL, '[\"盆器\",\"投票\"]', 1021, 1, '2026-04-21 10:12:19.803', '2026-04-29 10:12:19.805', 'cmojwbr7f000gzc8w31udsnet', 'cmojwbr9g000pzc8wv3yqiguw');
INSERT INTO `posts` (`id`, `type`, `title`, `content`, `cover`, `images`, `videoUrl`, `tags`, `views`, `shares`, `createdAt`, `updatedAt`, `authorId`, `boardId`) VALUES ('cmojwbra6002gzc8wwazkh1lb', 'rich', '仙人球开花全记录——从花苞到凋谢只有 12 小时', '<p>昨晚惊喜地发现我的<b>艾伦费尔德</b>冒花苞了,今天一早拍到了惊艳的开花瞬间。</p>\n          <p>仙人球的花通常只开一天,错过就是一年。所以我架了三脚架全程守候。</p>\n          <p>结论:<i>仙人球值得!</i></p>', 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000', '[\"https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000\",\"https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=1000\"]', NULL, '[\"仙人球\",\"开花\",\"延时\"]', 6213, 21, '2026-04-20 10:12:19.803', '2026-04-29 10:12:19.806', 'cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr9e000nzc8wxi3bk2nd');
INSERT INTO `posts` (`id`, `type`, `title`, `content`, `cover`, `images`, `videoUrl`, `tags`, `views`, `shares`, `createdAt`, `updatedAt`, `authorId`, `boardId`) VALUES ('cmojwbra6002izc8wfp4tyl09', 'short', '出几棵多头胧月,坐标北京,自提优先', '如图,多头饱满,上色漂亮。¥80 一棵,同城自提优先。私信联系。', 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1000', '[\"https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1000\",\"https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000\"]', NULL, '[\"出肉\",\"北京\",\"胧月\"]', 613, 0, '2026-04-19 10:12:19.803', '2026-04-29 16:33:52.216', 'cmojwbr7f000gzc8w31udsnet', 'cmojwbr9g000qzc8w79w118gs');
INSERT INTO `posts` (`id`, `type`, `title`, `content`, `cover`, `images`, `videoUrl`, `tags`, `views`, `shares`, `createdAt`, `updatedAt`, `authorId`, `boardId`) VALUES ('cmojwbra7002kzc8wy10vgnn2', 'rich', '救救我的吉娃娃!叶片发软是怎么回事?', '<p>新手求助 🙏 我的吉娃娃最近叶片发软,中心有点发黑,是黑腐还是正常?</p>\n          <p>养护环境:南阳台,配土是<b>市售多肉专用土</b>,一周浇一次水。</p>\n          <p>附图求诊!</p>', 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000', '[\"https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000\"]', NULL, '[\"求助\",\"吉娃娃\",\"黑腐\"]', 1021, 0, '2026-04-18 10:12:19.803', '2026-04-29 10:12:19.807', 'cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr9h000rzc8w3smylxdn');
INSERT INTO `posts` (`id`, `type`, `title`, `content`, `cover`, `images`, `videoUrl`, `tags`, `views`, `shares`, `createdAt`, `updatedAt`, `authorId`, `boardId`) VALUES ('cmojwbra7002mzc8w5x03iaka', 'video', '我家阳台一年的变化(延时摄影)', '用手机拍了整整 365 天,剪成 2 分钟的延时。', 'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=1000', '[\"https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=1000\"]', 'https://www.w3schools.com/html/mov_bbb.mp4', '[\"延时\",\"阳台\",\"vlog\"]', 12421, 89, '2026-04-17 10:12:19.803', '2026-04-29 10:12:19.808', 'cmojwbr7f000gzc8w31udsnet', 'cmojwbr9g000pzc8wv3yqiguw');
INSERT INTO `posts` (`id`, `type`, `title`, `content`, `cover`, `images`, `videoUrl`, `tags`, `views`, `shares`, `createdAt`, `updatedAt`, `authorId`, `boardId`) VALUES ('cmojwd6bk0006zcn7okrp025v', 'rich', '新人报道!这是我的第一个帖子', '<p>大家好!我是<b>测试新人</b>,刚刚注册肉友社,请多指教 🌱</p>', 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000', '[\"https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000\"]', NULL, '[\"新人报道\",\"自动化测试\"]', 0, 0, '2026-04-29 10:13:25.952', '2026-04-29 10:13:25.952', 'cmojwd64h0004zcn7gwxa7jwp', 'cmojwbr9h000rzc8w3smylxdn');
INSERT INTO `posts` (`id`, `type`, `title`, `content`, `cover`, `images`, `videoUrl`, `tags`, `views`, `shares`, `createdAt`, `updatedAt`, `authorId`, `boardId`) VALUES ('cmojwd6eu0008zcn7hu5d4a8x', 'vote', '大家一周浇几次水?', '投个票看看', NULL, '[]', NULL, '[\"浇水\"]', 2, 0, '2026-04-29 10:13:26.070', '2026-04-29 10:14:11.798', 'cmojwd64h0004zcn7gwxa7jwp', 'cmojwbr9g000pzc8wv3yqiguw');
COMMIT;

-- ----------------------------
-- Table structure for user_badges
-- ----------------------------
DROP TABLE IF EXISTS `user_badges`;
CREATE TABLE `user_badges` (
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `badgeId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `obtained` tinyint(1) NOT NULL DEFAULT '0',
  `obtainedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`userId`,`badgeId`),
  KEY `user_badges_badgeId_idx` (`badgeId`),
  CONSTRAINT `user_badges_badgeId_fkey` FOREIGN KEY (`badgeId`) REFERENCES `badges` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_badges_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of user_badges
-- ----------------------------
BEGIN;
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr4d0000zc8wbmeugvnm', 1, '2026-04-29 10:12:19.713');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr4m0001zc8wuv32v5qe', 1, '2026-04-29 10:12:19.716');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr4o0002zc8wpt7jvkmk', 1, '2026-04-29 10:12:19.717');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr4p0003zc8wtkxqysde', 1, '2026-04-29 10:12:19.718');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr4q0004zc8wn6p2v6wy', 1, '2026-04-29 10:12:19.720');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr4r0005zc8w8qui0zg8', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr4s0006zc8w2hjnbvbb', 1, '2026-04-29 10:12:19.723');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr4t0007zc8wmtauamvv', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr4v0008zc8weuaqsyem', 1, '2026-04-29 10:12:19.726');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr4w0009zc8wspptkxbj', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr4x000azc8wruzr66ef', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr74000czc8wxsx0umvo', 'cmojwbr4y000bzc8wd9x37d2s', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr4d0000zc8wbmeugvnm', 1, '2026-04-29 10:12:19.730');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr4m0001zc8wuv32v5qe', 1, '2026-04-29 10:12:19.731');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr4o0002zc8wpt7jvkmk', 1, '2026-04-29 10:12:19.732');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr4p0003zc8wtkxqysde', 1, '2026-04-29 10:12:19.732');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr4q0004zc8wn6p2v6wy', 1, '2026-04-29 10:12:19.733');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr4r0005zc8w8qui0zg8', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr4s0006zc8w2hjnbvbb', 1, '2026-04-29 10:12:19.734');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr4t0007zc8wmtauamvv', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr4v0008zc8weuaqsyem', 1, '2026-04-29 10:12:19.735');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr4w0009zc8wspptkxbj', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr4x000azc8wruzr66ef', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', 'cmojwbr4y000bzc8wd9x37d2s', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr4d0000zc8wbmeugvnm', 1, '2026-04-29 10:12:19.737');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr4m0001zc8wuv32v5qe', 1, '2026-04-29 10:12:19.737');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr4o0002zc8wpt7jvkmk', 1, '2026-04-29 10:12:19.738');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr4p0003zc8wtkxqysde', 1, '2026-04-29 10:12:19.739');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr4q0004zc8wn6p2v6wy', 1, '2026-04-29 10:12:19.739');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr4r0005zc8w8qui0zg8', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr4s0006zc8w2hjnbvbb', 1, '2026-04-29 10:12:19.740');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr4t0007zc8wmtauamvv', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr4v0008zc8weuaqsyem', 1, '2026-04-29 10:12:19.741');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr4w0009zc8wspptkxbj', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr4x000azc8wruzr66ef', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', 'cmojwbr4y000bzc8wd9x37d2s', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr4d0000zc8wbmeugvnm', 1, '2026-04-29 10:12:19.743');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr4m0001zc8wuv32v5qe', 1, '2026-04-29 10:12:19.744');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr4o0002zc8wpt7jvkmk', 1, '2026-04-29 10:12:19.744');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr4p0003zc8wtkxqysde', 1, '2026-04-29 10:12:19.745');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr4q0004zc8wn6p2v6wy', 1, '2026-04-29 10:12:19.746');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr4r0005zc8w8qui0zg8', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr4s0006zc8w2hjnbvbb', 1, '2026-04-29 10:12:19.747');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr4t0007zc8wmtauamvv', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr4v0008zc8weuaqsyem', 1, '2026-04-29 10:12:19.748');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr4w0009zc8wspptkxbj', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr4x000azc8wruzr66ef', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', 'cmojwbr4y000bzc8wd9x37d2s', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbr4d0000zc8wbmeugvnm', 1, '2026-04-29 10:12:19.750');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbr4m0001zc8wuv32v5qe', 1, '2026-04-29 10:12:19.750');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbr4o0002zc8wpt7jvkmk', 1, '2026-04-29 10:12:19.751');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbr4p0003zc8wtkxqysde', 1, '2026-04-29 10:12:19.751');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbr4q0004zc8wn6p2v6wy', 1, '2026-04-29 10:12:19.752');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbr4r0005zc8w8qui0zg8', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbr4s0006zc8w2hjnbvbb', 1, '2026-04-29 10:12:19.753');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbr4t0007zc8wmtauamvv', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbr4v0008zc8weuaqsyem', 1, '2026-04-29 10:12:19.753');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbr4w0009zc8wspptkxbj', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbr4x000azc8wruzr66ef', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7f000gzc8w31udsnet', 'cmojwbr4y000bzc8wd9x37d2s', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbr4d0000zc8wbmeugvnm', 1, '2026-04-29 10:12:19.756');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbr4m0001zc8wuv32v5qe', 1, '2026-04-29 10:12:19.756');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbr4o0002zc8wpt7jvkmk', 1, '2026-04-29 10:12:19.757');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbr4p0003zc8wtkxqysde', 1, '2026-04-29 10:12:19.757');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbr4q0004zc8wn6p2v6wy', 1, '2026-04-29 10:12:19.758');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbr4r0005zc8w8qui0zg8', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbr4s0006zc8w2hjnbvbb', 1, '2026-04-29 10:12:19.759');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbr4t0007zc8wmtauamvv', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbr4v0008zc8weuaqsyem', 1, '2026-04-29 10:12:19.760');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbr4w0009zc8wspptkxbj', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbr4x000azc8wruzr66ef', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', 'cmojwbr4y000bzc8wd9x37d2s', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7i000izc8wm5o9i3l7', 'cmojwbr4d0000zc8wbmeugvnm', 1, '2026-04-29 10:12:19.762');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7i000izc8wm5o9i3l7', 'cmojwbr4m0001zc8wuv32v5qe', 1, '2026-04-29 10:12:19.763');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7i000izc8wm5o9i3l7', 'cmojwbr4o0002zc8wpt7jvkmk', 1, '2026-04-29 10:12:19.763');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7i000izc8wm5o9i3l7', 'cmojwbr4p0003zc8wtkxqysde', 1, '2026-04-29 10:12:19.764');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7i000izc8wm5o9i3l7', 'cmojwbr4q0004zc8wn6p2v6wy', 1, '2026-04-29 10:12:19.765');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7i000izc8wm5o9i3l7', 'cmojwbr4r0005zc8w8qui0zg8', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7i000izc8wm5o9i3l7', 'cmojwbr4s0006zc8w2hjnbvbb', 1, '2026-04-29 10:12:19.766');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7i000izc8wm5o9i3l7', 'cmojwbr4t0007zc8wmtauamvv', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7i000izc8wm5o9i3l7', 'cmojwbr4v0008zc8weuaqsyem', 1, '2026-04-29 10:12:19.767');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7i000izc8wm5o9i3l7', 'cmojwbr4w0009zc8wspptkxbj', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7i000izc8wm5o9i3l7', 'cmojwbr4x000azc8wruzr66ef', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7i000izc8wm5o9i3l7', 'cmojwbr4y000bzc8wd9x37d2s', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7j000jzc8w78xnmxr9', 'cmojwbr4d0000zc8wbmeugvnm', 1, '2026-04-29 10:12:19.769');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7j000jzc8w78xnmxr9', 'cmojwbr4m0001zc8wuv32v5qe', 1, '2026-04-29 10:12:19.770');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7j000jzc8w78xnmxr9', 'cmojwbr4o0002zc8wpt7jvkmk', 1, '2026-04-29 10:12:19.770');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7j000jzc8w78xnmxr9', 'cmojwbr4p0003zc8wtkxqysde', 1, '2026-04-29 10:12:19.771');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7j000jzc8w78xnmxr9', 'cmojwbr4q0004zc8wn6p2v6wy', 1, '2026-04-29 10:12:19.771');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7j000jzc8w78xnmxr9', 'cmojwbr4r0005zc8w8qui0zg8', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7j000jzc8w78xnmxr9', 'cmojwbr4s0006zc8w2hjnbvbb', 1, '2026-04-29 10:12:19.772');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7j000jzc8w78xnmxr9', 'cmojwbr4t0007zc8wmtauamvv', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7j000jzc8w78xnmxr9', 'cmojwbr4v0008zc8weuaqsyem', 1, '2026-04-29 10:12:19.773');
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7j000jzc8w78xnmxr9', 'cmojwbr4w0009zc8wspptkxbj', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7j000jzc8w78xnmxr9', 'cmojwbr4x000azc8wruzr66ef', 0, NULL);
INSERT INTO `user_badges` (`userId`, `badgeId`, `obtained`, `obtainedAt`) VALUES ('cmojwbr7j000jzc8w78xnmxr9', 'cmojwbr4y000bzc8wd9x37d2s', 0, NULL);
COMMIT;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `bio` text COLLATE utf8mb4_unicode_ci,
  `level` int NOT NULL DEFAULT '1',
  `joinedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `lastSignInAt` datetime(3) DEFAULT NULL,
  `signInStreak` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of users
-- ----------------------------
BEGIN;
INSERT INTO `users` (`id`, `name`, `passwordHash`, `avatar`, `bio`, `level`, `joinedAt`, `updatedAt`, `lastSignInAt`, `signInStreak`) VALUES ('cmojwbr74000czc8wxsx0umvo', '多肉阿绿', '$2b$10$VAzuuETPSK7PkSKWREOKQ.ocDhXVb1mWUrCjFxvyWJXEICGNR.b2a', 'https://i.pravatar.cc/150?img=47', '三年肉龄,坐标华北阳台党,喜欢景天和生石花。', 7, '2026-04-29 10:12:19.697', '2026-05-01 15:53:33.756', '2026-05-01 15:53:33.756', 3);
INSERT INTO `users` (`id`, `name`, `passwordHash`, `avatar`, `bio`, `level`, `joinedAt`, `updatedAt`, `lastSignInAt`, `signInStreak`) VALUES ('cmojwbr79000dzc8w2nnm2ehu', '月光玉露', '$2b$10$VAzuuETPSK7PkSKWREOKQ.ocDhXVb1mWUrCjFxvyWJXEICGNR.b2a', 'https://i.pravatar.cc/150?img=32', '玉露控,照片都是手机拍的,随便看看。', 5, '2026-04-29 10:12:19.702', '2026-04-29 10:12:19.702', NULL, 0);
INSERT INTO `users` (`id`, `name`, `passwordHash`, `avatar`, `bio`, `level`, `joinedAt`, `updatedAt`, `lastSignInAt`, `signInStreak`) VALUES ('cmojwbr7d000ezc8wffqzsjxl', '沙漠老王', '$2b$10$VAzuuETPSK7PkSKWREOKQ.ocDhXVb1mWUrCjFxvyWJXEICGNR.b2a', 'https://i.pravatar.cc/150?img=12', '十年老玩家,仙人球和大戟科都玩。', 9, '2026-04-29 10:12:19.705', '2026-04-29 10:12:19.705', NULL, 0);
INSERT INTO `users` (`id`, `name`, `passwordHash`, `avatar`, `bio`, `level`, `joinedAt`, `updatedAt`, `lastSignInAt`, `signInStreak`) VALUES ('cmojwbr7e000fzc8wui4gzz7f', '露娜酱', '$2b$10$VAzuuETPSK7PkSKWREOKQ.ocDhXVb1mWUrCjFxvyWJXEICGNR.b2a', 'https://i.pravatar.cc/150?img=5', '萌新一枚,求带!', 2, '2026-04-29 10:12:19.707', '2026-04-29 10:12:19.707', NULL, 0);
INSERT INTO `users` (`id`, `name`, `passwordHash`, `avatar`, `bio`, `level`, `joinedAt`, `updatedAt`, `lastSignInAt`, `signInStreak`) VALUES ('cmojwbr7f000gzc8w31udsnet', '花园里的熊', '$2b$10$VAzuuETPSK7PkSKWREOKQ.ocDhXVb1mWUrCjFxvyWJXEICGNR.b2a', 'https://i.pravatar.cc/150?img=68', '全日照派,专治徒长。', 6, '2026-04-29 10:12:19.708', '2026-04-29 10:12:19.708', NULL, 0);
INSERT INTO `users` (`id`, `name`, `passwordHash`, `avatar`, `bio`, `level`, `joinedAt`, `updatedAt`, `lastSignInAt`, `signInStreak`) VALUES ('cmojwbr7g000hzc8w8r5gx02y', '清风徐来', '$2b$10$VAzuuETPSK7PkSKWREOKQ.ocDhXVb1mWUrCjFxvyWJXEICGNR.b2a', 'https://i.pravatar.cc/150?img=15', '爱拍照,不爱养,哈哈。', 4, '2026-04-29 10:12:19.709', '2026-04-29 10:12:19.709', NULL, 0);
INSERT INTO `users` (`id`, `name`, `passwordHash`, `avatar`, `bio`, `level`, `joinedAt`, `updatedAt`, `lastSignInAt`, `signInStreak`) VALUES ('cmojwbr7i000izc8wm5o9i3l7', '番杏女王', '$2b$10$VAzuuETPSK7PkSKWREOKQ.ocDhXVb1mWUrCjFxvyWJXEICGNR.b2a', 'https://i.pravatar.cc/150?img=44', '研究番杏科十年,主攻生石花。', 8, '2026-04-29 10:12:19.710', '2026-04-29 10:12:19.710', NULL, 0);
INSERT INTO `users` (`id`, `name`, `passwordHash`, `avatar`, `bio`, `level`, `joinedAt`, `updatedAt`, `lastSignInAt`, `signInStreak`) VALUES ('cmojwbr7j000jzc8w78xnmxr9', '南方小院', '$2b$10$VAzuuETPSK7PkSKWREOKQ.ocDhXVb1mWUrCjFxvyWJXEICGNR.b2a', 'https://i.pravatar.cc/150?img=23', '广州,夏天挣扎户。', 3, '2026-04-29 10:12:19.711', '2026-04-29 10:12:19.711', NULL, 0);
INSERT INTO `users` (`id`, `name`, `passwordHash`, `avatar`, `bio`, `level`, `joinedAt`, `updatedAt`, `lastSignInAt`, `signInStreak`) VALUES ('cmojwd64h0004zcn7gwxa7jwp', '测试新人', '$2b$10$uvxMUI5p2.r18JeIsHMDM.ARHaYZTLAqeb/mhuwtSZVTSPwlpBjM2', 'https://i.pravatar.cc/150?img=12', '新加入的肉友 🌱', 1, '2026-04-29 10:13:25.697', '2026-04-29 10:13:25.697', NULL, 0);
COMMIT;

-- ----------------------------
-- Table structure for vote_options
-- ----------------------------
DROP TABLE IF EXISTS `vote_options`;
CREATE TABLE `vote_options` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `voteId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `votes` int NOT NULL DEFAULT '0',
  `orderIdx` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `vote_options_voteId_idx` (`voteId`),
  CONSTRAINT `vote_options_voteId_fkey` FOREIGN KEY (`voteId`) REFERENCES `votes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of vote_options
-- ----------------------------
BEGIN;
INSERT INTO `vote_options` (`id`, `voteId`, `label`, `votes`, `orderIdx`) VALUES ('cmojwbr9x001izc8w7q95f7mi', 'cmojwbr9x001hzc8wy2pffo9r', '胧月(糖豆石莲系)', 1, 0);
INSERT INTO `vote_options` (`id`, `voteId`, `label`, `votes`, `orderIdx`) VALUES ('cmojwbr9x001jzc8wnr5e2sz9', 'cmojwbr9x001hzc8wy2pffo9r', '玉露(十二卷)', 208, 1);
INSERT INTO `vote_options` (`id`, `voteId`, `label`, `votes`, `orderIdx`) VALUES ('cmojwbr9x001kzc8w40hdgze2', 'cmojwbr9x001hzc8wy2pffo9r', '虹之玉(景天属)', 312, 2);
INSERT INTO `vote_options` (`id`, `voteId`, `label`, `votes`, `orderIdx`) VALUES ('cmojwbr9x001lzc8wowkg4ukb', 'cmojwbr9x001hzc8wy2pffo9r', '仙人球(圆球即正义)', 176, 3);
INSERT INTO `vote_options` (`id`, `voteId`, `label`, `votes`, `orderIdx`) VALUES ('cmojwbr9x001mzc8whsooxz2j', 'cmojwbr9x001hzc8wy2pffo9r', '生石花(劝退专用)', 54, 4);
INSERT INTO `vote_options` (`id`, `voteId`, `label`, `votes`, `orderIdx`) VALUES ('cmojwbra5002bzc8w2h67ea4n', 'cmojwbra5002azc8w8d82fe2t', '红陶盆(呼吸好)', 152, 0);
INSERT INTO `vote_options` (`id`, `voteId`, `label`, `votes`, `orderIdx`) VALUES ('cmojwbra5002czc8w7zrm99tg', 'cmojwbra5002azc8w8d82fe2t', '瓷盆(颜值党)', 98, 1);
INSERT INTO `vote_options` (`id`, `voteId`, `label`, `votes`, `orderIdx`) VALUES ('cmojwbra5002dzc8wmexbq20o', 'cmojwbra5002azc8w8d82fe2t', '塑料盆(便宜大碗)', 87, 2);
INSERT INTO `vote_options` (`id`, `voteId`, `label`, `votes`, `orderIdx`) VALUES ('cmojwbra5002ezc8wu1ozufik', 'cmojwbra5002azc8w8d82fe2t', '紫砂盆(装逼首选)', 41, 3);
INSERT INTO `vote_options` (`id`, `voteId`, `label`, `votes`, `orderIdx`) VALUES ('cmojwd6eu000azcn70yspo9ik', 'cmojwd6eu0009zcn7kknfhgaj', '1 次', 0, 0);
INSERT INTO `vote_options` (`id`, `voteId`, `label`, `votes`, `orderIdx`) VALUES ('cmojwd6eu000bzcn7rshegrdu', 'cmojwd6eu0009zcn7kknfhgaj', '2 次', 0, 1);
INSERT INTO `vote_options` (`id`, `voteId`, `label`, `votes`, `orderIdx`) VALUES ('cmojwd6eu000czcn72f5ajza9', 'cmojwd6eu0009zcn7kknfhgaj', '3 次及以上', 0, 2);
INSERT INTO `vote_options` (`id`, `voteId`, `label`, `votes`, `orderIdx`) VALUES ('cmojwd6eu000dzcn7q3yzzx4v', 'cmojwd6eu0009zcn7kknfhgaj', '看天不固定', 0, 3);
COMMIT;

-- ----------------------------
-- Table structure for vote_records
-- ----------------------------
DROP TABLE IF EXISTS `vote_records`;
CREATE TABLE `vote_records` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `voteId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `optionId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vote_records_voteId_userId_optionId_key` (`voteId`,`userId`,`optionId`),
  KEY `vote_records_optionId_fkey` (`optionId`),
  KEY `vote_records_userId_fkey` (`userId`),
  CONSTRAINT `vote_records_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `vote_options` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `vote_records_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `vote_records_voteId_fkey` FOREIGN KEY (`voteId`) REFERENCES `votes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of vote_records
-- ----------------------------
BEGIN;
INSERT INTO `vote_records` (`id`, `voteId`, `optionId`, `userId`, `createdAt`) VALUES ('cmojwcu8x0003zcn7p0dznrs5', 'cmojwbr9x001hzc8wy2pffo9r', 'cmojwbr9x001izc8w7q95f7mi', 'cmojwbr74000czc8wxsx0umvo', '2026-04-29 10:13:10.306');
COMMIT;

-- ----------------------------
-- Table structure for votes
-- ----------------------------
DROP TABLE IF EXISTS `votes`;
CREATE TABLE `votes` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `postId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `question` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `multi` tinyint(1) NOT NULL DEFAULT '0',
  `deadline` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `votes_postId_key` (`postId`),
  CONSTRAINT `votes_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of votes
-- ----------------------------
BEGIN;
INSERT INTO `votes` (`id`, `postId`, `question`, `multi`, `deadline`) VALUES ('cmojwbr9x001hzc8wy2pffo9r', 'cmojwbr9x001gzc8wa56catyx', '新手最适合入坑的多肉是?', 0, '2026-05-06 10:12:19.797');
INSERT INTO `votes` (`id`, `postId`, `question`, `multi`, `deadline`) VALUES ('cmojwbra5002azc8w8d82fe2t', 'cmojwbra50029zc8w9ck97jqm', '你最常用哪种盆?', 0, '2026-05-02 10:12:19.803');
INSERT INTO `votes` (`id`, `postId`, `question`, `multi`, `deadline`) VALUES ('cmojwd6eu0009zcn7kknfhgaj', 'cmojwd6eu0008zcn7hu5d4a8x', '一周浇几次水?', 0, '2026-05-06 10:13:26.049');
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
