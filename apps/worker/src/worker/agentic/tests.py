"""
Test: Complex App Generation with LangGraph Agent

Tests the unified planner agent with a complex, multi-screen application.
This will stress test the agent's ability to:
- Plan across multiple files
- Create interconnected components
- Handle state management
- Build a cohesive UI
"""

import asyncio
from pathlib import Path
from worker.agentic.runner import run_agent, StreamingCallbacks
from worker.agentic.state import FileChange


async def main():
    """Run the agent to build a complex Expense Tracker app."""
    
    # Project path
    project_path = "/tmp/sapphires-worker"
    
    # Verify project exists
    if not Path(project_path).exists():
        print(f"❌ Project not found at {project_path}")
        print("Run: npx create-expo-app@latest /tmp/sapphires-worker")
        return
    
    print("=" * 70)
    print("🚀 Sapphires LangGraph Agent - COMPLEX APP TEST")
    print("=" * 70)
    print(f"\n📁 Project: {project_path}")
    
    # Track tokens for display
    token_count = 0
    tool_count = 0
    files = []
    
    async def on_token(token: str):
        nonlocal token_count
        token_count += len(token)
        print(token, end="", flush=True)
    
    async def on_tool_start(name: str, args: dict):
        nonlocal tool_count
        tool_count += 1
        path = args.get("path", args.get("from_path", ""))
        print(f"\n\n🔧 [{tool_count}] {name}")
        if path:
            print(f"   📄 {path}")
    
    async def on_tool_end(name: str, result: str):
        if "Successfully" in result or "✓" in result:
            print(f"   ✅ Done")
        elif "Error" in result:
            print(f"   ❌ Error: {result[:100]}")
        else:
            print(f"   ✓ Completed")
    
    async def on_file_change(fc: FileChange):
        files.append(fc)
        emoji = {"create": "📝", "update": "✏️", "delete": "🗑️"}.get(fc.operation, "📄")
        print(f"\n{emoji} File: {fc.path} ({fc.operation})")
    
    async def on_phase_change(phase: str):
        print(f"\n\n{'='*40}")
        print(f"📍 Phase: {phase.upper()}")
        print(f"{'='*40}")
    
    callbacks = StreamingCallbacks(
        on_token=on_token,
        on_tool_start=on_tool_start,
        on_tool_end=on_tool_end,
        on_file_change=on_file_change,
        on_phase_change=on_phase_change,
    )
    
    # Simple, realistic user request (like a real user would ask)
    user_message = "create me chess mobile app"
    
    print(f"\n📤 Task: Build Complete Expense Tracker App")
    print("-" * 70)
    print("This is a complex task that will test the agent's planning capabilities.")
    print("Expected: Multiple files, context setup, screens, components...")
    print("-" * 70)
    
    import time
    start_time = time.time()
    
    # Run the agent with more steps allowed for complex task
    result = await run_agent(
        project_id="expense_tracker",
        project_path=project_path,
        user_message=user_message,
        project_type="REACT_NATIVE",
        session_id="complex_test_1",
        max_steps=50,  # Allow more steps for complex task
        callbacks=callbacks,
    )
    
    elapsed = time.time() - start_time
    
    # Print results
    print("\n\n" + "=" * 70)
    print("📊 RESULT SUMMARY")
    print("=" * 70)
    print(f"Success:      {'✅ Yes' if result.success else '❌ No'}")
    print(f"Time:         {elapsed:.1f} seconds")
    print(f"Steps taken:  {result.steps_taken}")
    print(f"Tool calls:   {tool_count}")
    print(f"Files changed:{len(result.files_changed)}")
    print(f"Tokens:       ~{token_count} chars")
    
    if result.files_changed:
        print("\n📁 Files Modified:")
        for fc in result.files_changed:
            op_emoji = {"create": "🆕", "update": "📝", "delete": "🗑️"}.get(fc.operation, "📄")
            print(f"  {op_emoji} {fc.path}")
    
    if result.error:
        print(f"\n❌ Error: {result.error}")
    
    print("\n" + "=" * 70)
    print("✅ Test Complete!")
    print("=" * 70)
    print(f"\nTo run the app:")
    print(f"  cd {project_path}")
    print(f"  npm run web  # or npm run ios / npm run android")


if __name__ == "__main__":
    asyncio.run(main())
