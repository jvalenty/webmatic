#!/usr/bin/env python3
"""
Additional verification test for React-specific LLM content generation
"""

import requests
import json
from datetime import datetime

def test_react_specific_generation():
    """Test that LLM generates React-specific content with hooks and components"""
    base_url = "https://webmatic-builder.preview.emergentagent.com/api"
    
    # Register a test user
    test_email = f"reacttest_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com"
    register_payload = {
        "email": test_email,
        "password": "SecurePass123!"
    }
    
    print("🔍 Testing React-specific LLM generation...")
    
    # Register user
    register_response = requests.post(
        f"{base_url}/auth/register",
        json=register_payload,
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    
    if register_response.status_code != 200:
        print(f"❌ Registration failed: {register_response.status_code}")
        return False
    
    auth_token = register_response.json()["access_token"]
    
    # Create project
    project_payload = {
        "name": "React Component Test",
        "description": "Test React component generation"
    }
    
    project_response = requests.post(
        f"{base_url}/projects",
        json=project_payload,
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    
    if project_response.status_code != 200:
        print(f"❌ Project creation failed: {project_response.status_code}")
        return False
    
    project_id = project_response.json()["id"]
    
    # Generate React-specific content
    generate_payload = {
        "provider": "claude",
        "prompt": "Create a React component with useState hook for a counter button that increments when clicked"
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    }
    
    print("    🔄 Generating React-specific content...")
    generate_response = requests.post(
        f"{base_url}/projects/{project_id}/generate",
        json=generate_payload,
        headers=headers,
        timeout=60
    )
    
    if generate_response.status_code != 200:
        print(f"❌ Generation failed: {generate_response.status_code}")
        return False
    
    data = generate_response.json()
    mode = data.get("mode")
    files = data.get("files", [])
    html_preview = data.get("html_preview", "")
    
    print(f"    📊 Mode: {mode}")
    print(f"    📁 Files generated: {len(files)}")
    
    if mode == "ai" and len(files) > 0:
        # Check for React-specific content
        react_indicators = ["useState", "onClick", "React", "component", "function", "const"]
        found_indicators = []
        
        # Check in files content
        for file in files:
            content = file.get("content", "")
            for indicator in react_indicators:
                if indicator in content:
                    found_indicators.append(indicator)
        
        # Check in html_preview
        for indicator in react_indicators:
            if indicator in html_preview:
                found_indicators.append(indicator)
        
        found_indicators = list(set(found_indicators))  # Remove duplicates
        
        if len(found_indicators) >= 2:  # At least 2 React-specific elements
            print(f"✅ React-specific content verified! Found: {', '.join(found_indicators)}")
            return True
        else:
            print(f"⚠️  Limited React content found: {', '.join(found_indicators)}")
            return False
    else:
        print(f"❌ Generation failed - Mode: {mode}, Files: {len(files)}")
        return False

if __name__ == "__main__":
    success = test_react_specific_generation()
    if success:
        print("🎉 React-specific LLM generation verification PASSED!")
    else:
        print("❌ React-specific LLM generation verification FAILED!")