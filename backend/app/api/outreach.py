from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.agents.decision_agent import generate_outreach_message
from app.core.security import current_user
from app.db.models import OutreachMessage, User
from app.db.session import get_db
from app.schemas.models import (
    OutreachGenerateRequest,
    OutreachMessageCreate,
    OutreachMessageRead,
    OutreachMessageUpdate,
)
from app.services.crud import (
    create_outreach,
    require_user_contact,
    require_user_job,
    update_outreach,
)
from app.services.serializers import outreach_to_read

router = APIRouter(prefix="/outreach", tags=["outreach"])


def require_message(db: Session, user: User, message_id: int) -> OutreachMessage:
    message = db.get(OutreachMessage, message_id)
    if message is None or message.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return message


@router.get("/messages", response_model=list[OutreachMessageRead])
def list_messages(
    user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[OutreachMessageRead]:
    messages = (
        db.query(OutreachMessage)
        .filter(OutreachMessage.user_id == user.id)
        .order_by(OutreachMessage.updated_at.desc())
        .all()
    )
    return [outreach_to_read(message) for message in messages]


@router.post("/generate", response_model=OutreachMessageRead, status_code=status.HTTP_201_CREATED)
def generate_message(
    payload: OutreachGenerateRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> OutreachMessageRead:
    job = require_user_job(db, user, payload.job_id) if payload.job_id is not None else None
    contact = (
        require_user_contact(db, user, payload.contact_id)
        if payload.contact_id is not None
        else None
    )
    draft = generate_outreach_message(
        company=job.company if job else None,
        role=job.title if job else None,
        contact_name=contact.name if contact else None,
        contact_title=contact.title if contact else None,
        message_type=payload.message_type,
        context=payload.context,
    )
    message = create_outreach(
        db,
        user,
        OutreachMessageCreate(
            contact_id=payload.contact_id,
            job_id=payload.job_id,
            message_type=payload.message_type,
            draft_text=draft,
        ),
    )
    return outreach_to_read(message)


@router.put("/messages/{message_id}", response_model=OutreachMessageRead)
def put_message(
    message_id: int,
    payload: OutreachMessageUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> OutreachMessageRead:
    return outreach_to_read(update_outreach(db, require_message(db, user, message_id), payload))
