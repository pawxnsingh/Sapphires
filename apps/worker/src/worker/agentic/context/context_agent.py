from langchain.agents import create_agent
from worker.agentic.model import model_azure
from worker.agentic.context.context_tools import context_gather
    
tools=[context_gather]

context_gather_agent = create_agent(
  model=model_azure,
  system_prompt="",
  name="context_agent",
  tools=tools
)

