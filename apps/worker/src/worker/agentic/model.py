from langchain.chat_models import init_chat_model
from worker.config import Settings

setting = Settings()

model_azure = init_chat_model(
    model=setting.azure_openai_deployment_name,
    model_provider="azure_openai",
    temperature=0.1,
    azure_deployment=setting.azure_openai_deployment_name,
    api_version=setting.azure_openai_api_version,
    api_key=setting.AZURE_OPENAI_API_KEY,
    azure_endpoint=setting.azure_openai_endpoint
)

