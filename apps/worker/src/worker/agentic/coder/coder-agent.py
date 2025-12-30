from langchain.agents import create_agent
from worker.agentic.model import model_azure
from coder_tools import tool

# first step initialized the agent
TOOLS = tool
coder_agent = create_agent(
    model=model_azure, system_prompt="write the code", name="Coder Agent", tools=TOOLS
)
