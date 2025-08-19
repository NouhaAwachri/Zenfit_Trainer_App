# llm_engine.py - FIXED VERSION with better timeout handling
import os
import time
import random
import requests
from dotenv import load_dotenv
from langchain_core.runnables import Runnable

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

class LLMEngine(Runnable):
    def __init__(
        self,
        provider="openrouter",
        model="deepseek",
        api_key=OPENROUTER_API_KEY,
        timeout=30,
        default_temperature=0.2,
        default_max_tokens=512,
        app_url=None,
        app_title=None,
    ):
        self.provider = (provider or "").lower()
        self.api_key = api_key
        self.model = model
        self.timeout = int(timeout)
        self.default_temperature = default_temperature
        self.default_max_tokens = default_max_tokens

        if self.provider == "openrouter":
            self.endpoint = "https://openrouter.ai/api/v1/chat/completions"
            self.model_id = self._get_openrouter_model(model)
            self.headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            if app_url:
                self.headers["HTTP-Referer"] = app_url
            if app_title:
                self.headers["X-Title"] = app_title

        elif self.provider == "ollama":
            self.base_url = "http://localhost:11434"
            self.chat_endpoint = f"{self.base_url}/api/chat"
            self.gen_endpoint = f"{self.base_url}/api/generate"
            self.model_id = model
            self.headers = {"Content-Type": "application/json"}

        else:
            raise ValueError("Unsupported provider. Choose 'openrouter' or 'ollama'.")

    def _get_openrouter_model(self, model_name: str) -> str:
        key = (model_name or "").lower()
        mapping = {
            "deepseek": "deepseek/deepseek-r1-0528-qwen3-8b:free",
            "mistral": "mistralai/mistral-7b-instruct:free",
            "llama3": "meta-llama/llama-3.3-70b-instruct:free",
            "llama3-70b": "meta-llama/llama-3.3-70b-instruct",
        }
        return mapping.get(key, model_name)

    def _call_openrouter(self, prompt, *, system=None, temperature=None, max_tokens=None, user=None):
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model_id,
            "messages": messages,
            "temperature": self.default_temperature if temperature is None else float(temperature),
            "max_tokens": self.default_max_tokens if max_tokens is None else int(max_tokens),
        }
        if user:
            payload["user"] = str(user)

        backoff = 1.0
        for attempt in range(3):
            res = requests.post(self.endpoint, headers=self.headers, json=payload, timeout=self.timeout)
            if res.status_code == 429 and attempt < 2:
                sleep_for = backoff + random.uniform(0, 0.3)
                print(f"[LLMEngine] 429 rate-limited. Retrying in {sleep_for:.1f}s...")
                time.sleep(sleep_for)
                backoff *= 2
                continue
            if res.status_code != 200:
                raise RuntimeError(f"OpenRouter error {res.status_code}: {res.text}")
            data = res.json()
            if "error" in data:
                raise RuntimeError(f"OpenRouter API error: {data['error']}")
            return data["choices"][0]["message"]["content"]

        raise RuntimeError("OpenRouter retry loop exhausted (429).")

    def _call_ollama(self, prompt, *, system=None, temperature=None, max_tokens=None, options=None):
        temp = self.default_temperature if temperature is None else float(temperature)
        max_tok = self.default_max_tokens if max_tokens is None else int(max_tokens)

        opts = dict(options or {})
        opts.setdefault("temperature", temp)
        opts.setdefault("num_predict", max_tok)

        # 🔧 FIX: Try chat endpoint first, but handle timeouts properly
        chat_payload = {
            "model": self.model_id,
            "messages": ([{"role": "system", "content": system}] if system else []) +
                        [{"role": "user", "content": prompt}],
            "stream": False,
            "options": opts,
        }
        
        try:
            print(f"🤖 Calling Ollama chat endpoint (timeout: {self.timeout}s)...")
            res = requests.post(
                self.chat_endpoint, 
                json=chat_payload, 
                headers=self.headers, 
                timeout=self.timeout
            )
            
            if res.status_code == 404:
                print("⚠️ Chat endpoint not supported, trying generate...")
                return self._call_ollama_generate(prompt, system=system, options=opts)
            elif res.status_code != 200:
                raise RuntimeError(f"Ollama chat error {res.status_code}: {res.text}")
            
            data = res.json()
            if "message" in data and "content" in data["message"]:
                print("✅ Chat endpoint successful")
                return data["message"]["content"]
            elif "messages" in data and data["messages"]:
                print("✅ Chat endpoint successful (messages format)")
                return data["messages"][-1].get("content", "")
            else:
                print("⚠️ Unexpected chat response format, trying generate...")
                return self._call_ollama_generate(prompt, system=system, options=opts)
                
        except requests.exceptions.Timeout:
            print(f"❌ Ollama chat timeout after {self.timeout}s")
            raise RuntimeError(f"Ollama chat request timed out after {self.timeout} seconds")
        except requests.exceptions.ConnectionError:
            raise RuntimeError("Cannot connect to Ollama server")
        except Exception as e:
            # 🔧 FIX: Only fallback for non-timeout errors
            if "timeout" in str(e).lower():
                raise RuntimeError(f"Ollama request timed out: {e}")
            print(f"⚠️ Chat endpoint error: {e}, trying generate...")
            return self._call_ollama_generate(prompt, system=system, options=opts)

    def _call_ollama_generate(self, prompt, *, system=None, options=None):
        """Separate method for generate endpoint"""
        gen_payload = {
            "model": self.model_id,
            "prompt": (f"{system}\n\n{prompt}" if system else prompt),
            "stream": False,
            "options": options or {},
        }
        
        try:
            print(f"🤖 Calling Ollama generate endpoint (timeout: {self.timeout}s)...")
            res = requests.post(
                self.gen_endpoint, 
                json=gen_payload, 
                headers=self.headers, 
                timeout=self.timeout
            )
            
            if res.status_code != 200:
                raise RuntimeError(f"Ollama generate error {res.status_code}: {res.text}")
            
            response_text = res.json().get("response", "")
            print("✅ Generate endpoint successful")
            return response_text
            
        except requests.exceptions.Timeout:
            print(f"❌ Ollama generate timeout after {self.timeout}s")
            raise RuntimeError(f"Ollama generate request timed out after {self.timeout} seconds")
        except requests.exceptions.ConnectionError:
            raise RuntimeError("Cannot connect to Ollama server")

    def _call(self, prompt, **kwargs):
        if self.provider == "openrouter":
            return self._call_openrouter(prompt, **kwargs)
        else:
            return self._call_ollama(prompt, **kwargs)

    def invoke(self, input, *args, **kwargs):
        if isinstance(input, str):
            prompt = input
        elif isinstance(input, dict):
            prompt = input.get("input", "")
        elif hasattr(input, "to_string"):
            prompt = input.to_string()
        else:
            prompt = str(input)
        return self._call(prompt, **kwargs)

    def quick_invoke(self, prompt, max_tokens=50, timeout=10):
        """Quick method for fast responses"""
        original_timeout = self.timeout
        original_max_tokens = self.default_max_tokens
        
        try:
            self.timeout = timeout
            self.default_max_tokens = max_tokens
            return self.invoke(prompt)
        finally:
            self.timeout = original_timeout
            self.default_max_tokens = original_max_tokens

# 🔧 USAGE EXAMPLE - Update your workout_logs.py with this:

# For normal operations (allow longer time for complex parsing):
# llm = LLMEngine(provider="ollama", model="qwen2.5:3b-instruct", timeout=45, default_max_tokens=256)

# For quick operations (health checks, simple responses):
# llm_quick = LLMEngine(provider="ollama", model="qwen2.5:3b-instruct", timeout=15, default_max_tokens=100)