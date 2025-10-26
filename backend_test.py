#!/usr/bin/env python3
"""
BitSleuth Backend API Testing Suite
Tests all newly implemented professional features
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return None

BASE_URL = get_backend_url()
if not BASE_URL:
    print("ERROR: Could not get REACT_APP_BACKEND_URL from frontend/.env")
    sys.exit(1)

API_BASE = f"{BASE_URL}/api"
print(f"Testing BitSleuth API at: {API_BASE}")

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "errors": []
}

def log_test(test_name, success, message="", response_data=None):
    """Log test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {test_name}")
    if message:
        print(f"   {message}")
    if response_data and not success:
        print(f"   Response: {response_data}")
    
    if success:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1
        test_results["errors"].append(f"{test_name}: {message}")
    print()

def test_btc_price():
    """Test GET /api/price/btc"""
    try:
        response = requests.get(f"{API_BASE}/price/btc", timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            if "price" in data and "currency" in data:
                if isinstance(data["price"], (int, float)) and data["price"] > 0:
                    log_test("Live BTC Price API", True, f"Price: ${data['price']:,.2f} {data['currency']}")
                else:
                    log_test("Live BTC Price API", False, f"Invalid price value: {data['price']}")
            else:
                log_test("Live BTC Price API", False, "Missing required fields (price, currency)", data)
        else:
            log_test("Live BTC Price API", False, f"HTTP {response.status_code}", response.text)
    except Exception as e:
        log_test("Live BTC Price API", False, f"Exception: {str(e)}")

def test_public_stats():
    """Test GET /api/stats/public"""
    try:
        response = requests.get(f"{API_BASE}/stats/public", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["total_users", "total_mined", "total_found", "active_miners"]
            
            if all(field in data for field in required_fields):
                if all(isinstance(data[field], int) and data[field] >= 0 for field in required_fields):
                    log_test("Public Statistics API", True, 
                           f"Users: {data['total_users']}, Mined: {data['total_mined']:,}, Found: {data['total_found']}, Active: {data['active_miners']}")
                else:
                    log_test("Public Statistics API", False, "Invalid field values (must be non-negative integers)", data)
            else:
                missing = [f for f in required_fields if f not in data]
                log_test("Public Statistics API", False, f"Missing fields: {missing}", data)
        else:
            log_test("Public Statistics API", False, f"HTTP {response.status_code}", response.text)
    except Exception as e:
        log_test("Public Statistics API", False, f"Exception: {str(e)}")

def test_public_support_message():
    """Test POST /api/support/message/public"""
    try:
        payload = {
            "email": "testuser@example.com",
            "message": "This is a test support message from public user"
        }
        
        response = requests.post(f"{API_BASE}/support/message/public", 
                               json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "id" in data:
                if "successfully" in data["message"].lower():
                    log_test("Public Support Message", True, f"Message ID: {data['id']}")
                else:
                    log_test("Public Support Message", False, f"Unexpected message: {data['message']}")
            else:
                log_test("Public Support Message", False, "Missing required fields (message, id)", data)
        else:
            log_test("Public Support Message", False, f"HTTP {response.status_code}", response.text)
    except Exception as e:
        log_test("Public Support Message", False, f"Exception: {str(e)}")

def register_and_login_test_user():
    """Register and login a test user for authenticated endpoints"""
    try:
        # Generate unique email for this test run
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_email = f"testuser_{timestamp}@example.com"
        test_password = "TestPassword123!"
        
        # Register user
        register_payload = {
            "email": test_email,
            "password": test_password
        }
        
        register_response = requests.post(f"{API_BASE}/auth/register", 
                                        json=register_payload, timeout=10)
        
        if register_response.status_code != 200:
            print(f"Registration failed: {register_response.status_code} - {register_response.text}")
            return None
        
        # Login user
        login_payload = {
            "email": test_email,
            "password": test_password
        }
        
        login_response = requests.post(f"{API_BASE}/auth/login", 
                                     json=login_payload, timeout=10)
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            if "token" in login_data:
                print(f"✅ Test user created and logged in: {test_email}")
                return login_data["token"]
        
        print(f"Login failed: {login_response.status_code} - {login_response.text}")
        return None
        
    except Exception as e:
        print(f"Error creating test user: {str(e)}")
        return None

def test_authenticated_support_message(auth_token):
    """Test POST /api/support/message (authenticated)"""
    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {
            "message": "This is a test support message from authenticated user"
        }
        
        response = requests.post(f"{API_BASE}/support/message", 
                               json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "id" in data:
                if "successfully" in data["message"].lower():
                    log_test("Authenticated Support Message", True, f"Message ID: {data['id']}")
                else:
                    log_test("Authenticated Support Message", False, f"Unexpected message: {data['message']}")
            else:
                log_test("Authenticated Support Message", False, "Missing required fields (message, id)", data)
        else:
            log_test("Authenticated Support Message", False, f"HTTP {response.status_code}", response.text)
    except Exception as e:
        log_test("Authenticated Support Message", False, f"Exception: {str(e)}")

def test_create_testimonial(auth_token):
    """Test POST /api/testimonials/create"""
    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {
            "name": "John Doe",
            "message": "Great platform! Found my first wallet within hours!",
            "rating": 5
        }
        
        response = requests.post(f"{API_BASE}/testimonials/create", 
                               json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "id" in data:
                if "approval" in data["message"].lower():
                    log_test("Create Testimonial", True, f"Testimonial ID: {data['id']}")
                else:
                    log_test("Create Testimonial", False, f"Unexpected message: {data['message']}")
            else:
                log_test("Create Testimonial", False, "Missing required fields (message, id)", data)
        else:
            log_test("Create Testimonial", False, f"HTTP {response.status_code}", response.text)
    except Exception as e:
        log_test("Create Testimonial", False, f"Exception: {str(e)}")

def test_get_approved_testimonials():
    """Test GET /api/testimonials/approved"""
    try:
        response = requests.get(f"{API_BASE}/testimonials/approved", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "testimonials" in data:
                if isinstance(data["testimonials"], list):
                    log_test("Get Approved Testimonials", True, 
                           f"Found {len(data['testimonials'])} approved testimonials")
                else:
                    log_test("Get Approved Testimonials", False, "testimonials field is not a list", data)
            else:
                log_test("Get Approved Testimonials", False, "Missing testimonials field", data)
        else:
            log_test("Get Approved Testimonials", False, f"HTTP {response.status_code}", response.text)
    except Exception as e:
        log_test("Get Approved Testimonials", False, f"Exception: {str(e)}")

def test_admin_endpoints(auth_token):
    """Test admin endpoints if user has admin privileges"""
    try:
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test admin support messages
        response = requests.get(f"{API_BASE}/admin/support-messages", 
                              headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "messages" in data:
                log_test("Admin Support Messages", True, f"Found {len(data['messages'])} support messages")
            else:
                log_test("Admin Support Messages", False, "Missing messages field", data)
        elif response.status_code == 403:
            log_test("Admin Support Messages", True, "Access denied (user not admin) - Expected behavior")
        else:
            log_test("Admin Support Messages", False, f"HTTP {response.status_code}", response.text)
        
        # Test admin testimonials
        response = requests.get(f"{API_BASE}/admin/testimonials", 
                              headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "testimonials" in data:
                log_test("Admin Testimonials", True, f"Found {len(data['testimonials'])} testimonials")
            else:
                log_test("Admin Testimonials", False, "Missing testimonials field", data)
        elif response.status_code == 403:
            log_test("Admin Testimonials", True, "Access denied (user not admin) - Expected behavior")
        else:
            log_test("Admin Testimonials", False, f"HTTP {response.status_code}", response.text)
            
    except Exception as e:
        log_test("Admin Endpoints", False, f"Exception: {str(e)}")

def main():
    """Run all tests"""
    print("=" * 60)
    print("BitSleuth Backend API Test Suite")
    print("=" * 60)
    print()
    
    # Test public endpoints
    print("🔓 Testing Public Endpoints...")
    test_btc_price()
    test_public_stats()
    test_public_support_message()
    test_get_approved_testimonials()
    
    print("🔐 Testing Authenticated Endpoints...")
    # Create test user and get auth token
    auth_token = register_and_login_test_user()
    
    if auth_token:
        test_authenticated_support_message(auth_token)
        test_create_testimonial(auth_token)
        
        print("👑 Testing Admin Endpoints...")
        test_admin_endpoints(auth_token)
    else:
        log_test("User Registration/Login", False, "Could not create test user")
        log_test("Authenticated Support Message", False, "No auth token available")
        log_test("Create Testimonial", False, "No auth token available")
        log_test("Admin Endpoints", False, "No auth token available")
    
    # Print summary
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"✅ Passed: {test_results['passed']}")
    print(f"❌ Failed: {test_results['failed']}")
    print(f"📊 Total: {test_results['passed'] + test_results['failed']}")
    
    if test_results["errors"]:
        print("\n🚨 FAILED TESTS:")
        for error in test_results["errors"]:
            print(f"   • {error}")
    
    print("\n" + "=" * 60)
    
    # Return exit code based on results
    return 0 if test_results["failed"] == 0 else 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)