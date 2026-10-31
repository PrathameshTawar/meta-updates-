import sys
import uuid
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.api.members import normalize_indian_mobile
from app.config import settings
from app.db.models import Household, Task, TaskCategory, TaskStatus
from app.db.session import AsyncSessionLocal
from app.main import app

AUTH = {"X-Admin-Token": settings.admin_secret}


def test_normalize_indian_mobile():
    assert normalize_indian_mobile("98765 43210") == "+919876543210"
    assert normalize_indian_mobile("+91-98765-43210") == "+919876543210"
    assert normalize_indian_mobile("098765 43210") == "+919876543210"
    for bad in ("12345", "5876543210", "+1 415 555 0100"):
        with pytest.raises(ValueError):
            normalize_indian_mobile(bad)


async def _household_id() -> int:
    async with AsyncSessionLocal() as db:
        h = Household(name=f"Test {uuid.uuid4().hex[:6]}", primary_language="mr")
        db.add(h)
        await db.commit()
        return h.id


def _phone() -> str:
    return f"9{uuid.uuid4().int % 10**9:09d}"


@pytest.mark.asyncio
async def test_parent_adds_and_removes_child():
    hid = await _household_id()
    phone = _phone()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        body = {"household_id": hid, "name": "Sneha", "role": "child", "phone": phone}
        assert (await c.post("/members/", json=body)).status_code == 401  # token required

        r = await c.post("/members/", json=body, headers=AUTH)
        assert r.status_code == 201, r.text
        child = r.json()
        assert child["phone_last4"] == phone[-4:] and "phone" not in child

        assert (await c.post("/members/", json=body, headers=AUTH)).status_code == 409  # same number
        no_contact = {**body, "phone": None}
        assert (await c.post("/members/", json=no_contact, headers=AUTH)).status_code == 422

        # A task the child claimed goes back to the family when they are removed.
        async with AsyncSessionLocal() as db:
            t = Task(household_id=hid, category=TaskCategory.bill, title="Bill",
                     status=TaskStatus.claimed, assignee_id=child["id"])
            db.add(t)
            await db.commit()
            task_id = t.id

        assert (await c.delete(f"/members/{child['id']}", headers=AUTH)).status_code == 204
        names = [m["name"] for m in (await c.get(f"/members/{hid}")).json()]
        assert "Sneha" not in names

        async with AsyncSessionLocal() as db:
            t = await db.get(Task, task_id)
            assert t.assignee_id is None and t.status == TaskStatus.confirmed


@pytest.mark.asyncio
async def test_cannot_assign_task_to_other_household():
    hid_a, hid_b = await _household_id(), await _household_id()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/members/", headers=AUTH,
                         json={"household_id": hid_b, "name": "Other", "role": "child", "phone": _phone()})
        outsider = r.json()["id"]
        async with AsyncSessionLocal() as db:
            t = Task(household_id=hid_a, category=TaskCategory.bill, title="Bill", status=TaskStatus.confirmed)
            db.add(t)
            await db.commit()
            task_id = t.id
        r = await c.patch(f"/tasks/{task_id}", headers=AUTH, json={"status": "claimed", "assignee_id": outsider})
        assert r.status_code == 400
