# ollama_debug.py - Debug script to test Ollama connection
import requests
import json
import sys

def test_ollama_connection():
    """Test Ollama connection and diagnose issues"""
    
    base_url = "http://localhost:11434"
    
    print("🔍 Testing Ollama Connection...")
    print(f"Base URL: {base_url}")
    print("-" * 50)
    
    # Test 1: Check if Ollama server is running
    try:
        response = requests.get(f"{base_url}/api/tags", timeout=5)
        if response.status_code == 200:
            print("✅ Ollama server is running")
            models = response.json()
            print(f"📋 Available models: {[model['name'] for model in models['models']]}")
        else:
            print(f"❌ Ollama server responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Ollama server")
        print("💡 Make sure Ollama is installed and running:")
        print("   - Install: curl -fsSL https://ollama.ai/install.sh | sh")
        print("   - Start: ollama serve")
        print("   - Pull model: ollama pull llama3.2:3b-instruct")
        return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False
    
    # Test 2: Test the specific model you're using
    model_name = "llama3.2:3b-instruct"
    print(f"\n🧪 Testing model: {model_name}")
    
    # Check if model exists
    try:
        models_response = requests.get(f"{base_url}/api/tags")
        available_models = [m['name'] for m in models_response.json()['models']]
        
        if model_name not in available_models:
            print(f"❌ Model '{model_name}' not found")
            print(f"📋 Available models: {available_models}")
            print(f"💡 Pull the model: ollama pull {model_name}")
            return False
        else:
            print(f"✅ Model '{model_name}' is available")
    except Exception as e:
        print(f"❌ Error checking models: {e}")
        return False
    
    # Test 3: Test chat endpoint
    print(f"\n🗣️ Testing /api/chat endpoint...")
    
    chat_payload = {
        "model": model_name,
        "messages": [
            {"role": "user", "content": "Hello, are you working?"}
        ],
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 50
        }
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/chat",
            json=chat_payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "content" in data["message"]:
                print("✅ Chat endpoint working")
                print(f"📝 Response: {data['message']['content'][:100]}...")
            else:
                print("❌ Unexpected chat response format")
                print(f"📝 Response: {response.text}")
        elif response.status_code == 404:
            print("❌ Chat endpoint not supported, trying /api/generate...")
            return test_generate_endpoint(base_url, model_name)
        else:
            print(f"❌ Chat endpoint failed with status {response.status_code}")
            print(f"📝 Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Chat request timed out (model might be loading)")
        print("💡 Wait a moment and try again")
        return False
    except Exception as e:
        print(f"❌ Chat endpoint error: {e}")
        return False
    
    print("\n🎉 All tests passed! Ollama is working correctly.")
    return True

def test_generate_endpoint(base_url, model_name):
    """Test the generate endpoint as fallback"""
    
    gen_payload = {
        "model": model_name,
        "prompt": "Hello, are you working?",
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 50
        }
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/generate",
            json=gen_payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if "response" in data:
                print("✅ Generate endpoint working")
                print(f"📝 Response: {data['response'][:100]}...")
                return True
            else:
                print("❌ Unexpected generate response format")
                print(f"📝 Response: {response.text}")
        else:
            print(f"❌ Generate endpoint failed with status {response.status_code}")
            print(f"📝 Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Generate endpoint error: {e}")
    
    return False

def test_llm_engine():
    """Test your LLMEngine class specifically"""
    print("\n🧪 Testing your LLMEngine class...")
    
    try:
        # Import your LLMEngine (adjust path as needed)
        sys.path.append('.')  # Add current directory to path
        from services.llm_engine import LLMEngine
        
        # Initialize with Ollama
        llm = LLMEngine(provider="ollama", model="llama3.2:3b-instruct")
        
        # Test invoke
        response = llm.invoke("Say hello in one sentence.")
        print(f"✅ LLMEngine working")
        print(f"📝 Response: {response[:100]}...")
        
    except ImportError as e:
        print(f"❌ Cannot import LLMEngine: {e}")
        print("💡 Make sure the path to your LLMEngine is correct")
    except Exception as e:
        print(f"❌ LLMEngine error: {e}")

if __name__ == "__main__":
    print("🚀 Ollama Debug Tool")
    print("=" * 50)
    
    if test_ollama_connection():
        test_llm_engine()
    
    print("\n" + "=" * 50)
    print("Debug complete!")