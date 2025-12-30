"""
Test: Planner → Coder Flow

This test simulates the flow:
1. Context gather (gets project structure)
2. Planner decides what to do
3. Coder agent executes with tools
"""

from langchain.messages import SystemMessage, HumanMessage
from worker.agentic.model import model_azure
from worker.agentic.coder.coder_tools import FILESYSTEM_TOOLS
from worker.agentic.coder.coder_agent import execute_coder_tools, CODER_SYSTEM_PROMPT
from worker.agentic.planner.planner_tools import set_project_context


def test_planner_to_coder():
    """Test the planner → coder flow"""

    # Step 1: Set up project context
    print("=" * 60)
    print("Step 1: Setting project context")
    print("=" * 60)
    project_path = "C:/Users/reala/Desktop/saphire/Sapphires"
    set_project_context("test_project", project_path)
    print(f"✅ Project context set: {project_path}")

    # Step 2: Create coder agent with tools
    print("\n" + "=" * 60)
    print("Step 2: Creating coder agent with tools")
    print("=" * 60)
    coder = model_azure.bind_tools(FILESYSTEM_TOOLS)
    print(f"✅ Coder agent created with {len(FILESYSTEM_TOOLS)} tools")
    print(f"   Tools: {[t.name for t in FILESYSTEM_TOOLS]}")

    # Step 3: Send a task to the coder
    print("\n" + "=" * 60)
    print("Step 3: Sending task to coder agent")
    print("=" * 60)

    task = "Read the file at artifact_demo/demo.txt and tell me the project name"
    print(f"📝 Task: {task}")

    messages = [SystemMessage(content=CODER_SYSTEM_PROMPT), HumanMessage(content=task)]

    print("\n🤖 Invoking coder agent...")
    response = coder.invoke(messages)

    # Step 4: Show response
    print("\n" + "=" * 60)
    print("Step 4: Coder agent response")
    print("=" * 60)
    print(f"Content: {response.content[:200] if response.content else 'None'}...")
    print(
        f"Tool calls: {response.tool_calls if hasattr(response, 'tool_calls') else 'None'}"
    )

    # Step 5: Execute tools if any
    if hasattr(response, "tool_calls") and response.tool_calls:
        print("\n" + "=" * 60)
        print("Step 5: Executing tool calls")
        print("=" * 60)

        tool_results = execute_coder_tools(response)

        for i, result in enumerate(tool_results):
            print(f"\n🔧 Tool Result {i + 1}:")
            print(
                f"   {result.content[:300]}..."
                if len(result.content) > 300
                else f"   {result.content}"
            )

        # Step 6: Send results back to LLM for final answer
        print("\n" + "=" * 60)
        print("Step 6: Getting final answer from LLM")
        print("=" * 60)

        # Add tool results to messages
        messages.append(response)  # AI message with tool calls
        messages.extend(tool_results)  # Tool results

        final_response = coder.invoke(messages)
        print("\n🎯 Final Answer:")
        print(final_response.content)

    print("\n" + "=" * 60)
    print("✅ TEST COMPLETE!")
    print("=" * 60)


if __name__ == "__main__":
    test_planner_to_coder()
