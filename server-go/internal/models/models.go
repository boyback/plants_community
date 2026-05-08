package models

import "time"

// 所有模型对应 prisma/schema.prisma 里已存在的表。
// 命名策略:结构体 PascalCase,字段 gorm tag 显式指明 列名(蛇形 or 驼峰,跟 Prisma 一致)。
// 关键:Prisma 生成的表列名是驼峰(如 createdAt),不是蛇形。

// =========== User ===========

type User struct {
	ID                    string     `gorm:"column:id;primaryKey" json:"id"`
	Name                  string     `gorm:"column:name;uniqueIndex" json:"name"`
	PasswordHash          string     `gorm:"column:passwordHash" json:"-"`
	Avatar                string     `gorm:"column:avatar" json:"avatar"`
	Bio                   *string    `gorm:"column:bio" json:"bio,omitempty"`
	Level                 int        `gorm:"column:level" json:"level"`
	Exp                   int        `gorm:"column:exp" json:"exp"`
	JoinedAt              time.Time  `gorm:"column:joinedAt" json:"joinedAt"`
	UpdatedAt             time.Time  `gorm:"column:updatedAt" json:"updatedAt"`
	LastSignInAt          *time.Time `gorm:"column:lastSignInAt" json:"lastSignInAt,omitempty"`
	SignInStreak          int        `gorm:"column:signInStreak" json:"signInStreak"`
	PointsBalance         int        `gorm:"column:pointsBalance" json:"pointsBalance"`
	VipExpireAt           *time.Time `gorm:"column:vipExpireAt" json:"vipExpireAt,omitempty"`
	VipLifetime           bool       `gorm:"column:vipLifetime" json:"vipLifetime"`
	VipFirstAt            *time.Time `gorm:"column:vipFirstAt" json:"vipFirstAt,omitempty"`
	PrivacyShowFollowing  bool       `gorm:"column:privacyShowFollowing" json:"privacyShowFollowing"`
	PrivacyShowFollowers  bool       `gorm:"column:privacyShowFollowers" json:"privacyShowFollowers"`
	Locale                string     `gorm:"column:locale" json:"locale"`
	DisabledThemes        string     `gorm:"column:disabledThemes" json:"-"` // JSON array,序列化层展开
	ThemesDisabled        bool       `gorm:"column:themesDisabled" json:"themesDisabled"`
	EquipBubbleId         *string    `gorm:"column:equipBubbleId" json:"equipBubbleId,omitempty"`
	EquipReactionId       *string    `gorm:"column:equipReactionId" json:"equipReactionId,omitempty"`
	EquipStickerId        *string    `gorm:"column:equipStickerId" json:"equipStickerId,omitempty"`
	EquipPendantId        *string    `gorm:"column:equipPendantId" json:"equipPendantId,omitempty"`

	// 管理员/封禁字段
	Role        string     `gorm:"column:role" json:"role"` // user | moderator | admin
	BannedUntil *time.Time `gorm:"column:bannedUntil" json:"bannedUntil,omitempty"`
	BanReason   *string    `gorm:"column:banReason" json:"banReason,omitempty"`
}

// IsBanned 当前是否处于封禁状态
func (u *User) IsBanned() bool {
	return u.BannedUntil != nil && u.BannedUntil.After(time.Now())
}

// IsAdmin 严格管理员
func (u *User) IsAdmin() bool { return u.Role == "admin" }

// IsModerator admin 或 moderator
func (u *User) IsModerator() bool { return u.Role == "admin" || u.Role == "moderator" }

func (User) TableName() string { return "users" }

// =========== Follow(用户间) ===========

type Follow struct {
	FollowerID string    `gorm:"column:followerId;primaryKey"`
	FolloweeID string    `gorm:"column:followeeId;primaryKey"`
	CreatedAt  time.Time `gorm:"column:createdAt"`
}

func (Follow) TableName() string { return "follows" }

// =========== Badge ===========

type Badge struct {
	ID          string `gorm:"column:id;primaryKey"`
	Slug        string `gorm:"column:slug;uniqueIndex"`
	Name        string `gorm:"column:name"`
	Icon        string `gorm:"column:icon"`
	Description string `gorm:"column:description"`
	OrderIdx    int    `gorm:"column:orderIdx"`
}

func (Badge) TableName() string { return "badges" }

