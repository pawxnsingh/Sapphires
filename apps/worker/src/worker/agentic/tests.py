from worker.agentic.graph import compile_agent
from worker.agentic.state import create_initial_state
import asyncio




async def run():
    agent = compile_agent();
    
    initial_state = create_initial_state(
        max_steps=25, 
        project_path="/tmp/sapphires-worker", 
        project_id="proj_123",
        user_message="create me a mobile chess app",
        session_id="session_123"
    )
    
    config = {"configurable": {"thread_id": "abc_123"}}
        
    
    async for event in agent.astream(initial_state, config, version="v2"):
        print("event::::  ", event)

    
    
asyncio.run(run())