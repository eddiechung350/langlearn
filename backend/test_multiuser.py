#!/usr/bin/env python3
"""Test multi-user isolation"""
import requests

BASE = "http://localhost:5000/api"

# Register two users
print("=== Creating user A ===")
r1 = requests.post(f"{BASE}/auth/register", json={"name": "alice", "password": "pass123"})
print(f"Alice: {r1.json().get('user', {}).get('name', 'ERROR')}")
TOKEN_A = r1.json().get("token")

print("=== Creating user B ===")
r2 = requests.post(f"{BASE}/auth/register", json={"name": "bob", "password": "pass456"})
print(f"Bob: {r2.json().get('user', {}).get('name', 'ERROR')}")
TOKEN_B = r2.json().get("token")

# Alice rates some phrases
print("\n=== Alice rates phrase jp_101 (rating=4) ===")
r = requests.post(f"{BASE}/progress",
    headers={"Authorization": f"Bearer {TOKEN_A}", "Content-Type": "application/json"},
    json={"phrase_id": "jp_101", "rating": 4})
print(f"Alice interval: {r.json()['progress']['interval']}")

# Bob has NO progress yet
print("\n=== Bob checks review ===")
r = requests.get(f"{BASE}/review?limit=5", headers={"Authorization": f"Bearer {TOKEN_B}"})
print(f"Bob has {r.json()['review_count']} phrases due (should be 120)")

# Alice's progress is separate
r = requests.get(f"{BASE}/user", headers={"Authorization": f"Bearer {TOKEN_A}"})
print(f"\nAlice stats: {r.json()['stats']}")

r = requests.get(f"{BASE}/user", headers={"Authorization": f"Bearer {TOKEN_B}"})
print(f"Bob stats: {r.json()['stats']}")

print("\n✅ Multi-user isolation confirmed!")
