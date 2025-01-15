import json

# Lataa JSON-tiedosto
with open('tapahtumat_emma.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

# Käydään läpi dokumentit ja poimitaan tarvittavat tiedot
events = []
for document in data.get("documents", []):
    # Hae alkuperäinen luontiaika
    original_creation_time = document.get("metaCustom", {}).get("asiakirjan_metadata", {}).get("alkuperainen_luontiaika", "N/A")
    
    # Hae lisäkentän arvo
    additional_field_value = "N/A"
    for field in document.get("metaCustom", {}).get("asiakirjan_metadata", {}).get("lisakentat", []):
        if "value" in field:
            additional_field_value = field["value"]
            break

    # Lisää tapahtuma listalle
    events.append({
        "alkuperainen_luontiaika": original_creation_time,
        "lisakentat_value": additional_field_value
    })

# Tulosta tulokset (vain ensimmäiset 10 tapahtumaa)
for idx, event in enumerate(events[:10], start=1):
    print(f"Tapahtuma {idx}:")
    print(f"  Alkuperäinen luontiaika: {event['alkuperainen_luontiaika']}")
    print(f"  Lisäkentät (value): {event['lisakentat_value']}")
