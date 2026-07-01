from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
import logging
import uuid

from app.db_pool import get_db_connection

router = APIRouter(prefix="/admin/exchange-rate", tags=["Admin Exchange Rate"])
logger = logging.getLogger("admin_exchange_rate")

class ExchangeRateUpdate(BaseModel):
    rate: float

@router.get("")
async def get_exchange_rate():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT rate, updated_at FROM exchange_rates WHERE base_currency = 'USD' AND target_currency = 'INR' LIMIT 1")
            row = cur.fetchone()
            if row:
                return {"rate": row[0], "updated_at": row[1]}
            return {"rate": 84.50, "updated_at": None} # Default fallback

@router.put("")
async def update_exchange_rate(data: ExchangeRateUpdate, request: Request):
    if data.rate <= 0:
        raise HTTPException(status_code=400, detail="Rate must be greater than 0")
    
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM exchange_rates WHERE base_currency = 'USD' AND target_currency = 'INR'")
            row = cur.fetchone()
            if row:
                cur.execute(
                    "UPDATE exchange_rates SET rate = %s, updated_at = NOW() WHERE id = %s",
                    (data.rate, row[0])
                )
            else:
                cur.execute(
                    "INSERT INTO exchange_rates (id, base_currency, target_currency, rate) VALUES (%s, 'USD', 'INR', %s)",
                    (str(uuid.uuid4())[:30], data.rate)
                )
        conn.commit()
    
    return {"message": "Exchange rate updated successfully", "rate": data.rate}
