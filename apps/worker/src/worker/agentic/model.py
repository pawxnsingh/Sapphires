from langchain.chat_models import init_chat_model
from worker.config import get_settings

setting = get_settings()

model_azure = init_chat_model(
    # model="azure_openai:gpt-4.1",
    model= setting.azure_openai_deployment_name,
    # azure_deployment=setting.azure_openai_deployment_name,
    api_version=setting.azure_openai_api_version,
    api_key=setting.azure_openai_api_key,
    azure_endpoint=setting.azure_openai_endpoint,
)
# 