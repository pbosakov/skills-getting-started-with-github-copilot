import copy
import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_activities():
    """Reset the in-memory activities dict before each test."""
    original = copy.deepcopy(activities)
    # restore original state before the test
    activities.clear()
    activities.update(copy.deepcopy(original))
    yield
    # ensure original state after the test as well
    activities.clear()
    activities.update(copy.deepcopy(original))


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # basic sanity checks
    assert "Chess Club" in data
    assert "participants" in data["Chess Club"]


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "tester@example.com"

    # ensure email not present
    assert email not in activities[activity]["participants"]

    # sign up
    res = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert res.status_code == 200
    assert email in activities[activity]["participants"]

    # signing up again should fail with 400
    res2 = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert res2.status_code == 400

    # unregister
    res3 = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert res3.status_code == 200
    assert email not in activities[activity]["participants"]

    # unregistering again should return 404
    res4 = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert res4.status_code == 404


def test_activity_not_found_errors():
    # signup to non-existent activity
    res = client.post("/activities/NoSuchActivity/signup", params={"email": "a@b.com"})
    assert res.status_code == 404

    # delete from non-existent activity
    res2 = client.delete("/activities/NoSuchActivity/participants", params={"email": "a@b.com"})
    assert res2.status_code == 404
