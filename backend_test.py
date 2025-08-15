#!/usr/bin/env python3
"""
Backend API Testing for Webmatic.dev MVP
Tests all CRUD operations and health endpoints using the public URL
"""

import requests
import sys
import json
from datetime import datetime
import os

class WebmaticAPITester:
    def __init__(self):
        # Use the public URL from frontend/.env
        self.base_url = "https://sitecraft-11.preview.emergentagent.com/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_project_id = None

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")

    def test_health(self):
        """Test health endpoint"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("ok") and "db" in data:
                    self.log_test("Health Check", True, f"- DB: {data['db']}")
                    return True
                else:
                    self.log_test("Health Check", False, f"- Invalid response: {data}")
            else:
                self.log_test("Health Check", False, f"- Status: {response.status_code}")
        except Exception as e:
            self.log_test("Health Check", False, f"- Error: {str(e)}")
        return False

    def test_create_project(self):
        """Test project creation"""
        payload = {
            "name": "Test CRM with Auth",
            "description": "A comprehensive CRM system with user authentication and Stripe payment integration"
        }
        try:
            response = requests.post(
                f"{self.base_url}/projects",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data.get("status") == "created":
                    self.created_project_id = data["id"]
                    self.log_test("Create Project", True, f"- ID: {data['id'][:8]}...")
                    return True
                else:
                    self.log_test("Create Project", False, f"- Invalid response: {data}")
            else:
                self.log_test("Create Project", False, f"- Status: {response.status_code}, Body: {response.text}")
        except Exception as e:
            self.log_test("Create Project", False, f"- Error: {str(e)}")
        return False

    def test_list_projects(self):
        """Test listing projects"""
        try:
            response = requests.get(f"{self.base_url}/projects", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    found_project = any(p.get("id") == self.created_project_id for p in data) if self.created_project_id else len(data) >= 0
                    self.log_test("List Projects", True, f"- Count: {len(data)}, Found created: {found_project}")
                    return True
                else:
                    self.log_test("List Projects", False, f"- Not a list: {type(data)}")
            else:
                self.log_test("List Projects", False, f"- Status: {response.status_code}")
        except Exception as e:
            self.log_test("List Projects", False, f"- Error: {str(e)}")
        return False

    def test_get_project(self):
        """Test getting specific project"""
        if not self.created_project_id:
            self.log_test("Get Project", False, "- No project ID available")
            return False
        
        try:
            response = requests.get(f"{self.base_url}/projects/{self.created_project_id}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == self.created_project_id:
                    self.log_test("Get Project", True, f"- Name: {data.get('name')}")
                    return True
                else:
                    self.log_test("Get Project", False, f"- ID mismatch: {data.get('id')}")
            else:
                self.log_test("Get Project", False, f"- Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get Project", False, f"- Error: {str(e)}")
        return False

    def test_scaffold_project(self):
        """Test project scaffolding/plan generation"""
        if not self.created_project_id:
            self.log_test("Scaffold Project", False, "- No project ID available")
            return False
        
        try:
            response = requests.post(f"{self.base_url}/projects/{self.created_project_id}/scaffold", timeout=15)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "planned" and data.get("plan"):
                    plan = data["plan"]
                    has_auth = any("Auth module placeholder" in item for item in plan.get("backend", []))
                    has_stripe = any("Stripe integration placeholder" in item for item in plan.get("backend", []))
                    self.log_test("Scaffold Project", True, f"- Auth: {has_auth}, Stripe: {has_stripe}")
                    return True
                else:
                    self.log_test("Scaffold Project", False, f"- Invalid plan: {data.get('status')}")
            else:
                self.log_test("Scaffold Project", False, f"- Status: {response.status_code}")
        except Exception as e:
            self.log_test("Scaffold Project", False, f"- Error: {str(e)}")
        return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Webmatic.dev Backend API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)

        # Test sequence
        tests = [
            ("Health Check", self.test_health),
            ("Create Project", self.test_create_project),
            ("List Projects", self.test_list_projects),
            ("Get Project", self.test_get_project),
            ("Scaffold Project", self.test_scaffold_project),
        ]

        for test_name, test_func in tests:
            print(f"\n🔍 Running {test_name}...")
            test_func()

        # Summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend is working correctly.")
            return True
        else:
            print("⚠️  Some tests failed. Check the logs above.")
            return False

def main():
    tester = WebmaticAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())