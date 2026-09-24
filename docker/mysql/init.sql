-- MySQL init script
-- Creates required databases and grants permissions

CREATE DATABASE IF NOT EXISTS ros_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON ros_db.* TO 'ros_user'@'%';
FLUSH PRIVILEGES;
