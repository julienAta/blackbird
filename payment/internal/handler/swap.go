package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jjlabs/blackbird/payment/internal/service"
)

type SwapHandler struct {
	jupiterService *service.JupiterService
}

func NewSwapHandler(jupiterService *service.JupiterService) *SwapHandler {
	return &SwapHandler{
		jupiterService: jupiterService,
	}
}

func (h *SwapHandler) GetQuote(c *gin.Context) {
	var quote service.SwapQuote
	if err := c.BindJSON(&quote); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.jupiterService.GetQuote(quote)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *SwapHandler) GetSwapTransaction(c *gin.Context) {
	var req service.SwapRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.jupiterService.GetSwapTransaction(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}