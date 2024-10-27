# app/models/schemas.py
from pydantic import BaseModel
from typing import Optional, Dict, List,Union, Any

class Trade(BaseModel):
    mint: str
    traderPublicKey: str
    txType: str
    tokenAmount: float
    vSolInBondingCurve: float
    vTokensInBondingCurve: float
    timestamp: int
    marketCapSol: float
    holdersCount: int

class TokenData(BaseModel):
    mint: str
    initialBuySol: float
    initialBuyPercent: float
    liquidity: float
    marketCap: float

class Analysis(BaseModel):
    early_signs: Dict[str, Union[float, int]]
    feature_values: Dict[str, float]

class PredictionResponse(BaseModel):
    isPromising: bool
    probability: float
    analysis: Analysis
class PredictionRequest(BaseModel):
    trades: List[Trade]
    token: TokenData