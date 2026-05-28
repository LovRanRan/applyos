from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.security import current_user
from app.db.models import Contact, User
from app.db.session import get_db
from app.schemas.models import ContactCreate, ContactRead, ContactUpdate
from app.services.crud import create_contact, require_user_contact, update_contact
from app.services.serializers import contact_to_read

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactRead])
def list_contacts(
    user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[ContactRead]:
    contacts = (
        db.query(Contact)
        .filter(Contact.user_id == user.id)
        .order_by(Contact.updated_at.desc())
        .all()
    )
    return [contact_to_read(contact) for contact in contacts]


@router.post("", response_model=ContactRead, status_code=status.HTTP_201_CREATED)
def post_contact(
    payload: ContactCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ContactRead:
    return contact_to_read(create_contact(db, user, payload))


@router.put("/{contact_id}", response_model=ContactRead)
def put_contact(
    contact_id: int,
    payload: ContactUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ContactRead:
    return contact_to_read(update_contact(db, require_user_contact(db, user, contact_id), payload))


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> None:
    contact = require_user_contact(db, user, contact_id)
    db.delete(contact)
    db.commit()
