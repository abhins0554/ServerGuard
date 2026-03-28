from fastapi import APIRouter, HTTPException, Depends
import logging
from dependencies import ADMIN_USERNAME, ADMIN_PASSWORD
from models import LoginRequest, LoginResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    logger.info(f"Login attempt for user: {request.username}")
    if request.username == ADMIN_USERNAME and request.password == ADMIN_PASSWORD:
        logger.info(f"Login successful for user: {request.username}")
        return LoginResponse(access_token="valid-token", token_type="bearer")
    logger.warning(f"Login failed for user: {request.username}")
    raise HTTPException(status_code=401, detail="Invalid credentials")
