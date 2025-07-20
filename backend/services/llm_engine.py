#llm_engine
"""import requests
from langchain_core.runnables import Runnable
class OpenRouterLLM(Runnable):
    def __init__(self, api_key, model="deepseek/deepseek-r1-0528-qwen3-8b:free"):
        self.api_key = api_key
        self.model = model
        self.endpoint = "https://openrouter.ai/api/v1/chat/completions"

    def _call(self, prompt: str) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        response = requests.post(self.endpoint, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"OpenRouter API error {response.status_code}: {response.text}")
        result = response.json()
        return result["choices"][0]["message"]["content"]

    def invoke(self, input, *args, **kwargs):
        if isinstance(input, str):
            prompt = input
        elif isinstance(input, dict):
            prompt = input.get("input", "")
        elif hasattr(input, "to_string"):
            prompt = input.to_string()
        else:
            prompt = str(input)
        return self._call(prompt)"""
# llm_engine.py
import requests
from langchain_core.runnables import Runnable

class LLMEngine(Runnable):
    def __init__(self, provider="ollama", model="mistral", api_key=None):
        self.provider = provider.lower()
        self.api_key = api_key
        self.model = model

        if self.provider == "openrouter":
            self.endpoint = "https://openrouter.ai/api/v1/chat/completions"
            self.model_id = self._get_openrouter_model(model)

        elif self.provider == "ollama":
            self.endpoint = "http://localhost:11434/api/generate"
            self.model_id = model  

        else:
            raise ValueError("Unsupported provider. Choose 'openrouter' or 'ollama'.")

    def _get_openrouter_model(self, model_name):
        mapping = {
            "deepseek": "deepseek/deepseek-r1-0528-qwen3-8b:free",
            "mistral": "mistralai/mistral-7b-instruct:free",
        }
        return mapping.get(model_name, model_name)

    def _call_openrouter(self, prompt):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model_id,
            "messages": [{"role": "user", "content": prompt}]
        }
        res = requests.post(self.endpoint, headers=headers, json=payload)
        if res.status_code != 200:
            raise RuntimeError(f"OpenRouter error {res.status_code}: {res.text}")
        return res.json()["choices"][0]["message"]["content"]

    def _call_ollama(self, prompt):
        payload = {
            "model": self.model_id,
            "prompt": prompt,
            "stream": False
        }
        res = requests.post(self.endpoint, json=payload)
        if res.status_code != 200:
            raise RuntimeError(f"Ollama error {res.status_code}: {res.text}")
        return res.json()["response"]

    def _call(self, prompt):
        if self.provider == "openrouter":
            return self._call_openrouter(prompt)
        elif self.provider == "ollama":
            return self._call_ollama(prompt)

    def invoke(self, input, *args, **kwargs):
        if isinstance(input, str):
            prompt = input
        elif isinstance(input, dict):
            prompt = input.get("input", "")
        elif hasattr(input, "to_string"):
            prompt = input.to_string()
        else:
            prompt = str(input)
        return self._call(prompt)
