# app/models/schemas.py
from pydantic import BaseModel
from typing import List, Optional

class Trade(BaseModel):
    mint: str
    traderPublicKey: str
    txType: str
    tokenAmount: float
    vSolInBondingCurve: float
    vTokensInBondingCurve: float
    timestamp: int
    marketCapSol: Optional[float] = None

class TokenData(BaseModel):
    mint: str
    initialBuySol: float
    initialBuyPercent: float
    liquidity: float
    marketCap: Optional[float] = None

class PredictionResponse(BaseModel):
    isPromising: bool
    probability: float

class PredictionRequest(BaseModel):
    trades: List[Trade]
    token: TokenData