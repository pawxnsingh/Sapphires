from langchain.chat_models import init_chat_model
from worker.config import Settings

setting = Settings()

model_azure = init_chat_model(
    model="azure_openai:gpt-4.1",
    azure_deployment="gpt-4.1",
    api_version=setting.azure_openai_api_version,
    api_key = setting.azure_openai_api_key,
    azure_endpoint= setting.azure_openai_endpoint
)