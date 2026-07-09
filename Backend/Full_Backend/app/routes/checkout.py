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

# ── Internal auth ─────────────────────────────────────────────────────
# This backend is exposed publicly (api.vignova.io). The checkout endpoints
# create Razorpay orders and, on verify, grant paid subscriptions — so they
# must never be callable by an anonymous internet client. Every request has
# to carry the shared internal secret, which the Next.js proxy injects from
# its own server-side session. Same guard as /api/ats/ingest and
# /admin/exchange-rate.
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")


def _auth_ok(request: Request) -> bool:
    key = request.headers.get("X-API-Key") or request.headers.get("x-internal-key")
    return bool(INTERNAL_API_KEY) and key == INTERNAL_API_KEY


def _require_internal(request: Request):
    if not _auth_ok(request):
        raise HTTPException(status_code=403, detail="Forbidden")


# ── Pricing ───────────────────────────────────────────────────────────
# The server is the ONLY authority on price. Clients never get to say what a
# plan costs — they only pick a plan_type and billing_cycle, and the server
# derives the amount from plan_configs. These discounts must match the ones
# shown in the billing UI (BILLING_CYCLES in app/dashboard/billing/page.tsx).
BILLING_CYCLES = {
    "MONTHLY": {"discount": 0.0, "months": 1, "interval": "1 month"},
    "SEMI_ANNUAL": {"discount": 0.10, "months": 6, "interval": "6 months"},
    "ANNUAL": {"discount": 0.20, "months": 12, "interval": "1 year"},
}

# Fallback prices (USD/month) if plan_configs is empty — mirrors the
# FALLBACK_PLANS in app/api/plans/route.ts.
FALLBACK_MONTHLY_PRICE = {"FREE": 0.0, "PRO": 13.99, "PREMIUM": 29.99}


def _plan_monthly_price(cur, plan_type: str):
    cur.execute("SELECT monthly_price FROM plan_configs WHERE plan_type = %s LIMIT 1", (plan_type,))
    row = cur.fetchone()
    if row and row[0] is not None:
        return float(row[0])
    return FALLBACK_MONTHLY_PRICE.get(plan_type)


def _compute_usd_total(cur, plan_type: str, billing_cycle: str) -> float:
    """Authoritative USD total for a plan + cycle. Raises on invalid input."""
    cycle = BILLING_CYCLES.get(billing_cycle)
    if not cycle:
        raise HTTPException(status_code=400, detail="Invalid billing cycle")

    monthly = _plan_monthly_price(cur, plan_type)
    if monthly is None:
        raise HTTPException(status_code=400, detail="Invalid plan type")
    if monthly <= 0:
        raise HTTPException(status_code=400, detail="This plan is not purchasable")

    discounted_monthly = monthly * (1 - cycle["discount"])
    total = discounted_monthly * cycle["months"]
    return round(total, 2)


def _resolve_country(cur, req_country, user_id, request: Request) -> str:
    country = req_country
    if not country and user_id:
        cur.execute("SELECT country FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if row and row[0]:
            country = row[0]
    if not country:
        country = request.headers.get("CF-IPCountry", "US")
    return country


def _inr_rate(cur) -> float:
    cur.execute(
        "SELECT rate FROM exchange_rates WHERE base_currency = 'USD' AND target_currency = 'INR' LIMIT 1"
    )
    row = cur.fetchone()
    return float(row[0]) if row else 84.50


class CreateOrderRequest(BaseModel):
    plan_type: str
    billing_cycle: str
    # amount_usd is accepted for backward compatibility but IGNORED — the
    # server always recomputes the authoritative price from plan_configs.
    amount_usd: float = 0.0
    user_id: str
    country: str = None


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    user_id: str
    # The remaining fields are accepted for backward compatibility but are
    # NOT trusted — the plan, amount and currency are read back from the
    # Razorpay order the server itself created.
    product_id: str = None
    billing_cycle: str = "MONTHLY"
    country: str = None
    usd_price: float = None
    exchange_rate_used: float = None
    final_amount: float = None
    currency: str = None


class PreviewRequest(BaseModel):
    amount_usd: float
    user_id: str = None
    country: str = None


@router.post("/preview")
async def preview_checkout(req: PreviewRequest, request: Request):
    _require_internal(request)

    if req.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="Amount must be > 0")

    currency = "USD"
    final_amount = req.amount_usd
    exchange_rate = None

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            country = _resolve_country(cur, req.country, req.user_id, request)
            if country == "IN":
                exchange_rate = _inr_rate(cur)
                final_amount = req.amount_usd * exchange_rate
                currency = "INR"

    return {
        "original_usd": req.amount_usd,
        "final_amount": final_amount,
        "currency": currency,
        "exchange_rate": exchange_rate,
        "country": country,
    }


