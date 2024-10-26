from pydantic import BaseModel
from typing import List

class Trade(BaseModel):
    signature: str
    mint: str
    traderPublicKey: str
    txType: str
    tokenAmount: float
    vSolInBondingCurve: float
    vTokensInBondingCurve: float
    timestamp: int

class PredictionResponse(BaseModel):
    isPromising: bool
    probability: float

class ErrorResponse(BaseModel):
    detail: str