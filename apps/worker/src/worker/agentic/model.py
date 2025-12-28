from langchain.chat_models import init_chat_model
from worker.config import Settings

setting = Settings()

model_azure = init_chat_model(
    model = setting.azure_openai_deployment_name,
    temperature=0.1,
    azure_deployment=setting.azure_openai_deployment_name,
    api_version = setting.azure_openai_api_version
)

