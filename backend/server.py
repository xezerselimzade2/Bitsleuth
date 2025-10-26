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
from apscheduler.schedulers.asyncio import AsyncIOScheduler

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'bitsleuth')]

# Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
WALLET_TRON_ADDRESS = os.environ.get('WALLET_TRON_ADDRESS', 'TSmGGiUm7EC77qfa4E6CaSFtn9GT2G5du8')
ADMIN_TELEGRAM_ID = os.environ.get('ADMIN_TELEGRAM_ID', '6393075876')
TRON_API_BASE = os.environ.get('TRON_API_BASE', 'https://api.trongrid.io')
TRON_API_KEY = os.environ.get('TRON_API_KEY', '')
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
REQUIRED_CONF = int(os.environ.get('REQUIRED_CONF', '3'))
USDT_CONTRACT_ADDRESS = os.environ.get('USDT_CONTRACT_ADDRESS', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    status: str = "pending"  # pending, confirmed, failed
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
    plan: str  # "1week", "1month", "3months"
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    actor: str
    action: str
    details: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VerifyEmailRequest(BaseModel):
    token: str

class CreateInvoiceRequest(BaseModel):
    plan: str  # "1week", "1month", "3months"

class CheckAddressRequest(BaseModel):
    address: str

class VerifyOwnershipRequest(BaseModel):
    address: str
    challenge: str
    signature: str

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
    except Exception as e:
        logger.error(f"Error sending Telegram message: {e}")

async def send_email(to_email: str, subject: str, body: str):
    # TODO: Implement with custom SMTP credentials from .env
    # For now, just log
    logger.info(f"Email would be sent to {to_email}: {subject}")

async def log_audit(actor: str, action: str, details: Dict[str, Any] = None):
    audit = AuditLog(actor=actor, action=action, details=details or {})
    doc = audit.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.audit_log.insert_one(doc)

async def get_tron_block_number() -> int:
    """Get current Tron block number"""
    headers = {"TRON-PRO-API-KEY": TRON_API_KEY} if TRON_API_KEY else {}
    url = f"{TRON_API_BASE}/wallet/getnowblock"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as resp:
                data = await resp.json()
                return data.get('block_header', {}).get('raw_data', {}).get('number', 0)
    except Exception as e:
        logger.error(f"Error getting block number: {e}")
        return 0

async def get_tron_transaction(tx_hash: str) -> Optional[dict]:
    """Get transaction details from TronGrid"""
    headers = {"TRON-PRO-API-KEY": TRON_API_KEY} if TRON_API_KEY else {}
    url = f"{TRON_API_BASE}/v1/transactions/{tx_hash}"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as resp:
                if resp.status == 200:
                    return await resp.json()
                return None
    except Exception as e:
        logger.error(f"Error fetching transaction {tx_hash}: {e}")
        return None

async def process_payment_confirmation(payment_doc: dict, current_block: int):
    """Process a payment that has enough confirmations"""
    try:
        # Begin transaction-like operation
        user_id = payment_doc['user_id']
        plan = payment_doc.get('plan', '1week')
        
        # Determine duration
        duration_map = {
            '1week': timedelta(days=7),
            '1month': timedelta(days=30),
            '3months': timedelta(days=90)
        }
        duration = duration_map.get(plan, timedelta(days=7))
        
        # Update user access
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
            
            # Mark payment as confirmed
            await db.payments.update_one(
                {"id": payment_doc['id']},
                {
                    "$set": {
                        "status": "confirmed",
                        "confirmed_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Update invoice status
            await db.invoices.update_one(
                {"id": payment_doc['invoice_id']},
                {"$set": {"status": "confirmed"}}
            )
            
            # Log audit
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
            
            # Send notifications
            await send_telegram_message(
                f"💰 <b>Payment Confirmed</b>\n"
                f"User: {user.get('email')}\n"
                f"Amount: {payment_doc['amount']} USDT\n"
                f"Plan: {plan}\n"
                f"TX: {payment_doc.get('tx_hash', 'N/A')}"
            )
            
            await send_email(
                user['email'],
                "BitSleuth Premium Activated",
                f"Your premium access has been activated until {new_access.strftime('%Y-%m-%d %H:%M:%S')} UTC"
            )
            
            logger.info(f"Payment confirmed for user {user_id}: {payment_doc['id']}")
    except Exception as e:
        logger.error(f"Error processing payment confirmation: {e}")

# ========== PAYMENT POLLER ==========
async def payment_poller():
    """Background task to check pending payments"""
    while True:
        try:
            current_block = await get_tron_block_number()
            if current_block == 0:
                await asyncio.sleep(30)
                continue
            
            # Find pending payments
            pending = await db.payments.find({"status": "pending"}).to_list(100)
            
            for payment in pending:
                if not payment.get('tx_hash'):
                    continue
                
                # Get transaction details
                tx = await get_tron_transaction(payment['tx_hash'])
                if not tx:
                    continue
                
                # Calculate confirmations
                tx_block = payment.get('tx_block', 0)
                if tx_block == 0:
                    # Extract block number from tx
                    block_number = tx.get('blockNumber', 0)
                    if block_number > 0:
                        await db.payments.update_one(
                            {"id": payment['id']},
                            {"$set": {"tx_block": block_number}}
                        )
                        tx_block = block_number
                
                if tx_block > 0:
                    confirmations = current_block - tx_block + 1
                    
                    # Update confirmations
                    await db.payments.update_one(
                        {"id": payment['id']},
                        {"$set": {"confirmations": confirmations}}
                    )
                    
                    # Check if confirmed
                    if confirmations >= REQUIRED_CONF and payment['status'] == 'pending':
                        # Verify amount
                        if payment['amount'] >= payment['expected_amount']:
                            payment['confirmations'] = confirmations
                            await process_payment_confirmation(payment, current_block)
            
            await asyncio.sleep(30)  # Check every 30 seconds
        except Exception as e:
            logger.error(f"Error in payment poller: {e}")
            await asyncio.sleep(60)

# ========== API ENDPOINTS ==========
@api_router.get("/")
async def root():
    return {"message": "BitSleuth API v1.0", "status": "operational"}

@api_router.post("/auth/register")
async def register(data: UserRegister, background_tasks: BackgroundTasks):
    # Check if user exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=data.email,
        is_admin=(data.email == "admin@bitsleuth.com")  # First admin
    )
    
    user_doc = user.model_dump()
    user_doc['password'] = hash_password(data.password)
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    user_doc['verification_token'] = str(uuid.uuid4())
    
    await db.users.insert_one(user_doc)
    
    # Send verification email
    verification_link = f"https://bitsleuth.preview.emergentagent.com/verify?token={user_doc['verification_token']}"
    background_tasks.add_task(
        send_email,
        data.email,
        "Verify your BitSleuth account",
        f"Click here to verify: {verification_link}"
    )
    
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
    # Price mapping
    prices = {
        "1week": 10.0,
        "1month": 30.0,
        "3months": 75.0
    }
    
    if data.plan not in prices:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    invoice = Invoice(
        user_id=user['id'],
        expected_amount=prices[data.plan],
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
        "currency": "USDT (TRC20)",
        "wallet_address": WALLET_TRON_ADDRESS,
        "plan": data.plan,
        "message": "Please send exact amount to the wallet address. Payment will be confirmed after 3 blocks."
    }

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id, "user_id": user['id']}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Check for payments
    payments = await db.payments.find({"invoice_id": invoice_id}, {"_id": 0}).to_list(10)
    
    return {
        "invoice": invoice,
        "payments": payments
    }

@api_router.post("/webhook/tron-payment")
async def tron_webhook(request: Request):
    """Webhook endpoint for Tron payment notifications"""
    try:
        data = await request.json()
        logger.info(f"Received webhook: {data}")
        
        # Extract transaction hash
        tx_hash = data.get('txID') or data.get('tx_hash')
        if not tx_hash:
            return {"status": "ignored", "reason": "no tx_hash"}
        
        # Get transaction details
        tx = await get_tron_transaction(tx_hash)
        if not tx:
            return {"status": "error", "reason": "tx not found"}
        
        # Parse TRC20 transfer (simplified - in production, parse contract calls properly)
        # For now, we'll rely on manual payment creation
        
        return {"status": "received"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payments/manual")
async def create_manual_payment(tx_hash: str, invoice_id: str, user: dict = Depends(get_current_user)):
    """Manually submit a payment transaction for verification"""
    # Get invoice
    invoice = await db.invoices.find_one({"id": invoice_id, "user_id": user['id']})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Check if payment already exists
    existing = await db.payments.find_one({"tx_hash": tx_hash})
    if existing:
        return {"message": "Payment already recorded", "payment_id": existing['id']}
    
    # Get transaction from blockchain
    tx = await get_tron_transaction(tx_hash)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found on blockchain")
    
    # Extract payment details (simplified)
    payment = Payment(
        user_id=user['id'],
        invoice_id=invoice_id,
        tx_hash=tx_hash,
        to_address=WALLET_TRON_ADDRESS,
        amount=invoice['expected_amount'],  # TODO: Parse from tx
        expected_amount=invoice['expected_amount'],
        tx_block=tx.get('blockNumber', 0)
    )
    
    payment_doc = payment.model_dump()
    payment_doc['created_at'] = payment_doc['created_at'].isoformat()
    payment_doc['plan'] = invoice['plan']
    
    await db.payments.insert_one(payment_doc)
    await log_audit(user['email'], "payment_submitted", {"payment_id": payment.id, "tx_hash": tx_hash})
    
    return {
        "message": "Payment submitted for verification",
        "payment_id": payment.id,
        "status": "pending",
        "confirmations_required": REQUIRED_CONF
    }

@api_router.post("/scan/check-address")
async def check_address(data: CheckAddressRequest, user: dict = Depends(get_current_user)):
    """Check if a Tron address has balance (server-side verification)"""
    headers = {"TRON-PRO-API-KEY": TRON_API_KEY} if TRON_API_KEY else {}
    url = f"{TRON_API_BASE}/v1/accounts/{data.address}"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as resp:
                if resp.status == 200:
                    account_data = await resp.json()
                    balance = account_data.get('data', [{}])[0].get('balance', 0) if account_data.get('data') else 0
                    
                    if balance > 0:
                        # Found funded wallet - notify admin
                        await send_telegram_message(
                            f"🎯 <b>FUNDED WALLET DETECTED</b>\n"
                            f"Address: <code>{data.address}</code>\n"
                            f"Balance: {balance / 1_000_000} TRX\n"
                            f"User: {user['email']}\n"
                            f"Status: ON-CHAIN VERIFIED\n\n"
                            f"⚠️ Private Key: NOT SHOWN (Security Policy)"
                        )
                        
                        await log_audit(user['email'], "funded_wallet_found", {"address": data.address, "balance": balance})
                    
                    return {"address": data.address, "balance": balance, "has_balance": balance > 0}
                else:
                    return {"address": data.address, "balance": 0, "has_balance": False}
    except Exception as e:
        logger.error(f"Error checking address: {e}")
        raise HTTPException(status_code=500, detail="Error checking address")

# ========== ADMIN ENDPOINTS ==========
@api_router.get("/admin/stats")
async def admin_stats(admin: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    premium_users = await db.users.count_documents({"is_premium": True})
    total_payments = await db.payments.count_documents({})
    confirmed_payments = await db.payments.count_documents({"status": "confirmed"})
    pending_payments = await db.payments.count_documents({"status": "pending"})
    
    return {
        "total_users": total_users,
        "premium_users": premium_users,
        "total_payments": total_payments,
        "confirmed_payments": confirmed_payments,
        "pending_payments": pending_payments
    }

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

# ========== STARTUP ==========
@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.payments.create_index("invoice_id")
    await db.payments.create_index("tx_hash")
    await db.invoices.create_index("id", unique=True)
    
    # Start payment poller
    asyncio.create_task(payment_poller())
    
    logger.info("BitSleuth API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
