import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, field_validator
from typing import Optional, List

from app.db.session import get_db
from app.db.models import Household, Member, MemberRole, Task, TaskStatus
from app.api.admin import verify_admin_auth

router = APIRouter()


class MemberOut(BaseModel):
    id: int
    household_id: int
    name: str
    role: str
    telegram_id: Optional[str]
    categories_owned: Optional[List[str]]
    # Only the last 4 digits leave the server, so the open GET does not leak phone numbers.
    phone_last4: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_member(cls, m: Member) -> "MemberOut":
        out = cls.model_validate(m)
        out.phone_last4 = m.phone[-4:] if m.phone else None
        return out


def normalize_indian_mobile(raw: str) -> str:
    """'98765 43210', '+91-9876543210', '09876543210' -> '+919876543210'. Raises ValueError otherwise."""
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise ValueError("Enter a 10-digit Indian mobile number")
    return f"+91{digits}"


class MemberCreate(BaseModel):
    household_id: int
    name: str
    role: MemberRole
    phone: Optional[str] = None
    telegram_id: Optional[str] = None
    categories_owned: Optional[List[str]] = []

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 120:
            raise ValueError("Name must be 1-120 characters")
        return v

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, v: Optional[str]) -> Optional[str]:
        return normalize_indian_mobile(v) if v else None


@router.get("/{household_id}", response_model=list[MemberOut])
async def list_members(household_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Member).where(Member.household_id == household_id).order_by(Member.id)
    )
    return [MemberOut.from_member(m) for m in result.scalars().all()]


@router.post("/", response_model=MemberOut, status_code=201)
async def create_member(
    data: MemberCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_admin_auth),
):
    if not await db.get(Household, data.household_id):
        raise HTTPException(status_code=404, detail="Household not found")
    if data.role == MemberRole.child and not (data.phone or data.telegram_id):
        # Without a phone or Telegram ID the child would never receive an alert.
        raise HTTPException(status_code=422, detail="A child needs a mobile number or Telegram ID")
    member = Member(
        household_id=data.household_id,
        name=data.name,
        role=data.role,
        phone=data.phone,
        telegram_id=data.telegram_id,
        categories_owned=data.categories_owned or [],
    )
    db.add(member)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="This mobile number or Telegram ID is already registered")
    await db.refresh(member)
    return MemberOut.from_member(member)


@router.delete("/{member_id}", status_code=204)
async def delete_member(
    member_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_admin_auth),
):
    member = await db.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role != MemberRole.child:
        raise HTTPException(status_code=400, detail="Only children can be removed here")
    # Tasks they had claimed go back to the family instead of disappearing with them.
    await db.execute(
        update(Task)
        .where(Task.assignee_id == member_id, Task.status == TaskStatus.claimed)
        .values(status=TaskStatus.confirmed)
    )
    await db.execute(update(Task).where(Task.assignee_id == member_id).values(assignee_id=None))
    await db.delete(member)
    await db.commit()
