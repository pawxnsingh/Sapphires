# Test file for coder_tools
from coder_tools import read_file


def test_read_file():
    """Test the read_file function"""
    print("Testing read_file...")

    # Test with default path (artifact_demo/demo.txt)
    result = read_file()

    print("\n" + "=" * 50)
    print("✅ SUCCESS! File was read.")
    print("=" * 50)
    print(f"Content length: {len(result)} characters")
    print(f"First 200 chars:\n{result[:200]}")


if __name__ == "__main__":
    test_read_file()