type UserBadge struct {
	UserID     string     `gorm:"column:userId;primaryKey"`
	BadgeID    string     `gorm:"column:badgeId;primaryKey"`
	Obtained   bool       `gorm:"column:obtained"`
	ObtainedAt *time.Time `gorm:"column:obtainedAt"`
	Badge      Badge      `gorm:"foreignKey:BadgeID;references:ID"`
}

func (UserBadge) TableName() string { return "user_badges" }

// =========== Category / Genus / Species ===========

type Category struct {
	ID          string    `gorm:"column:id;primaryKey"`
	Slug        string    `gorm:"column:slug;uniqueIndex"`
	Name        string    `gorm:"column:name"`
	LatinName   *string   `gorm:"column:latinName"`
	Kind        string    `gorm:"column:kind"`
	Description string    `gorm:"column:description"`
	Cover       string    `gorm:"column:cover"`
	Icon        string    `gorm:"column:icon"`
	Members     int       `gorm:"column:members"`
	OrderIdx    int       `gorm:"column:orderIdx"`
	Enabled     bool      `gorm:"column:enabled"`
	CreatedAt   time.Time `gorm:"column:createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt"`
}

func (Category) TableName() string { return "categories" }

type Genus struct {
	ID          string    `gorm:"column:id;primaryKey"`
	CategoryID  string    `gorm:"column:categoryId"`
	Slug        string    `gorm:"column:slug"`
	Name        string    `gorm:"column:name"`
	LatinName   *string   `gorm:"column:latinName"`
	Description string    `gorm:"column:description"`
	Cover       *string   `gorm:"column:cover"`
	OrderIdx    int       `gorm:"column:orderIdx"`
	CreatedAt   time.Time `gorm:"column:createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt"`
	Category    Category  `gorm:"foreignKey:CategoryID;references:ID"`
}

func (Genus) TableName() string { return "genera" }

type Species struct {
	ID           string    `gorm:"column:id;primaryKey"`
	GenusID      string    `gorm:"column:genusId"`
	Slug         string    `gorm:"column:slug"`
	Name         string    `gorm:"column:name"`
	LatinName    string    `gorm:"column:latinName"`
	Alias        *string   `gorm:"column:alias"`
	Description  string    `gorm:"column:description"`
	Cover        string    `gorm:"column:cover"`
	Gallery      string    `gorm:"column:gallery"` // JSON 字符串
	Difficulty   int       `gorm:"column:difficulty"`
	Light        string    `gorm:"column:light"`
	Watering     string    `gorm:"column:watering"`
	Hardiness    string    `gorm:"column:hardiness"`
	Tips         string    `gorm:"column:tips"` // JSON 字符串
	Blooming     *string   `gorm:"column:blooming"`
	OriginRegion *string   `gorm:"column:originRegion"`
	GrowthType   *string   `gorm:"column:growthType"`
	CreatedAt    time.Time `gorm:"column:createdAt"`
	UpdatedAt    time.Time `gorm:"column:updatedAt"`
	Genus        Genus     `gorm:"foreignKey:GenusID;references:ID"`
}

func (Species) TableName() string { return "species" }

// =========== Post / Comment / Like / Collect ===========

type Post struct {
	ID          string    `gorm:"column:id;primaryKey"`
	Type        string    `gorm:"column:type"`
	Title       string    `gorm:"column:title"`
	Content     string    `gorm:"column:content"`
	ContentJson *string   `gorm:"column:contentJson"`
	ContentText *string   `gorm:"column:contentText"`
	Cover       *string   `gorm:"column:cover"`
	Images      *string   `gorm:"column:images"`
	VideoURL    *string   `gorm:"column:videoUrl"`
	Tags        *string   `gorm:"column:tags"`
	Views       int       `gorm:"column:views"`
	Shares      int       `gorm:"column:shares"`
	HotScore    float64   `gorm:"column:hotScore"`
	Deleted     bool      `gorm:"column:deleted"`
	DeletedAt   *time.Time `gorm:"column:deletedAt"`
	DeletedBy   *string   `gorm:"column:deletedBy"`
	DeleteReason *string  `gorm:"column:deleteReason"`
	CreatedAt   time.Time `gorm:"column:createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt"`
	AuthorID    string    `gorm:"column:authorId"`
	CategoryID  *string   `gorm:"column:categoryId"`
	GenusID     *string   `gorm:"column:genusId"`
	SpeciesID   *string   `gorm:"column:speciesId"`
	BoardID     *string   `gorm:"column:boardId"`

	Author   User      `gorm:"foreignKey:AuthorID;references:ID"`
	Category *Category `gorm:"foreignKey:CategoryID;references:ID"`
	Genus    *Genus    `gorm:"foreignKey:GenusID;references:ID"`
	Species  *Species  `gorm:"foreignKey:SpeciesID;references:ID"`
}

