from langchain.agents import create_agent
from worker.agentic.model import model_azure

planner_agent = create_agent(
    model=model_azure,
    system_prompt=prompt,
    name="architect_agent",
    tools=tools
)