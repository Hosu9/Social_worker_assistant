#lisätään chatbot.py
def hae_lain_pykalat(kysymys_vektori, hakutietokanta):
    """
    Hae lähimmät pykälät käyttäjän kysymystä vastaavan vektorin perusteella.
    """
    haku_query = {
        "query": {
            "vector": {
                "field": "vektori",
                "query_vector": kysymys_vektori,
                "num_candidates": 5
            }
        }
    }
    return hakutietokanta.search(haku_query)