@router.post("/create-order")
async def create_order(req: CreateOrderRequest, request: Request):
    _require_internal(request)

    key_id = os.environ.get("NEXT_PUBLIC_RAZORPAY_KEY_ID")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    if not key_id or not key_secret:
        raise HTTPException(status_code=500, detail="Razorpay credentials not configured")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Authoritative price — client-sent amount_usd is ignored.
            usd_total = _compute_usd_total(cur, req.plan_type, req.billing_cycle)
            country = _resolve_country(cur, req.country, req.user_id, request)

            currency = "USD"
            exchange_rate = None
            amount_smallest_unit = int(round(usd_total * 100))

            if country == "IN":
                exchange_rate = _inr_rate(cur)
                inr_price = usd_total * exchange_rate
                amount_smallest_unit = int(round(inr_price * 100))
                currency = "INR"

    if amount_smallest_unit < 100:
        amount_smallest_unit = 100

    client = razorpay.Client(auth=(key_id, key_secret))

    try:
        order = client.order.create({
            "amount": amount_smallest_unit,
            "currency": currency,
            "receipt": f"rcpt_{req.plan_type}_{uuid.uuid4().hex[:8]}",
            # Bind the plan to the order server-side. At verify time we read
            # these notes back from Razorpay instead of trusting the client,
            # so tampering with the checkout URL / request body can't change
            # which plan gets granted.
            "notes": {
                "plan_type": req.plan_type,
                "billing_cycle": req.billing_cycle,
                "user_id": req.user_id,
                "usd_total": f"{usd_total:.2f}",
            },
        })

        return {
            "order_id": order["id"],
            "currency": order["currency"],
            "amount": order["amount"],
            "original_usd": usd_total,
            "exchange_rate": exchange_rate,
            "country": country,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Razorpay error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create Razorpay order")


@router.post("/verify-payment")
async def verify_payment(req: VerifyPaymentRequest, request: Request):
    _require_internal(request)

    key_id = os.environ.get("NEXT_PUBLIC_RAZORPAY_KEY_ID")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    if not key_secret or not key_id:
        raise HTTPException(status_code=500, detail="Server error")

    # 1. Verify the signature — proves the payment notification is authentic.
    body = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    expected_signature = hmac.new(
        bytes(key_secret, "utf-8"),
        msg=bytes(body, "utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    # 2. Read the order + payment back from Razorpay. This is the source of
    #    truth for plan, amount and paid status — never the client body.
    client = razorpay.Client(auth=(key_id, key_secret))
    try:
        order = client.order.fetch(req.razorpay_order_id)
        payment = client.payment.fetch(req.razorpay_payment_id)
    except Exception as e:
        logger.error(f"Razorpay fetch error: {e}")
        raise HTTPException(status_code=502, detail="Could not verify payment with gateway")

    # Payment must actually be captured/authorized and belong to this order.
    if payment.get("order_id") != req.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Payment does not match order")
    if payment.get("status") not in ("captured", "authorized"):
        raise HTTPException(status_code=402, detail="Payment not completed")
    # Amount actually paid must equal the amount we asked for.
    if int(payment.get("amount", -1)) != int(order.get("amount", -2)):
        raise HTTPException(status_code=402, detail="Paid amount mismatch")

    notes = order.get("notes") or {}
    plan_type = notes.get("plan_type")
    billing_cycle = notes.get("billing_cycle", "MONTHLY")
    order_user_id = notes.get("user_id")

    if not plan_type or plan_type not in ("PRO", "PREMIUM"):
        raise HTTPException(status_code=400, detail="Order is missing a valid plan")

    # The order was created for a specific user; the caller must be that user.
    if order_user_id and req.user_id and order_user_id != req.user_id:
        logger.warning("verify-payment user mismatch: order=%s caller=%s", order_user_id, req.user_id)
        raise HTTPException(status_code=403, detail="Order does not belong to this user")

    grant_user_id = order_user_id or req.user_id
    if not grant_user_id:
        raise HTTPException(status_code=400, detail="Missing user")

    cycle = BILLING_CYCLES.get(billing_cycle, BILLING_CYCLES["MONTHLY"])
    interval = cycle["interval"]
    paid_currency = order.get("currency", "USD")
    paid_amount = int(order.get("amount", 0)) / 100.0

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # 3. Idempotency — a given order can only ever be redeemed once,
            #    even if the verify call is replayed.
            cur.execute(
                "SELECT 1 FROM payment_logs WHERE razorpay_order_id = %s LIMIT 1",
                (req.razorpay_order_id,),
            )
            if cur.fetchone():
                return {"success": True, "message": "Payment already processed"}

            cur.execute(
                """
                INSERT INTO payment_logs (
                    id, user_id, product_id, country, currency,
                    usd_price, exchange_rate_used, final_amount,
                    razorpay_order_id, payment_status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'COMPLETED')
                """,
                (
                    str(uuid.uuid4())[:30], grant_user_id, plan_type, req.country,
                    paid_currency, notes.get("usd_total"), req.exchange_rate_used,
                    paid_amount, req.razorpay_order_id,
                ),
            )

            cur.execute(
                """
                SELECT credits, has_extension_access, has_multi_profile, has_unlimited_resumes
                FROM plan_configs WHERE plan_type = %s LIMIT 1
                """,
                (plan_type,),
            )
            plan_row = cur.fetchone()
            if not plan_row:
                raise HTTPException(status_code=500, detail="Plan config missing")

            credits, has_ext, has_multi, has_unlimited = plan_row

            cur.execute(
                f"""
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
                """,
                (
                    grant_user_id, plan_type, billing_cycle, credits, credits,
                    has_ext, has_multi, has_unlimited,
                ),
            )
        conn.commit()

    return {"success": True, "message": "Payment verified and logged"}
