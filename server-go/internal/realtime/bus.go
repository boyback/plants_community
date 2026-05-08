// Package realtime 提供进程内 EventBus,可以推送给在线用户的 SSE 连接。
package realtime

import (
	"encoding/json"
	"sync"
	"time"
)

// Event 推给前端的事件
type Event struct {
	Type string      `json:"-"`
	At   int64       `json:"at"`
	Data interface{} `json:"data,omitempty"`
}

// Bus 进程内单例
type Bus struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan []byte]struct{}
}

var globalBus = &Bus{subscribers: make(map[string]map[chan []byte]struct{})}

// Default 全局总线
func Default() *Bus { return globalBus }

// Subscribe 订阅指定 userId,返回 channel 和取消函数
func (b *Bus) Subscribe(userID string) (chan []byte, func()) {
	ch := make(chan []byte, 32)
	b.mu.Lock()
	set, ok := b.subscribers[userID]
	if !ok {
		set = make(map[chan []byte]struct{})
		b.subscribers[userID] = set
	}
	set[ch] = struct{}{}
	b.mu.Unlock()
	return ch, func() {
		b.mu.Lock()
		if s, ok := b.subscribers[userID]; ok {
			delete(s, ch)
			if len(s) == 0 {
				delete(b.subscribers, userID)
			}
		}
		b.mu.Unlock()
		close(ch)
	}
}

// Publish 推给单个用户;离线时静默丢
func (b *Bus) Publish(userID string, ev Event) {
	if ev.At == 0 {
		ev.At = time.Now().UnixMilli()
	}
	b.mu.RLock()
	set := b.subscribers[userID]
	if len(set) == 0 {
		b.mu.RUnlock()
		return
	}
	payload := formatSSE(ev)
	for ch := range set {
		select {
		case ch <- payload:
		default:
			// 缓冲满了,丢弃这条事件给该连接(SSE 容忍丢)
		}
	}
	b.mu.RUnlock()
}

// PublishMany 多人广播
func (b *Bus) PublishMany(userIDs []string, ev Event) {
	for _, uid := range userIDs {
		b.Publish(uid, ev)
	}
}

// OnlineUsers 在线用户数(运维用)
func (b *Bus) OnlineUsers() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.subscribers)
}

func formatSSE(ev Event) []byte {
	body, _ := json.Marshal(struct {
		At   int64       `json:"at"`
		Data interface{} `json:"data,omitempty"`
	}{At: ev.At, Data: ev.Data})
	return []byte("event: " + ev.Type + "\ndata: " + string(body) + "\n\n")
}