func (Post) TableName() string { return "posts" }

type Comment struct {
	ID          string    `gorm:"column:id;primaryKey"`
	PostID      string    `gorm:"column:postId"`
	AuthorID    string    `gorm:"column:authorId"`
	ParentID    *string   `gorm:"column:parentId"`
	Content     string    `gorm:"column:content"`
	ContentJson *string   `gorm:"column:contentJson"`
	ContentText *string   `gorm:"column:contentText"`
	Likes       int       `gorm:"column:likes"`
	CreatedAt   time.Time `gorm:"column:createdAt"`

	Author User `gorm:"foreignKey:AuthorID;references:ID"`
}

func (Comment) TableName() string { return "comments" }

type PostLike struct {
	UserID    string    `gorm:"column:userId;primaryKey"`
	PostID    string    `gorm:"column:postId;primaryKey"`
	CreatedAt time.Time `gorm:"column:createdAt"`
}

func (PostLike) TableName() string { return "post_likes" }

type PostCollect struct {
	UserID    string    `gorm:"column:userId;primaryKey"`
	PostID    string    `gorm:"column:postId;primaryKey"`
	CreatedAt time.Time `gorm:"column:createdAt"`
}

func (PostCollect) TableName() string { return "post_collects" }

// =========== BoardFollow(多态板块关注) ===========

type BoardFollow struct {
	ID        string    `gorm:"column:id;primaryKey"`
	UserID    string    `gorm:"column:userId"`
	Type      string    `gorm:"column:type"` // category | genus | species
	TargetID  string    `gorm:"column:targetId"`
	CreatedAt time.Time `gorm:"column:createdAt"`
}

func (BoardFollow) TableName() string { return "board_follows" }

// =========== Notification ===========

type Notification struct {
	ID          string    `gorm:"column:id;primaryKey"`
	RecipientID string    `gorm:"column:recipientId"`
	FromID      *string   `gorm:"column:fromId"`
	Type        string    `gorm:"column:type"`
	Text        string    `gorm:"column:text"`
	Link        *string   `gorm:"column:link"`
	Read        bool      `gorm:"column:read"`
	CreatedAt   time.Time `gorm:"column:createdAt"`
	From        *User     `gorm:"foreignKey:FromID;references:ID"`
}

func (Notification) TableName() string { return "notifications" }

// =========== Draft(帖子草稿) ===========

type Draft struct {
	ID        string    `gorm:"column:id;primaryKey"`
	UserID    string    `gorm:"column:userId"`
	Payload   string    `gorm:"column:payload"` // JSON 字符串,整张表单
	Title     string    `gorm:"column:title"`
	Type      string    `gorm:"column:type"`
	UpdatedAt time.Time `gorm:"column:updatedAt"`
	CreatedAt time.Time `gorm:"column:createdAt"`
}

func (Draft) TableName() string { return "drafts" }

// =========== HelpRequest(求助帖扩展) ===========

type HelpRequest struct {
	ID                string     `gorm:"column:id;primaryKey"`
	PostID            string     `gorm:"column:postId;uniqueIndex"`
	Urgency           string     `gorm:"column:urgency"` // low | normal | high
	Solved            bool       `gorm:"column:solved"`
	AcceptedCommentID *string    `gorm:"column:acceptedCommentId"`
	BountyPoints      int        `gorm:"column:bountyPoints"`
	BountyPaidOut     bool       `gorm:"column:bountyPaidOut"`
	SolvedAt          *time.Time `gorm:"column:solvedAt"`
	CreatedAt         time.Time  `gorm:"column:createdAt"`
	UpdatedAt         time.Time  `gorm:"column:updatedAt"`
}

func (HelpRequest) TableName() string { return "help_requests" }

// ============================================================
// 第三期:交易 / 拍卖 / VIP / 地址 / 积分流水
// ============================================================

// =========== Product(商品) ===========

