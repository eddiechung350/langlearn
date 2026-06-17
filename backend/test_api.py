#!/usr/bin/env python3
"""Test LangLearn API"""
import requests, sys

BASE = "http://localhost:5000/api"

def test(name, fn):
    try:
        fn()
        print(f"✅ {name}")
    except Exception as e:
        print(f"❌ {name}: {e}")
        sys.exit(1)

def test_health():
    r = requests.get(f"{BASE}/health")
    assert r.json()["status"] == "ok"

def test_register():
    r = requests.post(f"{BASE}/auth/register", json={"name": "testuser", "password": "test123"})
    assert r.status_code in (201, 200)
    global TOKEN
    TOKEN = r.json().get("token") or r.json().get("access_token")
    assert TOKEN

def test_login():
    global TOKEN
    r = requests.post(f"{BASE}/auth/login", json={"name": "testuser", "password": "test123"})
    assert r.status_code == 200
    TOKEN = r.json()["token"]
    assert TOKEN

def test_lessons():
    r = requests.get(f"{BASE}/lessons", headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == 200
    days = r.json()["lessons"]
    assert len(days) == 15, f"Expected 15 days, got {len(days)}"

def test_lesson1():
    r = requests.get(f"{BASE}/lessons/1", headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == 200
    phrases = r.json()["phrases"]
    assert len(phrases) == 8
    p = phrases[0]
    assert p["japanese"] == "すみません"

def test_progress():
    r = requests.post(f"{BASE}/progress",
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        json={"phrase_id": "jp_101", "rating": 4})
    assert r.status_code == 200
    prog = r.json()["progress"]
    assert prog["interval"] > 0

def test_review():
    r = requests.get(f"{BASE}/review?limit=5", headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == 200
    assert r.json()["review_count"] >= 0

def test_user():
    r = requests.get(f"{BASE}/user", headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == 200
    assert r.json()["user"]["name"] == "testuser"

if __name__ == "__main__":
    print("Testing LangLearn API...\n")
    test("Health check", test_health)
    test("Register", test_register)
    test("Login", test_login)
    test("Get lessons", test_lessons)
    test("Get day 1 phrases", test_lesson1)
    test("Update progress (SM-2)", test_progress)
    test("Get review phrases", test_review)
    test("Get user profile", test_user)
    print("\n✅ All tests passed!")
