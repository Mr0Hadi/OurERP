package handler

import (
	"math"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/user/wms-backend/internal/model"
)

type APIResponse struct {
	Data  interface{} `json:"data,omitempty"`
	Meta  interface{} `json:"meta,omitempty"`
	Error string      `json:"error,omitempty"`
}

func respondJSON(c *gin.Context, status int, data interface{}) {
	c.JSON(status, APIResponse{Data: data})
}

func respondJSONWithMeta(c *gin.Context, status int, data interface{}, meta interface{}) {
	c.JSON(status, APIResponse{Data: data, Meta: meta})
}

func respondError(c *gin.Context, status int, message string) {
	c.AbortWithStatusJSON(status, APIResponse{Error: message})
}

func parsePagination(c *gin.Context) model.PaginationParams {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return model.PaginationParams{Page: page, PageSize: pageSize}
}

func paginatedMeta(page, pageSize, totalCount int) map[string]int {
	return map[string]int{
		"page":       page,
		"pageSize":   pageSize,
		"totalCount": totalCount,
		"totalPages": int(math.Ceil(float64(totalCount) / float64(pageSize))),
	}
}

func parseIntParam(c *gin.Context, name string) (int, error) {
	return strconv.Atoi(c.Param(name))
}

func getUserID(c *gin.Context) int {
	uid, _ := c.Get("user_id")
	if uid == nil {
		return 0
	}
	return uid.(int)
}

func getUserRole(c *gin.Context) string {
	role, _ := c.Get("user_role")
	if role == nil {
		return ""
	}
	return role.(string)
}
