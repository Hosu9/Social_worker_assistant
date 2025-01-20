#lisataan aikajana.py
import openai
import json

# Aseta OpenAI API -avain
openai.api_key = "YOUR_API_KEY"

def vektoroi_teksti(teksti):
    """
    Luo tekstistä vektoriesityksen käyttäen OpenAI:n text-embedding-ada-002 -mallia.
    """
    response = openai.Embedding.create(
        input=teksti,
        model="text-embedding-ada-002"
    )
    return response['data'][0]['embedding']

def vektoroi_laki(input_file, output_file):
    """
    Vektoroi lastensuojelulain pykälät ja tallentaa tulokset uuteen JSON-tiedostoon.
    """
    with open(input_file, "r", encoding="utf-8") as file:
        data = json.load(file)
    
    for pykala in data["pykälät"]:
        pykala["vektori"] = vektoroi_teksti(pykala["sisältö"])
    
    with open(output_file, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=4)

# Käytä funktiota
vektoroi_laki("lastensuojelulaki.json", "lastensuojelulaki_vektorit.json")
