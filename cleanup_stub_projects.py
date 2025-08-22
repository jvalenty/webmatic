#!/usr/bin/env python3
"""
Script to delete all projects with stub mode from the database
"""
import asyncio
import sys
import os
sys.path.append('/app/backend')

from app.core.db import db

async def cleanup_stub_projects():
    """Delete all projects with mode: 'stub' """
    try:
        # Find all projects with stub mode
        stub_projects = []
        async for doc in db.projects.find({"artifacts.mode": "stub"}):
            stub_projects.append(doc)
        
        print(f"Found {len(stub_projects)} projects with stub mode:")
        for project in stub_projects:
            print(f"  - {project['name']} (ID: {project['_id']}) - Created: {project.get('created_at', 'Unknown')}")
        
        if len(stub_projects) == 0:
            print("No stub projects found.")
            return
        
        # Delete the projects
        result = await db.projects.delete_many({"artifacts.mode": "stub"})
        print(f"\n✅ Deleted {result.deleted_count} stub projects from database")
        
        # Also clean up related chat records
        project_ids = [p['_id'] for p in stub_projects]
        chat_result = await db.chats.delete_many({"_id": {"$in": project_ids}})
        print(f"✅ Deleted {chat_result.deleted_count} related chat records")
        
        # Clean up related runs
        run_result = await db.runs.delete_many({"project_id": {"$in": project_ids}})
        print(f"✅ Deleted {run_result.deleted_count} related run records")
        
        print(f"\n🎉 Cleanup complete! Removed all stub projects and related data.")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(cleanup_stub_projects())