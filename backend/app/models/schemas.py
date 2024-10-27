# app/models/schemas.py
from pydantic import BaseModel
from typing import Optional, Dict, List, Any

class Trade(BaseModel):
    mint: str
    traderPublicKey: str
    txType: str
    tokenAmount: float
    vSolInBondingCurve: float
    vTokensInBondingCurve: float
    timestamp: int
    marketCapSol: float

class TokenData(BaseModel):
    mint: str
    initialBuySol: float
    initialBuyPercent: float
    liquidity: float
    marketCap: float

class PredictionResponse(BaseModel):
    isPromising: bool
    probability: float
    analysis: Dict[str, Any]
class PredictionRequest(BaseModel):
    trades: List[Trade]
    token: TokenData