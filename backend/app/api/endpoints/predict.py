from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import Trade, PredictionResponse
from app.ml.predictor import TokenPredictor

router = APIRouter(tags=["predictions"])
predictor = TokenPredictor()

@router.post("/predict", response_model=PredictionResponse)
async def predict_token(trades: List[Trade]):
    """
    Predict if a token will reach 60k market cap based on its trades
    """
    if not trades:
        raise HTTPException(status_code=400, detail="No trades provided")
    
    is_promising, probability = predictor.predict(trades)
    return PredictionResponse(isPromising=is_promising, probability=probability)