type Product struct {
	ID              string    `gorm:"column:id;primaryKey"`
	Source          string    `gorm:"column:source"` // official | c2c
	Title           string    `gorm:"column:title"`
	Cover           string    `gorm:"column:cover"`
	Images          string    `gorm:"column:images"` // JSON array string
	Description     string    `gorm:"column:description"`
	DescriptionJson *string   `gorm:"column:descriptionJson"`
	DescriptionText *string   `gorm:"column:descriptionText"`
	Category        string    `gorm:"column:category"`
	Price           int       `gorm:"column:price"`
	OriginalPrice   *int      `gorm:"column:originalPrice"`
	Stock           int       `gorm:"column:stock"`
	PointsBack      int       `gorm:"column:pointsBack"`
	Status          string    `gorm:"column:status"` // on_sale | sold_out | off_shelf | draft
	SellerID        *string   `gorm:"column:sellerId"`
	ShipFrom        *string   `gorm:"column:shipFrom"`
	Tags            *string   `gorm:"column:tags"`
	CreatedAt       time.Time `gorm:"column:createdAt"`
	UpdatedAt       time.Time `gorm:"column:updatedAt"`

	Seller *User `gorm:"foreignKey:SellerID;references:ID"`
}

func (Product) TableName() string { return "products" }

// =========== Order(订单) ===========

type Order struct {
	ID              string    `gorm:"column:id;primaryKey"`
	OrderNo         string    `gorm:"column:orderNo;uniqueIndex"`
	Source          string    `gorm:"column:source"` // product | auction
	ProductID       *string   `gorm:"column:productId"`
	AuctionID       *string   `gorm:"column:auctionId"`
	BuyerID         string    `gorm:"column:buyerId"`
	SellerID        *string   `gorm:"column:sellerId"`
	Quantity        int       `gorm:"column:quantity"`
	UnitPrice       int       `gorm:"column:unitPrice"`
	TotalPrice      int       `gorm:"column:totalPrice"`
	DepositPaid     int       `gorm:"column:depositPaid"`
	PointsBackTotal int       `gorm:"column:pointsBackTotal"`
	Status          string    `gorm:"column:status"` // pending_payment, pending_ship, pending_receipt, pending_review, completed, cancelled, refunded
	ShipName        *string   `gorm:"column:shipName"`
	ShipPhone       *string   `gorm:"column:shipPhone"`
	ShipAddress     *string   `gorm:"column:shipAddress"`
	TrackingNo      *string   `gorm:"column:trackingNo"`
	ShippedAt       *time.Time `gorm:"column:shippedAt"`
	ReceivedAt      *time.Time `gorm:"column:receivedAt"`
	ReviewRating    *int      `gorm:"column:reviewRating"`
	ReviewText      *string   `gorm:"column:reviewText"`
	ReviewTextJson  *string   `gorm:"column:reviewTextJson"`
	ReviewTextPlain *string   `gorm:"column:reviewTextPlain"`
	ReviewedAt      *time.Time `gorm:"column:reviewedAt"`
	CancelledAt     *time.Time `gorm:"column:cancelledAt"`
	RefundReason    *string   `gorm:"column:refundReason"`
	RefundedAt      *time.Time `gorm:"column:refundedAt"`
	CreatedAt       time.Time `gorm:"column:createdAt"`
	UpdatedAt       time.Time `gorm:"column:updatedAt"`

	Product *Product `gorm:"foreignKey:ProductID;references:ID"`
	Auction *Auction `gorm:"foreignKey:AuctionID;references:ID"`
	Buyer   *User    `gorm:"foreignKey:BuyerID;references:ID"`
	Seller  *User    `gorm:"foreignKey:SellerID;references:ID"`
}

func (Order) TableName() string { return "orders" }

// =========== Payment(支付单) ===========

type Payment struct {
	ID        string    `gorm:"column:id;primaryKey"`
	PayNo     string    `gorm:"column:payNo;uniqueIndex"`
	BizType   string    `gorm:"column:bizType"` // order | vip | deposit | auction_balance
	BizID     string    `gorm:"column:bizId"`
	UserID    string    `gorm:"column:userId"`
	Channel   string    `gorm:"column:channel"` // wechat | alipay | points
	Amount    int       `gorm:"column:amount"`
	Qrcode    *string   `gorm:"column:qrcode"`
	Status    string    `gorm:"column:status"` // pending | paid | expired | cancelled | refunded
	ExpireAt  time.Time `gorm:"column:expireAt"`
	PaidAt    *time.Time `gorm:"column:paidAt"`
	CreatedAt time.Time `gorm:"column:createdAt"`
}

