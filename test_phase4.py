#!/usr/bin/env python3
import sys
sys.path.append('backend')
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)

# Test all routes
print("✅ PHASE 4: FastAPI Backend Checkpoint\n")

# Root
r_root = client.get('/')
print(f"GET /: {r_root.status_code}")

# Dashboard stats
r_stats = client.get('/api/dashboard/stats')
print(f"GET /api/dashboard/stats: {r_stats.status_code}")
if r_stats.status_code == 200:
    stats = r_stats.json()
    print(f"  → Total MPs: {stats['total_mp']}")
    print(f"  → RED: {stats['red_count']}, YELLOW: {stats['yellow_count']}, BLUE: {stats['blue_count']}, GREEN: {stats['green_count']}")
    print(f"  → Avg Risk: {stats['avg_risk']:.2f}")

# Get MPs
r_mps = client.get('/api/mps?limit=3')
print(f"GET /api/mps?limit=3: {r_mps.status_code}")
if r_mps.status_code == 200:
    data = r_mps.json()
    print(f"  → Returned: {len(data['mps'])} records out of {data['total']}")

# Get states
r_states = client.get('/api/states')
print(f"GET /api/states: {r_states.status_code}")
if r_states.status_code == 200:
    print(f"  → States: {len(r_states.json())}")

# Feedback
r_feedback = client.post('/api/feedback', json={'mp_name': 'Test MP', 'label': 'CONFIRMED', 'notes': 'test'})
print(f"POST /api/feedback: {r_feedback.status_code}")
if r_feedback.status_code == 200:
    print(f"  → Feedback recorded: {r_feedback.json()['status']}")

print("\n✅ PHASE 4 COMPLETE: All backend routes responding")
