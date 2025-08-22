#!/usr/bin/env python3
"""
Backend API Testing for Webmatic.dev MVP - CRITICAL LLM INTEGRATION TEST
Tests the core chat and generation flow after LLM integration fix
"""

import requests
import sys
import json
from datetime import datetime
import os
import time

class WebmaticAPITester:
    def __init__(self):
        # Use the public URL from frontend/.env
        self.base_url = "https://webmatic-dev.preview.emergentagent.com/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_project_id = None
        self.auth_token = None
        self.test_email = f"testuser_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com"

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")

    def test_health(self):
        """Test health endpoint returns ok: true"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("ok") is True and "db" in data:
                    self.log_test("Health Check", True, f"- DB: {data['db']}")
                    return True
                else:
                    self.log_test("Health Check", False, f"- Invalid response: {data}")
            else:
                self.log_test("Health Check", False, f"- Status: {response.status_code}")
        except Exception as e:
            self.log_test("Health Check", False, f"- Error: {str(e)}")
        return False

    def test_auth_register(self):
        """Test user registration"""
        payload = {
            "email": self.test_email,
            "password": "SecurePass123!"
        }
        try:
            response = requests.post(
                f"{self.base_url}/auth/register",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and data.get("token_type") == "bearer":
                    self.auth_token = data["access_token"]
                    self.log_test("Auth Register", True, f"- Token received for {self.test_email}")
                    return True
                else:
                    self.log_test("Auth Register", False, f"- Invalid response: {data}")
            else:
                self.log_test("Auth Register", False, f"- Status: {response.status_code}, Body: {response.text}")
        except Exception as e:
            self.log_test("Auth Register", False, f"- Error: {str(e)}")
        return False

    def test_auth_me(self):
        """Test getting current user info with Bearer token"""
        if not self.auth_token:
            self.log_test("Auth Me", False, "- No auth token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = requests.get(f"{self.base_url}/auth/me", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "user_id" in data and "email" in data:
                    self.log_test("Auth Me", True, f"- User ID: {data['user_id'][:8]}...")
                    return True
                else:
                    self.log_test("Auth Me", False, f"- Invalid response: {data}")
            else:
                self.log_test("Auth Me", False, f"- Status: {response.status_code}")
        except Exception as e:
            self.log_test("Auth Me", False, f"- Error: {str(e)}")
        return False

    def test_create_project(self):
        """Test project creation with UUID ID"""
        payload = {
            "name": "Homepage Builder Test",
            "description": "Create a simple homepage with hero section and features"
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
                    # Verify UUID format (36 chars with dashes)
                    project_id = data["id"]
                    if len(project_id) == 36 and project_id.count('-') == 4:
                        self.created_project_id = project_id
                        self.log_test("Create Project", True, f"- UUID ID: {project_id[:8]}...")
                        return True
                    else:
                        self.log_test("Create Project", False, f"- Invalid UUID format: {project_id}")
                else:
                    self.log_test("Create Project", False, f"- Invalid response: {data}")
            else:
                self.log_test("Create Project", False, f"- Status: {response.status_code}, Body: {response.text}")
        except Exception as e:
            self.log_test("Create Project", False, f"- Error: {str(e)}")
        return False

    def test_chat_message_persistence(self):
        """Test chat message persistence: POST /api/projects/{id}/chat"""
        if not self.created_project_id:
            self.log_test("Chat Message Persistence", False, "- No project ID available")
            return False
        
        try:
            payload = {"content": "Create a modern homepage with hero section", "role": "user"}
            response = requests.post(
                f"{self.base_url}/projects/{self.created_project_id}/chat",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("ok") is True:
                    # Verify message was persisted by retrieving chat
                    get_response = requests.get(f"{self.base_url}/projects/{self.created_project_id}/chat", timeout=10)
                    if get_response.status_code == 200:
                        chat_data = get_response.json()
                        messages = chat_data.get("messages", [])
                        if len(messages) > 0 and messages[-1].get("content") == payload["content"]:
                            self.log_test("Chat Message Persistence", True, f"- Message persisted and retrieved")
                            return True
                        else:
                            self.log_test("Chat Message Persistence", False, f"- Message not found in chat history")
                    else:
                        self.log_test("Chat Message Persistence", False, f"- Failed to retrieve chat: {get_response.status_code}")
                else:
                    self.log_test("Chat Message Persistence", False, f"- Invalid response: {data}")
            else:
                self.log_test("Chat Message Persistence", False, f"- Status: {response.status_code}, Body: {response.text}")
        except Exception as e:
            self.log_test("Chat Message Persistence", False, f"- Error: {str(e)}")
        return False
        """Test project scaffolding with specific provider and model"""
        if not self.created_project_id:
            self.log_test("Scaffold Project", False, "- No project ID available")
            return False
        
        try:
            payload = {"provider": "claude", "model": "claude-4-sonnet"}
            response = requests.post(
                f"{self.base_url}/projects/{self.created_project_id}/scaffold", 
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30  # Increased timeout for LLM calls
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "planned" and data.get("plan"):
                    plan = data["plan"]
                    frontend_count = len(plan.get("frontend", []))
                    backend_count = len(plan.get("backend", []))
                    database_count = len(plan.get("database", []))
                    self.log_test("Scaffold Project", True, 
                                f"- Status: planned, Frontend: {frontend_count}, Backend: {backend_count}, DB: {database_count}")
                    return True
                else:
                    self.log_test("Scaffold Project", False, f"- Invalid plan: status={data.get('status')}, plan={bool(data.get('plan'))}")
            else:
                self.log_test("Scaffold Project", False, f"- Status: {response.status_code}, Body: {response.text}")
        except Exception as e:
            self.log_test("Scaffold Project", False, f"- Error: {str(e)}")
        return False

    def test_runs_list_with_quality_score(self):
        """Test runs list includes quality_score for latest run"""
        if not self.created_project_id:
            self.log_test("Runs List Quality Score", False, "- No project ID available")
            return False
        
        try:
            response = requests.get(f"{self.base_url}/projects/{self.created_project_id}/runs", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    latest_run = data[0]  # Should be sorted by created_at desc
                    required_fields = ["provider", "model", "mode", "plan_counts", "quality_score"]
                    missing_fields = [f for f in required_fields if f not in latest_run]
                    
                    if not missing_fields and latest_run.get("quality_score") is not None:
                        self.log_test("Runs List Quality Score", True, 
                                    f"- Quality Score: {latest_run['quality_score']}, Provider: {latest_run['provider']}")
                        return True
                    else:
                        self.log_test("Runs List Quality Score", False, f"- Missing fields: {missing_fields}")
                else:
                    self.log_test("Runs List Quality Score", False, f"- No runs found or invalid format")
            else:
                self.log_test("Runs List Quality Score", False, f"- Status: {response.status_code}")
        except Exception as e:
            self.log_test("Runs List Quality Score", False, f"- Error: {str(e)}")
        return False

    def test_compare_providers(self):
        """Test compare providers creates two run records with baseline, variants, diff"""
        if not self.created_project_id:
            self.log_test("Compare Providers", False, "- No project ID available")
            return False
        
        try:
            response = requests.post(
                f"{self.base_url}/projects/{self.created_project_id}/compare-providers",
                headers={"Content-Type": "application/json"},
                timeout=60  # Longer timeout for multiple LLM calls
            )
            if response.status_code == 200:
                data = response.json()
                required_keys = ["baseline", "variants", "diff"]
                missing_keys = [k for k in required_keys if k not in data]
                
                if not missing_keys:
                    baseline = data["baseline"]
                    variants = data["variants"]
                    diff = data["diff"]
                    
                    # Verify structure
                    baseline_valid = "provider" in baseline and "model" in baseline and "plan" in baseline
                    variants_valid = isinstance(variants, list) and len(variants) > 0
                    diff_valid = isinstance(diff, dict) and all(k in diff for k in ["frontend", "backend", "database"])
                    
                    if baseline_valid and variants_valid and diff_valid:
                        self.log_test("Compare Providers", True, 
                                    f"- Baseline: {baseline['provider']}, Variants: {len(variants)}, Diff sections: {len(diff)}")
                        return True
                    else:
                        self.log_test("Compare Providers", False, f"- Invalid structure: baseline={baseline_valid}, variants={variants_valid}, diff={diff_valid}")
                else:
                    self.log_test("Compare Providers", False, f"- Missing keys: {missing_keys}")
            else:
                self.log_test("Compare Providers", False, f"- Status: {response.status_code}, Body: {response.text}")
        except Exception as e:
            self.log_test("Compare Providers", False, f"- Error: {str(e)}")
        return False

    def run_all_tests(self):
        """Run all backend tests focused on quality score and new flows"""
        print("🚀 Starting Webmatic.dev Backend Quality Score Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)

        # Test sequence based on review request
        tests = [
            ("Health Check", self.test_health),
            ("Auth Register", self.test_auth_register),
            ("Auth Me with Bearer Token", self.test_auth_me),
            ("Create Project with UUID", self.test_create_project),
            ("Scaffold with Claude Provider", self.test_scaffold_project),
            ("Runs List with Quality Score", self.test_runs_list_with_quality_score),
            ("Compare Providers", self.test_compare_providers),
        ]

        for test_name, test_func in tests:
            print(f"\n🔍 Running {test_name}...")
            test_func()

        # Summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend quality score functionality is working correctly.")
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