func (Payment) TableName() string { return "payments" }

// =========== Auction / Bid / AuctionParticipant ===========

type Auction struct {
	ID               string    `gorm:"column:id;primaryKey"`
	SellerID         string    `gorm:"column:sellerId"`
	Title            string    `gorm:"column:title"`
	Cover            string    `gorm:"column:cover"`
	Images           string    `gorm:"column:images"`
	Description      string    `gorm:"column:description"`
	DescriptionJson  *string   `gorm:"column:descriptionJson"`
	DescriptionText  *string   `gorm:"column:descriptionText"`
	Category         string    `gorm:"column:category"`
	Tags             *string   `gorm:"column:tags"`
	StartPrice       int       `gorm:"column:startPrice"`
	MinIncrement     int       `gorm:"column:minIncrement"`
	BuyNowPrice      *int      `gorm:"column:buyNowPrice"`
	DepositAmount    int       `gorm:"column:depositAmount"`
	ReservePrice     *int      `gorm:"column:reservePrice"`
	StartAt          time.Time `gorm:"column:startAt"`
	EndAt            time.Time `gorm:"column:endAt"`
	ActualEndAt      *time.Time `gorm:"column:actualEndAt"`
	AntiSnipeMinutes int       `gorm:"column:antiSnipeMinutes"`
	Status           string    `gorm:"column:status"` // draft | scheduled | live | finished | cancelled
	Result           *string   `gorm:"column:result"` // won | paid | no_bidder | defaulted | cancelled
	CurrentPrice     int       `gorm:"column:currentPrice"`
	BidCount         int       `gorm:"column:bidCount"`
	WinnerID         *string   `gorm:"column:winnerId"`
	WinningOrderID   *string   `gorm:"column:winningOrderId"`
	CreatedAt        time.Time `gorm:"column:createdAt"`
	UpdatedAt        time.Time `gorm:"column:updatedAt"`

	Seller *User `gorm:"foreignKey:SellerID;references:ID"`
	Winner *User `gorm:"foreignKey:WinnerID;references:ID"`
}

func (Auction) TableName() string { return "auctions" }

type Bid struct {
	ID        string    `gorm:"column:id;primaryKey"`
	AuctionID string    `gorm:"column:auctionId"`
	BidderID  string    `gorm:"column:bidderId"`
	Amount    int       `gorm:"column:amount"`
	CreatedAt time.Time `gorm:"column:createdAt"`

	Bidder *User `gorm:"foreignKey:BidderID;references:ID"`
}

func (Bid) TableName() string { return "bids" }

type AuctionParticipant struct {
	ID               string    `gorm:"column:id;primaryKey"`
	AuctionID        string    `gorm:"column:auctionId"`
	UserID           string    `gorm:"column:userId"`
	DepositPaymentID *string   `gorm:"column:depositPaymentId"`
	DepositStatus    string    `gorm:"column:depositStatus"` // pending | held | applied | refunded | forfeited
	DepositAmount    int       `gorm:"column:depositAmount"`
	CreatedAt        time.Time `gorm:"column:createdAt"`
	UpdatedAt        time.Time `gorm:"column:updatedAt"`

	User *User `gorm:"foreignKey:UserID;references:ID"`
}

func (AuctionParticipant) TableName() string { return "auction_participants" }

// =========== VipOrder ===========

type VipOrder struct {
	ID           string    `gorm:"column:id;primaryKey"`
	OrderNo      string    `gorm:"column:orderNo;uniqueIndex"`
	UserID       string    `gorm:"column:userId"`
	Plan         string    `gorm:"column:plan"` // monthly | quarterly | yearly | lifetime | monthly_points
	Amount       int       `gorm:"column:amount"`
	PointsCost   int       `gorm:"column:pointsCost"`
	DurationDays int       `gorm:"column:durationDays"`
	Status       string    `gorm:"column:status"`
	PaidAt       *time.Time `gorm:"column:paidAt"`
	CreatedAt    time.Time `gorm:"column:createdAt"`
}

func (VipOrder) TableName() string { return "vip_orders" }

// =========== Address ===========

