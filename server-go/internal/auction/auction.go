// Package auction 对齐 Next.js src/lib/auction.ts 的拍卖状态机。
// 策略:lazy 推进 — 任何读写拍卖的请求先调 AdvanceState。
package auction

import (
	"fmt"
	"log"
	"time"

	"plants-community-server/internal/models"

	"gorm.io/gorm"
)

const DefaultPaymentDeadlineHours = 24

// AdvanceState 把所有过期的 live 拍卖收尾,同时把 scheduled → live,
// 并对「胜出但 24h 未付款」的订单执行违约处理。
// 如 auctionID != "",则只处理该场。
func AdvanceState(db *gorm.DB, auctionID string) {
	now := time.Now()

	// 1) scheduled → live
	q := db.Model(&models.Auction{}).
		Where("status = ? AND startAt <= ?", "scheduled", now)
	if auctionID != "" {
		q = q.Where("id = ?", auctionID)
	}
	q.Update("status", "live")

	// 2) live → finished(决出胜者 / 流拍)
	type row struct{ ID string }
	var expired []row
	qe := db.Model(&models.Auction{}).
		Where("status = ? AND endAt <= ?", "live", now)
	if auctionID != "" {
		qe = qe.Where("id = ?", auctionID)
	}
	qe.Select("id").Scan(&expired)
	for _, r := range expired {
		if err := finalize(db, r.ID); err != nil {
			log.Printf("[auction] finalize %s failed: %v", r.ID, err)
		}
	}

	// 3) 违约扫描
	enforceDefaulted(db, auctionID)
}

// finalize 拍卖结束处理
func finalize(db *gorm.DB, auctionID string) error {
	return db.Transaction(func(tx *gorm.DB) error {
		var a models.Auction
		if err := tx.Where("id = ?", auctionID).First(&a).Error; err != nil {
			return err
		}
		if a.Status != "live" {
			return nil
		}

		// 查最高出价
		var topBid models.Bid
		hasBid := tx.Where("auctionId = ?", auctionID).
			Order("amount DESC, createdAt ASC").First(&topBid).Error == nil

		// 保留价校验
		reached := a.ReservePrice == nil || (hasBid && topBid.Amount >= *a.ReservePrice)
		now := time.Now()

		if !hasBid || !reached {
			// 流拍
			tx.Model(&a).Updates(map[string]any{
				"status": "finished", "result": "no_bidder", "actualEndAt": &now,
			})
			refundAllDeposits(tx, auctionID)
			return nil
		}

		// 成交
		winnerID := topBid.BidderID
		orderID := genCuidAuction()
		orderNo := genAuctionOrderNo()
		order := models.Order{
			ID: orderID, OrderNo: orderNo,
			Source: "auction", AuctionID: &a.ID, ProductID: nil,
			BuyerID: winnerID, SellerID: &a.SellerID,
			Quantity: 1, UnitPrice: topBid.Amount,
			TotalPrice: topBid.Amount, DepositPaid: a.DepositAmount,
			PointsBackTotal: 0, Status: "pending_payment",
			CreatedAt: now, UpdatedAt: now,
		}
		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		tx.Model(&a).Updates(map[string]any{
			"status": "finished", "result": "won",
			"winnerId":       winnerID,
			"winningOrderId": orderID,
			"actualEndAt":    &now,
			"currentPrice":   topBid.Amount,
		})

		// 胜者保证金标记为 applied
		tx.Model(&models.AuctionParticipant{}).
			Where("auctionId = ? AND userId = ? AND depositStatus = ?",
				auctionID, winnerID, "held").
			Update("depositStatus", "applied")

		// 其他人退保证金
		refundOthers(tx, auctionID, winnerID)

		// 通知
		balance := topBid.Amount - a.DepositAmount
		tx.Create(&models.Notification{
			ID: genCuidAuction(), RecipientID: winnerID, Type: "system",
			Text: fmt.Sprintf("🎉 恭喜你以 ¥%.2f 的价格拍下了「%s」,请在 24 小时内支付尾款 ¥%.2f",
				float64(topBid.Amount)/100, a.Title, float64(balance)/100),
			Link:      ptr("/orders"),
			CreatedAt: now,
		})
		tx.Create(&models.Notification{
			ID: genCuidAuction(), RecipientID: a.SellerID, Type: "system",
			Text:      fmt.Sprintf("🔨 你的拍卖品「%s」已成交,等待买家付款", a.Title),
			Link:      ptr("/auction/" + a.ID),
			CreatedAt: now,
		})
		return nil
	})
}

