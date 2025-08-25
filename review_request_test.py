#!/usr/bin/env python3
"""
Review Request Specific Testing for Webmatic.dev Backend
Tests the specific endpoints and scenarios mentioned in the review request
"""

import requests
import sys
import json
from datetime import datetime
import uuid

class ReviewRequestTester:
    def __init__(self):
        self.base_url = "https://webmatic-builder.preview.emergentagent.com/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.auth_token = None
        self.test_email = f"reviewtest_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com"
        
        # Existing project IDs from troubleshoot agent
        self.existing_project_ids = [
            "9bda87a6-c528-470a-9d94-2305d62ae035",
            "88db25e9-40f0-4791-a7cf-a2d47986f80a", 
            "a9904ca8-c9be-4aa2-b268-0ef9d0012685",
            "de9415f7-3817-428d-b288-b41c584890f5"
        ]

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")

    def test_health_check(self):
        """Test GET /api/health - verify API is responsive"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("ok") is True:
                    self.log_test("Health Check", True, f"- API responsive, DB: {data.get('db', 'N/A')}")
                    return True
                else:
                    self.log_test("Health Check", False, f"- Invalid response: {data}")
            else:
                self.log_test("Health Check", False, f"- Status: {response.status_code}")
        except Exception as e:
            self.log_test("Health Check", False, f"- Error: {str(e)}")
        return False

    def test_authentication_flow(self):
        """Test POST /api/auth/register and GET /api/auth/me with Bearer token"""
        # Register
        payload = {
            "email": self.test_email,
            "password": "ReviewTest123!"
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
                    
                    # Test /auth/me with Bearer token
                    headers = {"Authorization": f"Bearer {self.auth_token}"}
                    me_response = requests.get(f"{self.base_url}/auth/me", headers=headers, timeout=10)
                    if me_response.status_code == 200:
                        me_data = me_response.json()
                        if "user_id" in me_data and "email" in me_data:
                            self.log_test("Authentication Flow", True, f"- Register + Bearer token validation successful")
                            return True
                        else:
                            self.log_test("Authentication Flow", False, f"- /auth/me invalid response: {me_data}")
                    else:
                        self.log_test("Authentication Flow", False, f"- /auth/me failed: {me_response.status_code}")
                else:
                    self.log_test("Authentication Flow", False, f"- Register invalid response: {data}")
            else:
                self.log_test("Authentication Flow", False, f"- Register failed: {response.status_code}")
        except Exception as e:
            self.log_test("Authentication Flow", False, f"- Error: {str(e)}")
        return False

    def test_project_management(self):
        """Test project CRUD operations"""
        # Create project
        payload = {
            "name": "Review Test Project",
            "description": "Test project for review request validation"
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
                if "id" in data and len(data["id"]) == 36 and data["id"].count('-') == 4:
                    project_id = data["id"]
                    
                    # Test GET specific project
                    get_response = requests.get(f"{self.base_url}/projects/{project_id}", timeout=10)
                    if get_response.status_code == 200:
                        get_data = get_response.json()
                        if get_data.get("id") == project_id:
                            
                            # Test DELETE project
                            delete_response = requests.delete(f"{self.base_url}/projects/{project_id}", timeout=10)
                            if delete_response.status_code == 200:
                                delete_data = delete_response.json()
                                if delete_data.get("ok") is True:
                                    # Verify project is deleted
                                    verify_response = requests.get(f"{self.base_url}/projects/{project_id}", timeout=10)
                                    if verify_response.status_code == 404:
                                        self.log_test("Project Management", True, "- CREATE, GET, DELETE all working correctly")
                                        return True
                                    else:
                                        self.log_test("Project Management", False, f"- Project still exists after deletion: {verify_response.status_code}")
                                else:
                                    self.log_test("Project Management", False, f"- Delete invalid response: {delete_data}")
                            else:
                                self.log_test("Project Management", False, f"- Delete failed: {delete_response.status_code}")
                        else:
                            self.log_test("Project Management", False, f"- GET project mismatch: {get_data.get('id')} != {project_id}")
                    else:
                        self.log_test("Project Management", False, f"- GET project failed: {get_response.status_code}")
                else:
                    self.log_test("Project Management", False, f"- Create project invalid UUID: {data}")
            else:
                self.log_test("Project Management", False, f"- Create project failed: {response.status_code}")
        except Exception as e:
            self.log_test("Project Management", False, f"- Error: {str(e)}")
        return False

    def test_chat_system_existing_projects(self):
        """Test chat system with existing project IDs"""
        for project_id in self.existing_project_ids[:2]:  # Test first 2 existing projects
            try:
                # Test GET chat history
                get_response = requests.get(f"{self.base_url}/projects/{project_id}/chat", timeout=10)
                if get_response.status_code == 200:
                    get_data = get_response.json()
                    if "messages" in get_data:
                        
                        # Test POST chat message
                        post_payload = {
                            "content": f"Review test message for project {project_id[:8]}",
                            "role": "user"
                        }
                        post_response = requests.post(
                            f"{self.base_url}/projects/{project_id}/chat",
                            json=post_payload,
                            headers={"Content-Type": "application/json"},
                            timeout=10
                        )
                        if post_response.status_code == 200:
                            post_data = post_response.json()
                            if post_data.get("success") is True:
                                self.log_test(f"Chat System - {project_id[:8]}", True, 
                                            f"- GET and POST chat working, {len(get_data['messages'])} existing messages")
                                return True
                            else:
                                self.log_test(f"Chat System - {project_id[:8]}", False, f"- POST chat invalid response: {post_data}")
                        else:
                            self.log_test(f"Chat System - {project_id[:8]}", False, f"- POST chat failed: {post_response.status_code}")
                    else:
                        self.log_test(f"Chat System - {project_id[:8]}", False, f"- GET chat invalid response: {get_data}")
                else:
                    self.log_test(f"Chat System - {project_id[:8]}", False, f"- GET chat failed: {get_response.status_code}")
            except Exception as e:
                self.log_test(f"Chat System - {project_id[:8]}", False, f"- Error: {str(e)}")
                continue
        return False

    def test_code_generation_existing_projects(self):
        """Test code generation with existing project IDs"""
        if not self.auth_token:
            self.log_test("Code Generation - Existing Projects", False, "- No auth token available")
            return False
            
        for project_id in self.existing_project_ids[:1]:  # Test first existing project
            try:
                payload = {
                    "provider": "claude",
                    "prompt": "Add a contact form section with name, email, and message fields"
                }
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.auth_token}"
                }
                
                print(f"    🔄 Testing generation on existing project {project_id[:8]}...")
                response = requests.post(
                    f"{self.base_url}/projects/{project_id}/generate",
                    json=payload,
                    headers=headers,
                    timeout=60
                )
                
                if response.status_code == 200:
                    data = response.json()
                    mode = data.get("mode")
                    files = data.get("files", [])
                    html_preview = data.get("html_preview", "")
                    error = data.get("error")
                    
                    if mode == "ai" and error is None and len(files) > 0:
                        self.log_test(f"Code Generation - {project_id[:8]}", True, 
                                    f"- AI mode successful, {len(files)} files, {len(html_preview)} chars")
                        return True
                    else:
                        self.log_test(f"Code Generation - {project_id[:8]}", False, 
                                    f"- mode={mode}, files={len(files)}, error={error}")
                else:
                    self.log_test(f"Code Generation - {project_id[:8]}", False, 
                                f"- Status: {response.status_code}")
            except Exception as e:
                self.log_test(f"Code Generation - {project_id[:8]}", False, f"- Error: {str(e)}")
                continue
        return False

    def test_data_validation(self):
        """Test proper UUID format and data structures"""
        # Test with existing project ID
        project_id = self.existing_project_ids[0]
        
        try:
            response = requests.get(f"{self.base_url}/projects/{project_id}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                
                # Validate UUID format
                if len(data.get("id", "")) == 36 and data["id"].count('-') == 4:
                    
                    # Validate artifacts structure if present
                    artifacts = data.get("artifacts")
                    if artifacts:
                        required_fields = ["files", "html_preview", "mode", "generated_at"]
                        missing_fields = [f for f in required_fields if f not in artifacts]
                        
                        if not missing_fields:
                            self.log_test("Data Validation", True, 
                                        f"- UUID format correct, artifacts structure valid")
                            return True
                        else:
                            self.log_test("Data Validation", False, f"- Missing artifact fields: {missing_fields}")
                    else:
                        self.log_test("Data Validation", True, 
                                    f"- UUID format correct, no artifacts (valid for new projects)")
                        return True
                else:
                    self.log_test("Data Validation", False, f"- Invalid UUID format: {data.get('id')}")
            else:
                self.log_test("Data Validation", False, f"- Status: {response.status_code}")
        except Exception as e:
            self.log_test("Data Validation", False, f"- Error: {str(e)}")
        return False

    def test_error_handling(self):
        """Test 404 responses for non-existent projects and auth errors"""
        fake_project_id = str(uuid.uuid4())
        
        try:
            # Test 404 for non-existent project
            response = requests.get(f"{self.base_url}/projects/{fake_project_id}", timeout=10)
            if response.status_code == 404:
                
                # Test 404 for non-existent project chat
                chat_response = requests.get(f"{self.base_url}/projects/{fake_project_id}/chat", timeout=10)
                if chat_response.status_code == 200:  # Chat returns empty messages for non-existent projects
                    chat_data = chat_response.json()
                    if chat_data.get("messages") == []:
                        
                        # Test auth error for generation without token
                        gen_response = requests.post(
                            f"{self.base_url}/projects/{self.existing_project_ids[0]}/generate",
                            json={"provider": "claude", "prompt": "test"},
                            headers={"Content-Type": "application/json"},
                            timeout=10
                        )
                        if gen_response.status_code == 401:
                            self.log_test("Error Handling", True, 
                                        "- 404 for non-existent projects, 401 for missing auth")
                            return True
                        else:
                            self.log_test("Error Handling", False, f"- Expected 401 for missing auth, got {gen_response.status_code}")
                    else:
                        self.log_test("Error Handling", False, f"- Chat should return empty messages for non-existent project")
                else:
                    self.log_test("Error Handling", False, f"- Chat for non-existent project: {chat_response.status_code}")
            else:
                self.log_test("Error Handling", False, f"- Expected 404 for non-existent project, got {response.status_code}")
        except Exception as e:
            self.log_test("Error Handling", False, f"- Error: {str(e)}")
        return False

    def test_list_projects(self):
        """Test GET /api/projects - list all projects"""
        try:
            response = requests.get(f"{self.base_url}/projects", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Check if our existing project IDs are in the list
                    project_ids_in_list = [p.get("id") for p in data]
                    found_existing = any(pid in project_ids_in_list for pid in self.existing_project_ids)
                    
                    if found_existing:
                        self.log_test("List Projects", True, 
                                    f"- Found {len(data)} projects, includes existing test projects")
                        return True
                    else:
                        self.log_test("List Projects", True, 
                                    f"- Found {len(data)} projects (existing test projects may have been deleted)")
                        return True
                else:
                    self.log_test("List Projects", False, f"- Invalid response format: {type(data)}")
            else:
                self.log_test("List Projects", False, f"- Status: {response.status_code}")
        except Exception as e:
            self.log_test("List Projects", False, f"- Error: {str(e)}")
        return False

    def run_review_tests(self):
        """Run all review request specific tests"""
        print("🎯 REVIEW REQUEST SPECIFIC TESTING - Webmatic.dev Backend")
        print(f"📡 Testing against: {self.base_url}")
        print("🔍 Focus: Health, Auth, Project Management, Chat, Generation, Validation, Error Handling")
        print("=" * 80)

        tests = [
            ("1. Health Check - GET /api/health", self.test_health_check),
            ("2. Authentication Flow - Register + Bearer Token", self.test_authentication_flow),
            ("3. Project Management - CRUD Operations", self.test_project_management),
            ("4. Project List - GET /api/projects", self.test_list_projects),
            ("5. Chat System - Existing Projects", self.test_chat_system_existing_projects),
            ("6. Code Generation - Existing Projects", self.test_code_generation_existing_projects),
            ("7. Data Validation - UUID & Artifacts", self.test_data_validation),
            ("8. Error Handling - 404 & Auth Errors", self.test_error_handling),
        ]

        for test_name, test_func in tests:
            print(f"\n🔍 Running {test_name}...")
            test_func()

        # Summary
        print("\n" + "=" * 80)
        print(f"📊 Review Request Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL REVIEW REQUEST TESTS PASSED!")
            print("✅ Health Check: API responsive")
            print("✅ Authentication: Register + Bearer token working")
            print("✅ Project Management: CRUD operations functional")
            print("✅ Chat System: GET/POST working with existing projects")
            print("✅ Code Generation: LLM integration returns 'ai' mode")
            print("✅ Data Validation: Proper UUID format and artifact structures")
            print("✅ Error Handling: 404 and auth errors handled correctly")
            return True
        else:
            print("⚠️  REVIEW REQUEST TESTS FAILED!")
            print("❌ Some critical functionality is not working as expected")
            return False

def main():
    tester = ReviewRequestTester()
    success = tester.run_review_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())