"""
Tests for Phase 3: Error Recovery & Package Manager
"""

from worker.agentic.package_manager import detect_missing_packages, auto_install_packages
from worker.agentic.build_validator import classify_error, extract_missing_package, ErrorType

def test_error_classification():
    """Test error classification logic."""
    print("\n🧪 Testing Error Classification...")
    
    errors = [
        ("Cannot find module 'axios'", ErrorType.MISSING_PACKAGE),
        ("Uncaught TypeError: foo.bar is not a function", ErrorType.RUNTIME_ERROR),
        ("SyntaxError: Unexpected token", ErrorType.SYNTAX_ERROR),
        ("Argument of type 'string' is not assignable to 'number'", ErrorType.TYPE_ERROR),
        ("Module './utils' has no exported member 'foo'", ErrorType.IMPORT_ERROR),
    ]
    
    for msg, expected in errors:
        result = classify_error(msg)
        assert result == expected, f"Expected {expected} for '{msg}', got {result}"
        print(f"✓ Classified: {msg[:30]}... -> {result}")

def test_missing_package_extraction():
    """Test extracting package names."""
    print("\n🧪 Testing Package Extraction...")
    
    cases = [
        ("Cannot find module 'axios'", "axios"),
        ("Cannot find module '@types/react'", "@types/react"),
        ("Cannot find module 'lodash/debounce'", "lodash"),
        ("Cannot find module '@radix-ui/react-slot/dist/index'", "@radix-ui/react-slot"),
    ]
    
    for msg, expected in cases:
        result = extract_missing_package(msg)
        assert result == expected, f"Expected {expected} for '{msg}', got {result}"
        print(f"✓ Extracted: {msg[:30]}... -> {result}")

if __name__ == "__main__":
    test_error_classification()
    test_missing_package_extraction()
    print("\n✅ Phase 3 Tests Passed!")
