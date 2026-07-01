from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
import razorpay
import os
import uuid
import hmac
import hashlib
import logging

from app.db_pool import get_db_connection

router = APIRouter(prefix="/checkout", tags=["Checkout"])
logger = logging.getLogger("checkout")

class CreateOrderRequest(BaseModel):
    plan_type: str
    billing_cycle: str
    amount_usd: float
    user_id: str
    country: str = None

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    user_id: str
    product_id: str
    billing_cycle: str = "MONTHLY"
    country: str
    usd_price: float
    exchange_rate_used: float = None
    final_amount: float
    currency: str

class PreviewRequest(BaseModel):
    amount_usd: float
    user_id: str = None
    country: str = None

@router.post("/preview")
async def preview_checkout(req: PreviewRequest, request: Request):
    if req.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="Amount must be > 0")

    country = req.country
    if not country and req.user_id:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT country FROM users WHERE id = %s", (req.user_id,))
                row = cur.fetchone()
                if row and row[0]:
                    country = row[0]
                
    if not country:
        country = request.headers.get("CF-IPCountry", "US")

    currency = "USD"
    final_amount = req.amount_usd
    exchange_rate = None

    if country == "IN":
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT rate FROM exchange_rates WHERE base_currency = 'USD' AND target_currency = 'INR' LIMIT 1")
                row = cur.fetchone()
                exchange_rate = row[0] if row else 84.50
        
        final_amount = req.amount_usd * exchange_rate
        currency = "INR"

    return {
        "original_usd": req.amount_usd,
        "final_amount": final_amount,
        "currency": currency,
        "exchange_rate": exchange_rate,
        "country": country
    }

@router.post("/create-order")
async def create_order(req: CreateOrderRequest, request: Request):
    if req.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="Amount must be > 0")

    # 1. Determine user country
    country = req.country
    if not country and req.user_id:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT country FROM users WHERE id = %s", (req.user_id,))
                row = cur.fetchone()
                if row and row[0]:
                    country = row[0]
                
    if not country:
        # Fallback to IP geolocation
        country = request.headers.get("CF-IPCountry", "US")

    # 2. Conversion Logic
    currency = "USD"
    amount_smallest_unit = int(req.amount_usd * 100)
    exchange_rate = None

    if country == "IN":
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT rate FROM exchange_rates WHERE base_currency = 'USD' AND target_currency = 'INR' LIMIT 1")
                row = cur.fetchone()
                exchange_rate = row[0] if row else 84.50
        
        inr_price = req.amount_usd * exchange_rate
        amount_smallest_unit = int(inr_price * 100)
        currency = "INR"
    
    if amount_smallest_unit < 100:
        amount_smallest_unit = 100

    # 3. Create Razorpay order
    key_id = os.environ.get("NEXT_PUBLIC_RAZORPAY_KEY_ID")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    
    if not key_id or not key_secret:
        raise HTTPException(status_code=500, detail="Razorpay credentials not configured")
        
    client = razorpay.Client(auth=(key_id, key_secret))
    
    try:
        order = client.order.create({
            "amount": amount_smallest_unit,
            "currency": currency,
            "receipt": f"rcpt_{req.plan_type}_{uuid.uuid4().hex[:8]}"
        })
        
        return {
            "order_id": order["id"],
            "currency": order["currency"],
            "amount": order["amount"],
            "original_usd": req.amount_usd,
            "exchange_rate": exchange_rate,
            "country": country
        }
    except Exception as e:
        logger.error(f"Razorpay error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create Razorpay order")

@router.post("/verify-payment")
async def verify_payment(req: VerifyPaymentRequest):
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    if not key_secret:
        raise HTTPException(status_code=500, detail="Server error")
        
    body = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    expected_signature = hmac.new(
        bytes(key_secret, 'utf-8'),
        msg=bytes(body, 'utf-8'),
        digestmod=hashlib.sha256
    ).hexdigest()
    
    if expected_signature != req.razorpay_signature:
        raise HTTPException(status_code=400, detail="Invalid signature")
        
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Log the payment
            cur.execute("""
                INSERT INTO payment_logs (
                    id, user_id, product_id, country, currency, 
                    usd_price, exchange_rate_used, final_amount, 
                    razorpay_order_id, payment_status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'COMPLETED')
            """, (
                str(uuid.uuid4())[:30], req.user_id, req.product_id, req.country,
                req.currency, req.usd_price, req.exchange_rate_used,
                req.final_amount, req.razorpay_order_id
            ))
            
            # Fetch plan configuration
            cur.execute("""
                SELECT credits, has_extension_access, has_multi_profile, has_unlimited_resumes 
                FROM plan_configs WHERE plan_type = %s LIMIT 1
            """, (req.product_id,))
            
            plan_row = cur.fetchone()
            
            if plan_row:
                credits = plan_row[0]
                has_ext = plan_row[1]
                has_multi = plan_row[2]
                has_unlimited = plan_row[3]
                
                interval = "1 month"
                if req.billing_cycle == "SEMI_ANNUAL":
                    interval = "6 months"
                elif req.billing_cycle == "ANNUAL":
                    interval = "1 year"
                    
                cur.execute(f"""
                    INSERT INTO subscriptions (
                        user_id, plan_type, billing_cycle, credits_remaining, credits_total,
                        has_extension_access, has_multi_profile, has_unlimited_resumes,
                        starts_at, expires_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW() + interval '{interval}', NOW()
                    ) ON CONFLICT (user_id) DO UPDATE SET
                        plan_type = EXCLUDED.plan_type,
                        billing_cycle = EXCLUDED.billing_cycle,
                        credits_remaining = EXCLUDED.credits_remaining,
                        credits_total = EXCLUDED.credits_total,
                        has_extension_access = EXCLUDED.has_extension_access,
                        has_multi_profile = EXCLUDED.has_multi_profile,
                        has_unlimited_resumes = EXCLUDED.has_unlimited_resumes,
                        starts_at = EXCLUDED.starts_at,
                        expires_at = EXCLUDED.expires_at,
                        updated_at = EXCLUDED.updated_at
                """, (
                    req.user_id, req.product_id, req.billing_cycle, credits, credits,
                    has_ext, has_multi, has_unlimited
                ))
        conn.commit()
        
    return {"success": True, "message": "Payment verified and logged"}
