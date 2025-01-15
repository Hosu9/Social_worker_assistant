import os
import json
import openai
from dotenv import load_dotenv
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential

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
                description = data.get("asiasisalto", "")
                participants = data.get("osallistujat", "")
                if description:
                    parsed_content.append(description)
                if participants:
                    parsed_content.append(f"Osallistujat: {participants}")
            else:
                parsed_content.append(content)  # Jos ei JSON, käytetään raakatekstiä
        except json.JSONDecodeError:
            parsed_content.append(content)  # Ei JSON, palautetaan raakateksti
    print("Parsed content:", parsed_content)
    # Muotoile vastaukset selkeiksi lauseiksi
    return ' '.join(parsed_content).replace("\n", " ").strip()



def get_vector_from_openai(input_text, azure_oai_endpoint, azure_oai_key, azure_oai_embedding_deployment):
    """
    Luo vektorin käyttäjän tekstisyötteestä Azure OpenAI -palvelun avulla.
    """
    try:
        # OpenAI asetukset
        openai.api_type = "azure"
        openai.api_key = azure_oai_key
        openai.api_base = azure_oai_endpoint
        openai.api_version = "2024-08-01-preview"

        # Lähetä kysely Azure OpenAI:lle
        response = openai.Embedding.create(
            engine=azure_oai_embedding_deployment,
            input=input_text
        )

        # Tarkista vastaus
        if not response or 'data' not in response or not response['data']:
            raise ValueError("Azure OpenAI ei palauttanut vektoria.")

        # Palauta vektori
        return response['data'][0]['embedding']

    except Exception as ex:
        raise ValueError(f"Virhe OpenAI:n käsittelyssä: {ex}")

def get_significant_events(input_text):
    """
    Hakee Azure Search -indeksistä 10 merkitsevintä dokumenttia annetun syötteen perusteella.
    """
    load_dotenv()
    azure_search_index = os.getenv("AZURE_SEARCH_INDEX")
    azure_search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
    azure_search_api_key = os.getenv("AZURE_SEARCH_API_KEY")
    azure_oai_endpoint = os.getenv("AZURE_OAI_ENDPOINT")
    azure_oai_deployment = os.getenv("AZURE_OAI_DEPLOYMENT")
    azure_oai_key = os.getenv("AZURE_OAI_KEY")
    azure_oai_embedding_deployment = os.getenv("AZURE_OAI_EMBEDDING_DEPLOYMENT")

    search_client = SearchClient(
        endpoint=azure_search_endpoint,
        index_name=azure_search_index,
        credential=AzureKeyCredential(azure_search_api_key)
    )

    # Luo vektori käyttäjän syötteestä
    vector = get_vector_from_openai(input_text, azure_oai_endpoint, azure_oai_key, azure_oai_embedding_deployment)

    # Määritä haku
    search_query = {
        "search": "*",
        "count": True,
        "vectorQueries": [
            {
                "field": "text_vector",
                "vector": vector,
                "k": 10
            }
        ],
        "select": [
            "documents.metaCustom.asiakirjan_metadata.alkuperainen_luontiaika",
            "documents.metaCustom.asiakirjan_metadata.lisakentat"
        ]  
    }

    try:
        results = search_client.search(search_query)
    except Exception as ex:
        raise ValueError(f"Virhe haussa: {ex}")

    # Käsittele hakutulokset
    events = []
    for result in results:
        documents = result.get("documents", [])
        for document in documents:
            original_creation_time = document.get("metaCustom", {}).get("asiakirjan_metadata", {}).get("alkuperainen_luontiaika", "N/A")
            additional_field_value = "N/A"
            for field in document.get("metaCustom", {}).get("asiakirjan_metadata", {}).get("lisakentat", []):
                if "value" in field:
                    additional_field_value = field["value"]
                    break
            events.append({
                "original_creation_time": original_creation_time,
                "additional_field_value": additional_field_value
            })
            if len(events) >= 10:
                break
        if len(events) >= 10:
            break

    return events

def generate_answer_with_gpt(input_text, events, azure_oai_endpoint, azure_oai_key, azure_oai_deployment):
    """
    Luo vastaus GPT-mallilla käyttäen haettuja tapahtumia ja käyttäjän kysymystä.
    """
    try:
        # OpenAI asetukset
        openai.api_type = "azure"
        openai.api_key = azure_oai_key
        openai.api_base = azure_oai_endpoint
        openai.api_version = "2024-08-01-preview"

        # Muodosta konteksti dokumenteista
        context = "\n".join([
            f"- Päivämäärä: {event['original_creation_time']}, Tapahtuma: {event['additional_field_value']}"
            for event in events
        ])

        # Luo viestit chat-komennolle
        messages = [
            {"role": "system", "content": "Olet avulias assistentti ja käsittelet suomeksi vain ja ainoastaan synteettistä asiakastietoa. Älä keksi omia tietoja. Jos tietoa ei ole, vastaa 'Ei tietoa'."},
            {"role": "user", "content": f"Konteksti:\n{context}\n\nKysymys: {input_text}\n\nVastaa mahdollisimman tarkasti."}
        ]

        # Lähetä kysely GPT:lle
        response = openai.ChatCompletion.create(
            engine=azure_oai_deployment,
            messages=messages,
            max_tokens=700,
            temperature=0.2
        )

        return response.choices[0].message['content'].strip()

    except Exception as ex:
        raise ValueError(f"Virhe OpenAI:n käsittelyssä: {ex}")

