package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port           string
	DatabaseURL    string
	JWTSecret      string
	CookieName     string
	CookieMaxAge   int
	CORSOrigin     string
}

// Load reads environment variables, falling back to .env-style defaults when missing.
// Compatible with the existing Next.js backend's .env file.
func Load() *Config {
	return &Config{
		Port:         getEnv("PORT", "8080"),
		DatabaseURL:  mustEnv("DATABASE_URL", "mysql://root:root123456@127.0.0.1:3306/plants_community"),
		JWTSecret:    mustEnv("JWT_SECRET", "rouyou-community-demo-secret-please-change-this-in-production-xxx"),
		CookieName:   getEnv("AUTH_COOKIE_NAME", "rouyou_token"),
		CookieMaxAge: getEnvInt("AUTH_COOKIE_MAX_AGE", 2592000),
		CORSOrigin:   getEnv("CORS_ORIGIN", "http://localhost:3000"),
	}
}

// ConvertDatabaseURL converts Prisma-style `mysql://user:pass@host:port/db`
// to GORM DSN: `user:pass@tcp(host:port)/db?parseTime=true&charset=utf8mb4`
func (c *Config) MySQLDSN() string {
	u := c.DatabaseURL
	// strip mysql://
	if len(u) > 8 && u[:8] == "mysql://" {
		u = u[8:]
	}
	// split user:pass@host:port/db
	var userPass, hostPortDB string
	for i := len(u) - 1; i >= 0; i-- {
		if u[i] == '@' {
			userPass = u[:i]
			hostPortDB = u[i+1:]
			break
		}
	}
	if hostPortDB == "" {
		hostPortDB = u
	}
	var hostPort, db string
	for i := 0; i < len(hostPortDB); i++ {
		if hostPortDB[i] == '/' {
			hostPort = hostPortDB[:i]
			db = hostPortDB[i+1:]
			break
		}
	}
	// strip query string if present
	if idx := indexOf(db, '?'); idx >= 0 {
		db = db[:idx]
	}
	if userPass == "" || hostPort == "" || db == "" {
		panic(fmt.Sprintf("invalid DATABASE_URL: %s", c.DatabaseURL))
	}
	return fmt.Sprintf("%s@tcp(%s)/%s?parseTime=true&charset=utf8mb4&loc=UTC",
		userPass, hostPort, db)
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func mustEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func indexOf(s string, c byte) int {
	for i := 0; i < len(s); i++ {
		if s[i] == c {
			return i
		}
	}
	return -1
}
