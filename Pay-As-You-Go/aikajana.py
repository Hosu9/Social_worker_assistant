import os
import json
from dotenv import load_dotenv
import openai
from azure.storage.blob import BlobServiceClient
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient

# Funktio promottien lataamiseksi
def load_prompts(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        return json.load(file)["prompts"]

# Funktio oikean promptin hakemiseen
def get_prompt(prompts, prompt_type, context, user_input):
    if prompt_type not in prompts:
        raise ValueError(f"Prompt type '{prompt_type}' ei löydy.")
    prompt = prompts[prompt_type]
    for message in prompt:
        message['content'] = message['content'].replace("{context}", context).replace("{user_input}", user_input)
    return prompt

# Haku tulosten käsittely selkeäksi vastaukseksi
def process_search_results(results):
    search_content = []
    for result in results:
        chunk_content = result.get("chunk", result.get("content"))
        if chunk_content:
            search_content.append(chunk_content)
    if not search_content:
        return "Valitettavasti ei löytynyt tietoa tästä aiheesta."

    # Poimi vain relevantit osiot JSON:sta
    parsed_content = []
    for content in search_content:
        try:
            data = json.loads(content)  # Yritetään muuntaa JSON-objektiksi
            if isinstance(data, dict):
                # Poimitaan vain selkeät, relevanteimmat kentät
                description = data.get("kuvaus", "")
                participants = data.get("osallistujat", "")
                if description:
                    parsed_content.append(description)
                if participants:
                    parsed_content.append(f"Osallistujat: {participants}")
            else:
                parsed_content.append(content)  # Jos ei JSON, käytetään raakatekstiä
        except json.JSONDecodeError:
            parsed_content.append(content)  # Ei JSON, palautetaan raakateksti

    # Muotoile vastaukset selkeiksi lauseiksi
    return ' '.join(parsed_content).replace("\n", " ").strip()

# OpenAI-vastausten käsittely
def get_openai_response(messages, azure_oai_endpoint, azure_oai_key, azure_oai_deployment):
    try:
        # OpenAI asetukset
        openai.api_type = "azure"
        openai.api_key = azure_oai_key
        openai.api_base = azure_oai_endpoint
        openai.api_version = "2024-10-01-preview"

        # Lähetä kysely Azure OpenAI:lle
        response = openai.ChatCompletion.create(
            engine=azure_oai_deployment,
            messages=messages,
            temperature=0.5,
            max_tokens=500
        )

        # Tarkista vastaus
        if not response or 'choices' not in response or not response['choices']:
            return "Azure OpenAI ei palauttanut vastausta."

        # Palauta vastaus selkeänä tekstinä
        return response['choices'][0]['message']['content'].strip()

    except Exception as ex:
        return f"Virhe OpenAI:n käsittelyssä: {ex}"

def main():
    try:
        # Lataa ympäristömuuttujat
        load_dotenv()
        azure_oai_endpoint = os.getenv("AZURE_OAI_ENDPOINT")
        azure_oai_key = os.getenv("AZURE_OAI_KEY")
        azure_oai_deployment = os.getenv("AZURE_OAI_DEPLOYMENT")
        azure_storage_account_name = os.getenv("AZURE_STORAGE_ACCOUNT_NAME")
        azure_storage_account_key = os.getenv("AZURE_STORAGE_ACCOUNT_KEY")
        azure_storage_container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME")
        azure_storage_blob_name = os.getenv("AZURE_STORAGE_BLOB_NAME")
        azure_search_index = os.getenv("AZURE_SEARCH_INDEX")
        azure_search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
        azure_search_api_key = os.getenv("AZURE_SEARCH_API_KEY")

        # Tarkista ympäristömuuttujien olemassaolo
        if not all([azure_oai_endpoint, azure_oai_key, azure_oai_deployment,
                    azure_storage_account_name, azure_storage_account_key,
                    azure_storage_container_name, azure_storage_blob_name,
                    azure_search_index, azure_search_endpoint, azure_search_api_key]):
            raise ValueError("Yksi tai useampi ympäristömuuttuja puuttuu.")

        # Lataa promptit
        prompt_file_path = "prompts.json"
        if not os.path.exists(prompt_file_path):
            raise FileNotFoundError(f"Prompt-tiedostoa '{prompt_file_path}' ei löytynyt.")
        prompts = load_prompts(prompt_file_path)

        # Yhdistä Azure Blob Storageen ja lataa data
        blob_service_client = BlobServiceClient(
            account_url=f"https://{azure_storage_account_name}.blob.core.windows.net",
            credential=azure_storage_account_key
        )
        blob_client = blob_service_client.get_blob_client(
            container=azure_storage_container_name,
            blob=azure_storage_blob_name
        )
        blob_data = blob_client.download_blob().readall().decode('utf-8')
        print("Blob data retrieved successfully.")

        # Yhdistä Azure Cognitive Searchiin
        search_client = SearchClient(endpoint=azure_search_endpoint,
                                     index_name=azure_search_index,
                                     credential=AzureKeyCredential(azure_search_api_key))

        # Kysy käyttäjältä
        user_input = input("Kirjoita kysymyksesi: ").strip()
        if not user_input:
            raise ValueError("Kysymys ei voi olla tyhjä.")

        # Tee haku Azure Cognitive Searchissa
        search_query = {"queryType": "simple", "search": user_input, "searchMode": "all"}
        results = search_client.search(search_query)

        # Käsittele hakutulokset ja rakenna selkeä vastaus
        context = process_search_results(results)

        # Valitse promptityyppi ja muodosta viestit
        prompt_type = "default"
        messages = get_prompt(prompts, prompt_type, context, user_input)

        # Lähetä kysely Azure OpenAI:lle ja tulosta vastaus
        response = get_openai_response(messages, azure_oai_endpoint, azure_oai_key, azure_oai_deployment)
        print("Vastaus:", response)

    except Exception as ex:
        print("Virhe:", ex)

if __name__ == "__main__":
    main()
