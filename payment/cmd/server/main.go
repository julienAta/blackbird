package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/jjlabs/blackbird/payment/internal/handler"
	"github.com/jjlabs/blackbird/payment/internal/service"
)

func main() {
	// Initialize services
	jupiterService := service.NewJupiterService()
	swapHandler := handler.NewSwapHandler(jupiterService)

	// Setup router
	r := gin.Default()
	
	// Routes
	r.POST("/quote", swapHandler.GetQuote)
	r.POST("/swap", swapHandler.GetSwapTransaction)

	// Get port from env
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s", port)
	r.Run(":" + port)
}