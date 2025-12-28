from langchain.agents import create_agent
from worker.agentic.model import model_azure
from worker.agentic.planner.planner_prompt import THINKING_PROMPT
from worker.agentic.planner.planner_tools import get_dir
    
def get_prompt():
    return THINKING_PROMPT

prompt = get_prompt()
tools = [get_dir]

planner_agent = create_agent(
  model=model_azure,
  system_prompt=prompt,
  name="planner_agent",
  tools=tools
)

