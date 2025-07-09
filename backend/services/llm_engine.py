#llm_engine
import requests
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
        return self._call(prompt)
