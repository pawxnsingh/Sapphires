# Test coder tools with LLM
from coder_tools import coder_tools, read_file
from worker.agentic.model import model_azure


def test_llm_with_tools():
    """Test the LLM can use the read_file tool"""

    # Bind tools to the model
    model_with_tools = model_azure.bind_tools(coder_tools)

    # Ask the LLM to read a file
    messages = [
        {
            "role": "user",
            "content": "Read the file at artifact_demo/demo.txt and tell me what package name is defined in it",
        }
    ]

    print("🤖 Sending request to LLM...")
    response = model_with_tools.invoke(messages)

    print("\n" + "=" * 50)
    print("LLM Response:")
    print("=" * 50)
    print(f"Content: {response.content}")
    print(
        f"\nTool calls: {response.tool_calls if hasattr(response, 'tool_calls') else 'None'}"
    )

    # If LLM made a tool call, execute it
    if hasattr(response, "tool_calls") and response.tool_calls:
        print("\n" + "=" * 50)
        print("Executing tool calls...")
        print("=" * 50)

        for tool_call in response.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            print(f"\n🔧 Tool: {tool_name}")
            print(f"   Args: {tool_args}")

            # Execute the read_file tool
            if tool_name == "read_file":
                result = read_file.invoke(tool_args)
                print(f"   Result (first 200 chars): {result[:200]}...")


if __name__ == "__main__":
    test_llm_with_tools()
