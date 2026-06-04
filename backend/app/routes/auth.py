from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.schema.user_schema import LoginRequest, TokenResponse, UserOut
from app.services.user_service import get_user_by_username

router = APIRouter(prefix="/api/auth", tags=["auth"])

def _to_user_out(user) -> UserOut:
    if hasattr(UserOut, "model_validate"):
        return UserOut.model_validate(user)
    return UserOut.from_orm(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = get_user_by_username(db, payload.username)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )

    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)

    access_token = create_access_token({"sub": user.username, "role": user.role})
    user_out = _to_user_out(user)
    return TokenResponse(access_token=access_token, token_type="bearer", user=user_out)
