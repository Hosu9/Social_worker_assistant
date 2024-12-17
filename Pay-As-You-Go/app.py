from flask import Flask, request, jsonify, render_template
import aikajana  # Ensure that aikajana.py has the logic to process the request

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_events', methods=['POST'])
def get_events():
    try:
        data = request.json
        question = data.get('question')

        if not question:
            return jsonify({"error": "No question provided"}), 400

        # Get data from aikajana.py
        response_data = aikajana.main(question)

        if not response_data or 'events' not in response_data:
            return jsonify({"error": "No events found or an error occurred"}), 500

        return response_data  # Send the events data to the frontend

    except Exception as e:
        # Print the exception to the terminal for more debugging info
        print(f"Error in /get_events: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)

