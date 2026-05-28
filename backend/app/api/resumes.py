from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.security import current_user
from app.db.models import ResumeAsset, User
from app.db.session import get_db
from app.schemas.models import ResumeAssetCreate, ResumeAssetRead

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.get("", response_model=list[ResumeAssetRead])
def list_resumes(
    user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[ResumeAsset]:
    return (
        db.query(ResumeAsset)
        .filter(ResumeAsset.user_id == user.id)
        .order_by(ResumeAsset.updated_at.desc())
        .all()
    )


@router.post("", response_model=ResumeAssetRead, status_code=status.HTTP_201_CREATED)
def upload_resume(
    payload: ResumeAssetCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ResumeAsset:
    resume = ResumeAsset(
        user_id=user.id,
        name=payload.name,
        source=payload.source,
        content=payload.content,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume
