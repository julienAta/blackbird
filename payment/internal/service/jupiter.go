package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type JupiterService struct {
	baseURL string
}

type SwapQuote struct {
	InputMint   string `json:"inputMint"`
	OutputMint  string `json:"outputMint"`
	Amount      string `json:"amount"`
	SlippageBps int    `json:"slippageBps"`
}

type SwapRequest struct {
	QuoteResponse   json.RawMessage `json:"quoteResponse"`
	UserPublicKey   string          `json:"userPublicKey"`
	DynamicSlippage struct {
		MaxBps int `json:"maxBps"`
	} `json:"dynamicSlippage"`
}

func NewJupiterService() *JupiterService {
	return &JupiterService{
		baseURL: "https://quote-api.jup.ag/v6",
	}
}

func (s *JupiterService) GetQuote(quote SwapQuote) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/quote?inputMint=%s&outputMint=%s&amount=%s&slippageBps=%d",
		s.baseURL,
		quote.InputMint,
		quote.OutputMint,
		quote.Amount,
		quote.SlippageBps,
	)

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to get quote: %w", err)
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return result, nil
}

func (s *JupiterService) GetSwapTransaction(req SwapRequest) (map[string]interface{}, error) {
	requestBody := map[string]interface{}{
		"quoteResponse":   req.QuoteResponse,
		"userPublicKey":   req.UserPublicKey,
		"dynamicSlippage": map[string]int{"maxBps": 300},
		"wrapAndUnwrapSol": true,
		"computeUnitPriceMicroLamports": "auto",
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(
		s.baseURL+"/swap",
		"application/json",
		bytes.NewBuffer(jsonBody),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get swap transaction: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return result, nil
}