type Address struct {
	ID        string    `gorm:"column:id;primaryKey"`
	UserID    string    `gorm:"column:userId"`
	Name      string    `gorm:"column:name"`
	Phone     string    `gorm:"column:phone"`
	Province  *string   `gorm:"column:province"`
	City      *string   `gorm:"column:city"`
	District  *string   `gorm:"column:district"`
	Detail    string    `gorm:"column:detail"`
	Zip       *string   `gorm:"column:zip"`
	Tag       *string   `gorm:"column:tag"`
	IsDefault bool      `gorm:"column:isDefault"`
	CreatedAt time.Time `gorm:"column:createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt"`
}

func (Address) TableName() string { return "addresses" }

// =========== PointsLedger ===========

type PointsLedger struct {
	ID        string    `gorm:"column:id;primaryKey"`
	UserID    string    `gorm:"column:userId"`
	Type      string    `gorm:"column:type"`
	Delta     int       `gorm:"column:delta"`
	Balance   int       `gorm:"column:balance"`
	RefType   *string   `gorm:"column:refType"`
	RefID     *string   `gorm:"column:refId"`
	Remark    *string   `gorm:"column:remark"`
	CreatedAt time.Time `gorm:"column:createdAt"`
}

func (PointsLedger) TableName() string { return "points_ledger" }

// =========== Report ===========

type Report struct {
	ID         string     `gorm:"column:id;primaryKey" json:"id"`
	ReporterID *string    `gorm:"column:reporterId" json:"reporterId,omitempty"`
	TargetType string     `gorm:"column:targetType" json:"targetType"` // post|comment|user
	TargetID   string     `gorm:"column:targetId" json:"targetId"`
	Reason     string     `gorm:"column:reason" json:"reason"`
	Detail     *string    `gorm:"column:detail" json:"detail,omitempty"`
	Status     string     `gorm:"column:status" json:"status"` // pending|resolved|rejected
	HandledBy  *string    `gorm:"column:handledBy" json:"handledBy,omitempty"`
	HandledAt  *time.Time `gorm:"column:handledAt" json:"handledAt,omitempty"`
	HandleNote *string    `gorm:"column:handleNote" json:"handleNote,omitempty"`
	CreatedAt  time.Time  `gorm:"column:createdAt" json:"createdAt"`
}

func (Report) TableName() string { return "reports" }

// =========== AdminLog ===========

type AdminLog struct {
	ID         string    `gorm:"column:id;primaryKey" json:"id"`
	ActorID    string    `gorm:"column:actorId" json:"actorId"`
	Action     string    `gorm:"column:action" json:"action"`
	TargetType string    `gorm:"column:targetType" json:"targetType"`
	TargetID   *string   `gorm:"column:targetId" json:"targetId,omitempty"`
	Meta       *string   `gorm:"column:meta;type:json" json:"-"` // 序列化的 JSON 字符串
	Reason     *string   `gorm:"column:reason" json:"reason,omitempty"`
	IP         *string   `gorm:"column:ip" json:"ip,omitempty"`
	CreatedAt  time.Time `gorm:"column:createdAt" json:"createdAt"`
}

func (AdminLog) TableName() string { return "admin_logs" }

// =========== Announcement ===========

type Announcement struct {
	ID        string     `gorm:"column:id;primaryKey" json:"id"`
	Title     string     `gorm:"column:title" json:"title"`
	Content   string     `gorm:"column:content" json:"content"`
	Level     string     `gorm:"column:level" json:"level"` // info|warning|important
	Enabled   bool       `gorm:"column:enabled" json:"enabled"`
	StartAt   *time.Time `gorm:"column:startAt" json:"startAt,omitempty"`
	EndAt     *time.Time `gorm:"column:endAt" json:"endAt,omitempty"`
	CreatedBy string     `gorm:"column:createdBy" json:"createdBy"`
	CreatedAt time.Time  `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time  `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Announcement) TableName() string { return "announcements" }

// =========== PostView ===========

type PostView struct {
	ID        string    `gorm:"column:id;primaryKey" json:"id"`
	PostID    string    `gorm:"column:postId" json:"postId"`
	UserID    *string   `gorm:"column:userId" json:"userId,omitempty"`
	AnonID    *string   `gorm:"column:anonId" json:"anonId,omitempty"`
	Source    *string   `gorm:"column:source" json:"source,omitempty"`
	DwellMs   *int      `gorm:"column:dwellMs" json:"dwellMs,omitempty"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
}

func (PostView) TableName() string { return "post_views" }
