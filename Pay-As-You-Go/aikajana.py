import os
import json
import numpy as np
from dotenv import load_dotenv
import openai
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder="front", static_url_path="")

# Funktio OpenAI Embeddings -vektorien saamiseksi
def get_embedding(text, azure_oai_endpoint, azure_oai_key, azure_oai_deployment):
    openai.api_type = "azure"
    openai.api_key = azure_oai_key
    openai.api_base = azure_oai_endpoint
    openai.api_version = "2024-08-01-preview"

    response = openai.Embedding.create(
        engine=azure_oai_deployment,
        input=text
    )
    return response['data'][0]['embedding']

# Funktio indeksoidun datan hakemiseen Azure Cognitive Searchista
def search_indexed_data(query, azure_search_endpoint, azure_search_api_key, azure_search_index):
    search_client = SearchClient(endpoint=azure_search_endpoint,
                                 index_name=azure_search_index,
                                 credential=AzureKeyCredential(azure_search_api_key))

    vector = get_embedding(query, os.getenv("AZURE_OAI_ENDPOINT"),
                           os.getenv("AZURE_OAI_KEY"), os.getenv("AZURE_OAI_DEPLOYMENT"))

    results = search_client.search(
        search_text=None,
        vector=vector,
        top_k=5,
        vector_fields="content_vector"
    )
    return [result.get("content") for result in results]

# Funktio GPT-vastausten tuottamiseen RAG-pohjaisesti
def get_rag_response(context, user_input, azure_oai_endpoint, azure_oai_key, azure_oai_deployment):
    messages = [
        {"role": "system", "content": "Käytä vain annettua aineistoa vastataksesi käyttäjän kysymykseen. Älä keksi mitään tietoa."},
        {"role": "user", "content": f"Konteksti: {context}\n\nKysymys: {user_input}"}
    ]

    response = openai.ChatCompletion.create(
        engine=azure_oai_deployment,
        messages=messages,
        temperature=0.0,
        max_tokens=700
    )
    return response['choices'][0]['message']['content'].strip()

# Funktio OpenAI GPT-vastausten tuottamiseen
def get_openai_response(messages, azure_oai_endpoint, azure_oai_key, azure_oai_deployment):
    openai.api_type = "azure"
    openai.api_key = azure_oai_key
    openai.api_base = azure_oai_endpoint
    openai.api_version = "2024-08-01-preview"

    response = openai.ChatCompletion.create(
        engine=azure_oai_deployment,
        messages=messages,
        temperature=0.7,
        max_tokens=700
    )
    return response['choices'][0]['message']['content'].strip()

# Reitti etusivulle
@app.route("/")
def serve_index():
    return send_from_directory("front", "index.html")

# Aikajanan tiedon haku ja palautus automaattisesti GPT:ltä
@app.route("/api/timeline", methods=["POST"])
def generate_timeline():
    try:
        load_dotenv()
        azure_oai_endpoint = os.getenv("AZURE_OAI_ENDPOINT")
        azure_oai_key = os.getenv("AZURE_OAI_KEY")
        azure_oai_deployment = os.getenv("AZURE_OAI_DEPLOYMENT")

        system_prompt = "Anna 10 merkittävää elämäntapahtumaa potilaasta selkein otsikoin."
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Potilaan merkittävät elämänmuutokset"}
        ]

        response = get_openai_response(messages, azure_oai_endpoint, azure_oai_key, azure_oai_deployment)
        timeline_events = response.split("\n")

        return jsonify({"timeline": timeline_events})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# RAG-pohjainen reitti indeksoidun datan hakemiseen ja GPT-vastauksen tuottamiseen
@app.route("/api/rag", methods=["POST"])
def rag_response():
    try:
        load_dotenv()
        azure_oai_endpoint = os.getenv("AZURE_OAI_ENDPOINT")
        azure_oai_key = os.getenv("AZURE_OAI_KEY")
        azure_oai_deployment = os.getenv("AZURE_OAI_DEPLOYMENT")
        azure_search_index = os.getenv("AZURE_SEARCH_INDEX")
        azure_search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
        azure_search_api_key = os.getenv("AZURE_SEARCH_API_KEY")

        user_input = request.json.get("query", "")
        if not user_input:
            return jsonify({"error": "Kysymys ei voi olla tyhjä"}), 400

        search_results = search_indexed_data(user_input, azure_search_endpoint, azure_search_api_key,
                                             azure_search_index)

        if not search_results:
            return jsonify({"response": "Indeksoidusta datasta ei löytynyt osumia käyttäjän kysymykseen."})

        context = "\n".join(search_results)
        response = get_rag_response(context, user_input, azure_oai_endpoint, azure_oai_key, azure_oai_deployment)

        return jsonify({"response": response, "context": search_results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def load_prompts(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)

# Funktio yhdistetyn kehotteen luomiseen
def get_combined_prompt(prompts, context, user_input):
    messages = [{"role": "system", "content": prompts["system"]}]
    if context:
        messages.append({"role": "system", "content": context})
    messages.append({"role": "user", "content": user_input})
    return messages

# Chat-reitti GPT:n kanssa keskusteluun
@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        load_dotenv()
        azure_oai_endpoint = os.getenv("AZURE_OAI_ENDPOINT")
        azure_oai_key = os.getenv("AZURE_OAI_KEY")
        azure_oai_deployment = os.getenv("AZURE_OAI_DEPLOYMENT")

        user_input = request.json.get("query", "")
        if not user_input:
            return jsonify({"error": "Kysymys ei voi olla tyhjä"}), 400

        prompts = load_prompts("prompts.json")
        messages = get_combined_prompt(prompts, "", user_input)

        response = get_openai_response(messages, azure_oai_endpoint, azure_oai_key, azure_oai_deployment)
        return jsonify({"response": response})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
