import os
import json
import openai
from dotenv import load_dotenv
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential

# Käsittelee hakutulokset ja palauttaa kontekstin
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
    
# Hakee 10 merkitsevää tapahtumaa
def get_significant_events(input_text):
    load_dotenv()
    azure_search_index = os.getenv("AZURE_SEARCH_INDEX")
    azure_search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
    azure_search_api_key = os.getenv("AZURE_SEARCH_API_KEY")
    azure_oai_endpoint = os.getenv("AZURE_OAI_ENDPOINT")
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
        "select": "documents",
        "count": True,
        "vectorQueries": [
            {
                "field": "text_vector",
                "kind": "text",
                "vector": vector,
                "k": 10
            }
        ],
        "select": [
            "documents.metaCustom.asiakirjan_metadata.alkuperainen_luontiaika",
            "documents.metaCustom.asiakirjan_metadata.lisakentat.value"
        ]  
    }

    try:
        results = search_client.search(search_query)
    except Exception as ex:
        raise ValueError(f"Virhe haussa: {ex}")
        
    # Käsittele hakutulokset
    events = [
        {
            "original_creation_time": document.get("metaCustom", {}).get("asiakirjan_metadata", {}).get("alkuperainen_luontiaika", "N/A"),
            "additional_field_value": next(
                (field.get("value", "N/A") for field in document.get("metaCustom", {}).get("asiakirjan_metadata", {}).get("lisakentat", []) if "value" in field),
                "N/A"
            )
        }
        for result in results
        for document in result.get("documents", [])
    ]
    return events

def generate_answer_with_gpt(input_text, events, azure_oai_endpoint, azure_oai_key, azure_oai_deployment):
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

        messages = [
            {
            "role": "system",
            "content": (
                "Olet avulias ja tarkka assistentti, joka käsittelee suomeksi vain ja ainoastaan annettua asiakastietoa. "
                "Älä keksi omia tietoja. Määrittele mikä on merkitsevää elämäntapahtumaa. "
                "Muotoile vastausta kolmella sanalla. "
                "Laajenna datan hakua siten, että saamme joka vuodelta vähintään yhden merkitsevän elämäntapahtuman."
                "Vastaa kysymykseen annetun kontekstin perusteella seuraavassa muodossa: {\"timeline\": [{\"date\": \"Päivämäärä\", \"description\": \"Tapahtuma\"}"
            )
            },
            {
            "role": "user",
            "content": f"Konteksti:\n{context}\n\nKysymys: {input_text}\n\nVastaa mahdollisimman tarkasti."
            }
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
    """
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
    """
    answer = {"timeline": [
  {"date": "2021-03-15", "description": "Emma ja sisarukset sijoitettiin kiireellisesti."},
  {"date": "2021-03-26", "description": "Sijoituksen yksityiskohdat sovittiin neuvottelussa."},
  {"date": "2021-07-22", "description": "Sijoitusjakson päättyminen ja perheen kotiinpaluu."},
  {"date": "2022-03-10", "description": "Tehostetun perhetyön lopettaminen."},
  {"date": "2023-05-01", "description": "Äidin itsemurhayritys, uusi sijoitus."},
  {"date": "2023-08-20", "description": "Sijoitusjakson päättymisestä ja kotiinpaluusta yhteenveto."},
  {"date": "2024-01-10", "description": "Verkostoneuvottelu tehostetun perhetyön jatkosta."},
  {"date": "2024-04-15", "description": "Ilmoitus Emman heikentyneistä kouluarvosanoista."},
  {"date": "2024-05-01", "description": "Emma aloitti uuden harrastuksen, kirjallisuuden."},
  {"date": "2024-12-10", "description": "Emma masentunut, lopetti kirjallisuuskerhon."}
  ]}
    """print(answer)"""
    return answer

if __name__ == "__main__":
    main()