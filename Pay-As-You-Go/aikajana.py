import os
import json
import openai
from dotenv import load_dotenv
from flask import jsonify
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential

def get_vector_from_openai(input_text, azure_oai_endpoint, azure_oai_key, azure_oai_embedding_deployment):
    try:
        openai.api_type = "azure"
        openai.api_key = azure_oai_key
        openai.api_base = azure_oai_endpoint
        openai.api_version = "2024-08-01-preview"
        response = openai.Embedding.create(
            engine=azure_oai_embedding_deployment,
            input=input_text
        )
        if not response or 'data' not in response or not response['data']:
            raise ValueError("Azure OpenAI ei palauttanut vektoria.")
        return response['data'][0]['embedding']
    except Exception as ex:
        raise ValueError(f"Virhe OpenAI:n käsittelyssä: {ex}")

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
    vector = get_vector_from_openai(input_text, azure_oai_endpoint, azure_oai_key, azure_oai_embedding_deployment)
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
    events = []
    for result in results:
        for document in result.get("documents", []):
            events.append(
                {
                    "Vuosi": document.get("metaCustom", {}).get("asiakirjan_metadata", {}).get("alkuperainen_luontiaika", "N/A"),
                    "Kertomus": next(
                        (field.get("value", "N/A") for field in document.get("metaCustom", {}).get("asiakirjan_metadata", {}).get("lisakentat", []) if "value" in field),
                        "N/A"
                    )
                }
            )
    return events

def generate_answer_with_gpt(input_text, events, azure_oai_endpoint, azure_oai_key, azure_oai_deployment):
    try:
        openai.api_type = "azure"
        openai.api_key = azure_oai_key
        openai.api_base = azure_oai_endpoint
        openai.api_version = "2024-08-01-preview"
        context = "\n".join([
            f"- Päivämäärä: {event['Vuosi']}, Tapahtuma: {event['Kertomus']}"
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
        response = openai.ChatCompletion.create(
            engine=azure_oai_deployment,
            messages=messages,
            max_tokens=700,
            temperature=0.2
        )
        return response.choices[0].message['content'].strip()
    except Exception as ex:
        raise ValueError(f"Virhe OpenAI:n käsittelyssä: {ex}")

# def main():
    input_text = "Kerro Emmasta 10 merkitsevää elämäntapahtumaa"
    events = get_significant_events(input_text)
    if not events:
        return jsonify({"error": "Ei löydetty tapahtumia."}), 404
    azure_oai_endpoint = os.getenv("AZURE_OAI_ENDPOINT")
    azure_oai_key = os.getenv("AZURE_OAI_KEY")
    azure_oai_deployment = os.getenv("AZURE_OAI_DEPLOYMENT")
    answer = generate_answer_with_gpt(input_text, events, azure_oai_endpoint, azure_oai_key, azure_oai_deployment)
    return jsonify({"timeline": events, "answers": answers})

# if __name__ == "__main__":
    main()

def get_hypothetical_data():
    return [
        {"Vuosi": "2000", "Kertomus": "Syntymä"},
        {"Vuosi": "2005", "Kertomus": "Aloitti koulun"},
        {"Vuosi": "2010", "Kertomus": "Muutto uuteen kaupunkiin"},
        {"Vuosi": "2012", "Kertomus": "Voitti urheilukilpailun"},
        {"Vuosi": "2015", "Kertomus": "Valmistui lukiosta"},
        {"Vuosi": "2016", "Kertomus": "Aloitti yliopiston"},
        {"Vuosi": "2018", "Kertomus": "Vaihto-opiskelu ulkomailla"},
        {"Vuosi": "2020", "Kertomus": "Valmistui yliopistosta"},
        {"Vuosi": "2021", "Kertomus": "Aloitti ensimmäisen työpaikan"},
        {"Vuosi": "2023", "Kertomus": "Sai ylennyksen"}
    ]

def main():
    input_text = "Kerro Emmasta 10 merkitsevää elämäntapahtumaa"
    events = get_hypothetical_data()
    if not events:
        return jsonify({"error": "Ei löydetty tapahtumia."}), 404
    answers = ["Hypoteettinen vastaus"]
    return jsonify({"timeline": events, "answers": answers})

if __name__ == "__main__":
    main()