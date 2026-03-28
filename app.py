from flask import Flask, render_template, jsonify, request
import json

app = Flask(__name__)

# ASL gesture descriptions
ASL_DESCRIPTIONS = {
    # Letters supported by the Fingerpose classifier
    'A': 'Closed fist, thumb resting on the side',
    'B': 'Four fingers straight up, thumb folded across palm',
    'C': 'All fingers curved into a C shape, thumb mirroring',
    'D': 'Index finger points up, others curl to meet thumb',
    'E': 'Fingers bent in a claw, thumb tucked underneath',
    'F': 'Index and thumb form a circle, middle/ring/pinky up',
    'G': 'Index and thumb point horizontally sideways',
    'H': 'Index and middle fingers extended horizontally',
    'I': 'Only pinky finger extended straight up',
    'J': 'Pinky pointing up, motion traces a J shape',
    'K': 'Index up, middle half-raised, thumb pointing between them',
    'L': 'Index points up, thumb extends horizontally — L shape',
    'M': 'Index, middle, and ring fingers folded over thumb',
    'N': 'Index and middle fingers folded over thumb',
    'O': 'All fingers curve to meet thumb forming an O shape',
    'P': 'Index points diagonally down, thumb extended out',
    'Q': 'Index and thumb point downwards',
    'R': 'Index and middle fingers crossed, pointing up',
    'S': 'Closed fist with thumb folded over the fingers',
    'T': 'Thumb tucked between index and middle fingers',
    'U': 'Index and middle fingers together pointing straight up',
    'V': 'Index and middle fingers spread apart in a V shape',
   
    'X': 'Index finger hooked or crooked, others curled',
    'Y': 'Thumb and pinky extended out, other fingers folded',
    'Z': 'Index finger extended, motion traces a Z shape',
    'SPACE': 'Open flat hand, all fingers pointing up and spread',
}

COMMON_PHRASES = [
    "Hello, how are you?",
    "Thank you very much",
    "Please help me",
    "I need assistance",
    "Yes, I understand",
    "No, thank you",
    "I am sorry",
    "Nice to meet you",
    "Can you help me?",
    "Have a good day",
    "I love you",
    "Please speak slowly",
    "I don't understand",
    "Could you repeat that?",
    "I need water",
    "I am hungry",
    "I am feeling well",
    "Call for help please",
]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/learn')
def learn():
    return render_template('learn.html', asl_data=ASL_DESCRIPTIONS)

@app.route('/api/phrases')
def get_phrases():
    return jsonify(COMMON_PHRASES)

@app.route('/api/asl_info')
def get_asl_info():
    return jsonify(ASL_DESCRIPTIONS)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
