import os
import json
import openai
from dotenv import load_dotenv
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential

def load_prompts(prompt_file_path):
    with open(prompt_file_path, "r", encoding="utf-8") as file:
        return json.load(file)

def process_search_results(results):
    context = []
    for result in results:
        documents = result.get("documents", [])
        for document in documents:
            original_creation_time = document.get("metaCustom", {}).get("asiakirjan_metadata", {}).get("alkuperainen_luontiaika", "N/A")
            lisakentat = document.get("metaCustom", {}).get("asiakirjan_metadata", {}).get("lisakentat", [])
            content = ", ".join([field.get("value", "N/A") for field in lisakentat])
            if original_creation_time != "N/A" or content != "N/A":
                context.append({
                    "original_creation_time": original_creation_time,
                    "content": content
                })
    return "\n".join(
        [f"Päivämäärä: {item['original_creation_time']}, Tapahtuma: {item['content']}" for item in context]
    )

def get_prompt(prompts, prompt_type, context, user_input):
    prompt = prompts[prompt_type]
    system_message = prompt[0]["content"]
    user_message = prompt[1]["content"].format(context=context, user_input=user_input)
    return [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message}
    ]

def get_chat_response(messages, azure_oai_endpoint, azure_oai_key, azure_oai_deployment):
    try:
        openai.api_type = "azure"
        openai.api_key = azure_oai_key
        openai.api_base = azure_oai_endpoint
        openai.api_version = "2024-08-01-preview"
        response = openai.ChatCompletion.create(
            engine=azure_oai_deployment,
            messages=messages,
            max_tokens=500,
            temperature=0.2
        )
        return response['choices'][0]['message']['content'].strip()
    except Exception as ex:
        raise ValueError(f"Virhe OpenAI:n käsittelyssä: {ex}")

def rag_chat(question):
    try:
        load_dotenv()
        azure_oai_endpoint = os.getenv("AZURE_OAI_ENDPOINT")
        azure_oai_key = os.getenv("AZURE_OAI_KEY")
        azure_oai_deployment = os.getenv("AZURE_OAI_DEPLOYMENT")
        azure_search_index = os.getenv("AZURE_SEARCH_INDEX")
        azure_search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
        azure_search_api_key = os.getenv("AZURE_SEARCH_API_KEY")
        prompt_file_path = "prompts.json"
        prompts = load_prompts(prompt_file_path)["prompts"]
        user_input = question
        search_client = SearchClient(endpoint=azure_search_endpoint,
                                     index_name=azure_search_index,
                                     credential=AzureKeyCredential(azure_search_api_key))
        search_query = {"queryType": "simple", "search": user_input, "searchMode": "all"}
        results = search_client.search(search_query)
        context = process_search_results(results)
        prompt_type = "default"
        messages = get_prompt(prompts, prompt_type, context, user_input)
        response = get_chat_response(messages, azure_oai_endpoint, azure_oai_key, azure_oai_deployment)
        return response
    except Exception as ex:
        return f"Virhe: {ex}"

if __name__ == "__main__":
    question = input("Kirjoita kysymys: ")
    response = rag_chat(question)
    print("Vastaus:", response)