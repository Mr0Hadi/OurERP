package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID     int    `json:"user_id"`
	Role       string `json:"role"`
	Department string `json:"department"`
	jwt.RegisteredClaims
}

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "هدی احراز هویت یافت نشد"})
			return
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "هدی احراز هویت نامعتبر است"})
			return
		}
		tokenStr := parts[1]
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "توکن نامعتبر یا منقضی شده است"})
			return
		}
		c.Set("user_id", claims.UserID)
		c.Set("user_role", claims.Role)
		c.Set("department", claims.Department)
		c.Next()
	}
}

func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("user_role")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "دسترسی غیرمجاز"})
			return
		}
		roleStr := role.(string)
		for _, allowed := range allowedRoles {
			if roleStr == allowed {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "دسترسی غیرمجاز: سطح دسترسی کافی نیست"})
	}
}

func GenerateToken(userID int, role, department, secret string, expiry time.Duration) (string, error) {
	claims := &Claims{
		UserID:     userID,
		Role:       role,
		Department: department,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
