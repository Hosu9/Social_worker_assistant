import os
import json
from dotenv import load_dotenv
import openai
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient

# Ympäristömuuttujien lataus

load_dotenv()
# Azure AI Search API
azure_search_index = os.getenv("AZURE_SEARCH_INDEX")
azure_search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
azure_search_api_key = os.getenv("AZURE_SEARCH_API_KEY")
# Azure OpenAI API & Embedding
azure_oai_endpoint = os.getenv("AZURE_OAI_ENDPOINT")
azure_oai_key = os.getenv("AZURE_OAI_KEY")
azure_oai_deployment = os.getenv("AZURE_OAI_DEPLOYMENT")
azure_oai_embedding = os.getenv("AZURE_OAI_EMBEDDING_DEPLOYMENT")

def get_openai_response(messages, azure_oai_endpoint, azure_oai_key, azure_oai_deployment):    
    # OpenAI asetukset
    openai.api_type = "azure"
    openai.api_key = azure_oai_key
    openai.api_base = azure_oai_endpoint
    openai.api_version = "2024-08-01-preview"

    # Openai engine 
    response = openai.ChatCompletion.create(
        engine=azure_oai_deployment,
        messages=messages,
        temperature=0.5,
        max_tokens=200  # Reduced max tokens to limit token usage
    )
    return response

search_client = SearchClient(
    endpoint=azure_search_endpoint, 
    index_name=azure_search_index,
    credential=AzureKeyCredential(azure_search_api_key))

def search_index(query):
    results = search_client.search(query)
    return [result["chunk"] for result in results]

def generate_response(text):
    openai.api_type = "azure"
    openai.api_key = azure_oai_key
    openai.api_base = azure_oai_endpoint
    openai.api_version = "2024-08-01-preview"
    
    response = openai.Embedding.create(
        input=text, engine=azure_oai_embedding)
    embeddings = response['data'][0]['embedding']
    return embeddings

def create_rag_response(query):
    # Search the Azure index
    search_results = search_index(query)
    
    # Combine search results into a single string
    combined_results = " ".join(list(str(search_results)))
    
    # Generate embeddings for the combined search results
    embeddings = generate_response(combined_results)

    # Create a message for OpenAI
    messages = [
        {"role": "system", "content": "Olet avulias assistentti ja käsittelet suomeksi vain ja ainoastaan annettua synteettistä asiakastietoa."},
        {"role": "user", "content": query},
        {"role": "assistant", "content": combined_results[:1000]}  # Limit the length of combined results
    ]
    
    # Get OpenAI response
    openai_response = get_openai_response(messages, azure_oai_endpoint, azure_oai_key, azure_oai_deployment)
    
    return openai_response.choices[0].message['content']

# Example usage
query = "Kerro Emmasta 10 merkittävää asiaa."
response = create_rag_response(query)
print(response)

generate_response("Hello, world!")
