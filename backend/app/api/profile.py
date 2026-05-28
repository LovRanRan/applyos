from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import current_user
from app.db.models import Profile, User
from app.db.session import get_db
from app.schemas.models import ProfileRead, ProfileUpsert
from app.services.crud import upsert_profile
from app.services.serializers import profile_to_read

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileRead)
def get_profile(user: User = Depends(current_user), db: Session = Depends(get_db)) -> ProfileRead:
    profile = db.query(Profile).filter(Profile.user_id == user.id).one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile_to_read(profile)


@router.put("", response_model=ProfileRead)
def put_profile(
    payload: ProfileUpsert,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ProfileRead:
    return profile_to_read(upsert_profile(db, user, payload))
