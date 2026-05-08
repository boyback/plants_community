package httpx

import (
	"plants-community-server/internal/models"

	"gorm.io/gorm"
)

// LoadUserAggregate 取出用户 + 对应 counts + 徽章列表,供序列化
func LoadUserAggregate(db *gorm.DB, userID string) (*models.User, UserCounts, []models.UserBadge, error) {
	var u models.User
	if err := db.Where("id = ?", userID).First(&u).Error; err != nil {
		return nil, UserCounts{}, nil, err
	}
	return &u, LoadUserCounts(db, userID), LoadUserBadges(db, userID), nil
}

func LoadUserCounts(db *gorm.DB, userID string) UserCounts {
	return UserCounts{
		Posts:     CountInt(db, "posts", "authorId = ?", userID),
		Followers: CountInt(db, "follows", "followeeId = ?", userID),
		Following: CountInt(db, "follows", "followerId = ?", userID),
	}
}

func LoadUserBadges(db *gorm.DB, userID string) []models.UserBadge {
	var list []models.UserBadge
	db.Preload("Badge").
		Where("userId = ?", userID).
		Find(&list)
	return list
}

// CountInt 通用的 Count 辅助方法
func CountInt(db *gorm.DB, table string, where string, args ...any) int {
	var n int64
	db.Table(table).Where(where, args...).Count(&n)
	return int(n)
}
