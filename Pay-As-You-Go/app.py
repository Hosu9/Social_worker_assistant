from flask import Flask, jsonify, request, send_from_directory
import aikajana
import chatbox

app = Flask(__name__, static_folder='front', template_folder='front')

@app.route('/')
def serve_frontend():
    return send_from_directory('front', 'index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    return send_from_directory('front', path)

@app.route('/api/timeline', methods=['POST'])
def get_timeline_output():
    try:
        output = aikajana.main()
        return output
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search():
    try:
        data = request.json
        question = data.get('question', '')

        if not question:
            return jsonify({"error": "No question provided"}), 400

        # Get the answer from chatbox.py
        response = chatbox.rag_chat(question)
        print("Generated answer:", response)
        return jsonify({"answer": response})
    except Exception as e:
        print(f"Error processing search: {str(e)}")
        return jsonify({"error": str(e)}), 500

def main():
    try:
        events = aikajana.get_significant_events("Kerro Emmasta 10 merkitsevää elämäntapahtumaa")
        return events
    except Exception as e:
        print(f"Error generating timeline: {str(e)}")

if __name__ == '__main__':
    main()
    app.run(debug=True)