def main():
    input_text = "Kerro Emmasta 10 merkitsevää elämäntapahtumaa"
    
    # Hae merkitsevät tapahtumat
    events = get_significant_events(input_text)
    if not events:
        print("Ei löydetty tapahtumia.")
        return

    # Luo vastaus GPT:llä
    azure_oai_endpoint = os.getenv("AZURE_OAI_ENDPOINT")
    azure_oai_key = os.getenv("AZURE_OAI_KEY")
    azure_oai_deployment = os.getenv("AZURE_OAI_DEPLOYMENT")  # GPT-mallin nimi
    answer = generate_answer_with_gpt(input_text, events, azure_oai_endpoint, azure_oai_key, azure_oai_deployment)
    
    print("\nGeneroitu vastaus:")
    print(answer)

if __name__ == "__main__":
    main()

# Chatbox with LLM
def chat_with_llm(question):
    load_dotenv()
    azure_oai_endpoint = os.getenv("AZURE_OAI_ENDPOINT")
    azure_oai_key = os.getenv("AZURE_OAI_KEY")
    azure_oai_deployment = os.getenv("AZURE_OAI_DEPLOYMENT")
    azure_search_index = os.getenv("AZURE_SEARCH_INDEX")
    azure_search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
    azure_search_api_key = os.getenv("AZURE_SEARCH_API_KEY")
    # Lataa promptit
    prompt_file_path = "prompts.json"
    if not os.path.exists(prompt_file_path):
        raise FileNotFoundError(f"Prompt-tiedostoa '{prompt_file_path}' ei löytynyt.")
    prompts = load_prompts(prompt_file_path)
    # Tee haku Azure Cognitive Searchissa
    search_client = SearchClient(endpoint=azure_search_endpoint,
                                 index_name=azure_search_index,
                                 credential=AzureKeyCredential(azure_search_api_key))
    search_query = {"queryType": "simple", "search": question, "searchMode": "all"}
    results = search_client.search(search_query)
    # Käsittele hakutulokset ja rakenna selkeä vastaus
    context = process_search_results(results)
    # Valitse promptityyppi ja muodosta viestit
    prompt_type = "default"
    messages = get_prompt(prompts, prompt_type, context, question)
    # Lähetä kysely Azure OpenAI:lle ja palauta vastaus
    return get_vector_from_openai(messages, azure_oai_endpoint, azure_oai_key, azure_oai_deployment)

# def main():
    try:
        # Lataa ympäristömuuttujat
        load_dotenv()
        azure_oai_endpoint = os.getenv("AZURE_OAI_ENDPOINT")
        azure_oai_key = os.getenv("AZURE_OAI_KEY")
        azure_oai_deployment = os.getenv("AZURE_OAI_DEPLOYMENT")
        azure_search_index = os.getenv("AZURE_SEARCH_INDEX")
        azure_search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
        azure_search_api_key = os.getenv("AZURE_SEARCH_API_KEY")

        # Tarkista ympäristömuuttujien olemassaolo
        if not all([azure_oai_endpoint, azure_oai_key, azure_oai_deployment,
                    azure_search_index, azure_search_endpoint, azure_search_api_key]):
            raise ValueError("Yksi tai useampi ympäristömuuttuja puuttuu.")

        # Lataa promptit
        prompt_file_path = "prompts.json"
        if not os.path.exists(prompt_file_path):
            raise FileNotFoundError(f"Prompt-tiedostoa '{prompt_file_path}' ei löytynyt.")
        prompts = load_prompts(prompt_file_path)

        # Yhdistä Azure Cognitive Searchiin
        search_client = SearchClient(endpoint=azure_search_endpoint,
                                     index_name=azure_search_index,
                                     credential=AzureKeyCredential(azure_search_api_key))

        # Kysy käyttäjältä
        user_input = "Kerro Emmasta 10 merkitsevää elämäntapahtumaa"
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
        response = get_vector_from_openai(messages, azure_oai_endpoint, azure_oai_key, azure_oai_deployment)
        print("Vastaus:", response)
        return response

    except Exception as ex:
        print("Virhe:", ex)

# if __name__ == "__main__":
    # main()
    # chat_with_llm(question=input("Kysymys: "))
    # get_significant_events()