// 违约扫描
func enforceDefaulted(db *gorm.DB, auctionID string) {
	cutoff := time.Now().Add(-time.Duration(DefaultPaymentDeadlineHours) * time.Hour)
	q := db.Model(&models.Auction{}).
		Where("status = ? AND result = ? AND actualEndAt <= ?",
			"finished", "won", cutoff)
	if auctionID != "" {
		q = q.Where("id = ?", auctionID)
	}
	var rows []models.Auction
	q.Find(&rows)
	for _, a := range rows {
		if a.WinningOrderID == nil {
			continue
		}
		var o models.Order
		if db.Where("id = ?", *a.WinningOrderID).First(&o).Error != nil {
			continue
		}
		if o.Status != "pending_payment" {
			continue
		}
		defaultOne(db, &a, &o)
	}
}

func defaultOne(db *gorm.DB, a *models.Auction, o *models.Order) {
	db.Transaction(func(tx *gorm.DB) error {
		// 拍卖 defaulted
		tx.Model(a).Update("result", "defaulted")
		// 订单取消
		now := time.Now()
		tx.Model(o).Updates(map[string]any{
			"status": "cancelled", "cancelledAt": &now,
			"refundReason": "胜出者 24 小时内未付款",
		})
		// 保证金没收
		if a.WinnerID != nil {
			tx.Model(&models.AuctionParticipant{}).
				Where("auctionId = ? AND userId = ? AND depositStatus = ?",
					a.ID, *a.WinnerID, "applied").
				Update("depositStatus", "forfeited")

			tx.Create(&models.Notification{
				ID: genCuidAuction(), RecipientID: *a.WinnerID, Type: "system",
				Text: fmt.Sprintf("❗ 你拍下的「%s」未在 24 小时内完成付款,订单已取消,保证金 ¥%.2f 已被没收",
					a.Title, float64(a.DepositAmount)/100),
				Link: ptr("/auction/" + a.ID), CreatedAt: now,
			})
		}
		tx.Create(&models.Notification{
			ID: genCuidAuction(), RecipientID: a.SellerID, Type: "system",
			Text:      fmt.Sprintf("⚠️ 你的拍卖品「%s」胜出者未在 24 小时内付款,订单已取消", a.Title),
			Link:      ptr("/auction/" + a.ID),
			CreatedAt: now,
		})
		return nil
	})
}

// refundAllDeposits 流拍时全退
func refundAllDeposits(tx *gorm.DB, auctionID string) {
	var ps []models.AuctionParticipant
	tx.Where("auctionId = ? AND depositStatus = ?", auctionID, "held").Find(&ps)
	for _, p := range ps {
		refundOne(tx, &p)
	}
}

// refundOthers 成交时除胜者外全退
func refundOthers(tx *gorm.DB, auctionID, winnerID string) {
	var ps []models.AuctionParticipant
	tx.Where("auctionId = ? AND depositStatus = ? AND userId <> ?",
		auctionID, "held", winnerID).Find(&ps)
	for _, p := range ps {
		refundOne(tx, &p)
	}
}

// refundOne 退保证金:标记 refunded,等值钻石回到账户,发通知
func refundOne(tx *gorm.DB, p *models.AuctionParticipant) {
	tx.Model(p).Update("depositStatus", "refunded")
	// 1元 = 100 钻石(与 TS 版一致)
	pts := p.DepositAmount / 100 * 100
	if pts < 1 {
		pts = 1
	}
	tx.Model(&models.User{}).Where("id = ?", p.UserID).
		UpdateColumn("pointsBalance", gorm.Expr("pointsBalance + ?", pts))
	var u models.User
	tx.Where("id = ?", p.UserID).First(&u)
	tx.Create(&models.PointsLedger{
		ID: genCuidAuction(), UserID: p.UserID, Type: "admin",
		Delta: pts, Balance: u.PointsBalance,
		RefType: ptr("auction_deposit_refund"), RefID: ptr(p.ID),
		Remark:    ptr(fmt.Sprintf("拍卖保证金退还(¥%.2f)", float64(p.DepositAmount)/100)),
		CreatedAt: time.Now(),
	})
	tx.Create(&models.Notification{
		ID: genCuidAuction(), RecipientID: p.UserID, Type: "system",
		Text: fmt.Sprintf("💰 你的拍卖保证金 ¥%.2f 已退回(等值 %d 钻石)",
			float64(p.DepositAmount)/100, pts),
		CreatedAt: time.Now(),
	})
}

// ===== utils =====
func ptr(s string) *string { return &s }

// 为了避免循环导入,这里复写简版 cuid/orderNo
func genCuidAuction() string {
	return fmt.Sprintf("c%d%d", time.Now().UnixNano(), time.Now().Nanosecond()%10000)
}

func genAuctionOrderNo() string {
	now := time.Now()
	ymd := fmt.Sprintf("%02d%02d%02d", now.Year()%100, int(now.Month()), now.Day())
	t36 := fmt.Sprintf("%X", now.UnixNano())
	if len(t36) > 5 {
		t36 = t36[len(t36)-5:]
	}
	return "AUC" + ymd + t36 + fmt.Sprintf("%03d", now.Nanosecond()%1000)
}
