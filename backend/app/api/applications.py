from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import current_user
from app.db.models import Application, User
from app.db.session import get_db
from app.schemas.models import ApplicationCreate, ApplicationRead, ApplicationUpdate
from app.services.crud import create_application, update_application
from app.services.serializers import application_to_read

router = APIRouter(prefix="/applications", tags=["applications"])


def require_application(db: Session, user: User, application_id: int) -> Application:
    application = db.get(Application, application_id)
    if application is None or application.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


@router.get("", response_model=list[ApplicationRead])
def list_applications(
    user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[ApplicationRead]:
    applications = (
        db.query(Application)
        .filter(Application.user_id == user.id)
        .order_by(Application.updated_at.desc())
        .all()
    )
    return [application_to_read(application) for application in applications]


@router.post("", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
def post_application(
    payload: ApplicationCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ApplicationRead:
    return application_to_read(create_application(db, user, payload))


@router.put("/{application_id}", response_model=ApplicationRead)
def put_application(
    application_id: int,
    payload: ApplicationUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ApplicationRead:
    return application_to_read(
        update_application(db, require_application(db, user, application_id), payload)
    )


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> None:
    application = require_application(db, user, application_id)
    db.delete(application)
    db.commit()
