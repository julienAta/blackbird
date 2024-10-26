# app/api/endpoints/predict.py
from fastapi import APIRouter, HTTPException
from typing import List, Dict
from app.models.schemas import Trade, PredictionResponse, TokenData
from app.ml.predictor import QuickTokenPredictor
import pandas as pd
import traceback

router = APIRouter(tags=["predictions"])
predictor = QuickTokenPredictor()

def validate_dataframe(df: pd.DataFrame, required_cols: List[str], name: str) -> None:
    """Validate DataFrame has required columns"""
    print(f"\nValidating {name} DataFrame:")
    print(f"Available columns: {df.columns.tolist()}")
    print(f"Required columns: {required_cols}")
    
    df_cols = set(df.columns.str.lower())
    req_cols = set(col.lower() for col in required_cols)
    missing = [col for col in required_cols if col.lower() not in df_cols]
    
    if missing:
        print(f"Missing columns: {missing}")
        print(f"First row data: {df.iloc[0].to_dict() if len(df) > 0 else 'No data'}")
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns in {name}: {missing}"
        )

@router.post("/train")
async def train_model(trades: List[Dict], tokens: List[Dict]):
    """Train the model with historical data"""
    try:
        print(f"\nReceived training data:")
        print(f"Trades count: {len(trades)}")
        print(f"Tokens count: {len(tokens)}")
        
        if len(trades) == 0 or len(tokens) == 0:
            raise HTTPException(status_code=400, detail="Empty dataset provided")
            
        print("\nSample trade:", trades[0] if trades else "No trades")
        print("\nSample token:", tokens[0] if tokens else "No tokens")
        
        # Convert to DataFrames
        trades_df = pd.DataFrame(trades)
        tokens_df = pd.DataFrame(tokens)
        
        # Validate required columns
        required_trade_cols = [
            'mint', 'traderPublicKey', 'txType', 'tokenAmount',
            'vSolInBondingCurve', 'vTokensInBondingCurve', 'timestamp'
        ]
        required_token_cols = [
            'mint', 'initialBuySol', 'initialBuyPercent', 'liquidity', 'marketCap'
        ]
        
        validate_dataframe(trades_df, required_trade_cols, "trades")
        validate_dataframe(tokens_df, required_token_cols, "tokens")
        
        print("\nStarting model training...")
        predictor.train(trades_df, tokens_df)
        print("Training complete!")
        
        return {"status": "Model trained successfully"}
        
    except Exception as e:
        print("\nTraining error:", str(e))
        print("Traceback:", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Training failed: {str(e)}"
        )
@router.post("/predict", response_model=PredictionResponse)
async def predict_token(trades: List[Trade], token: TokenData):
    try:
        if not trades:
            raise HTTPException(status_code=400, detail="No trades provided")
        
        token_dict = token.dict()
        is_promising, probability = predictor.predict(trades, token_dict)
        
        return PredictionResponse(
            isPromising=is_promising,
            probability=probability
        )
    except Exception as e:
        print("Prediction error:", str(e))
        print("Traceback:", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )