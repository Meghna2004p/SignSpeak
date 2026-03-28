# SignSpeak — ASL Assistive Communication System

A full Flask web application for real-time American Sign Language (ASL) recognition
and speech synthesis, designed to assist speech-impaired individuals.

## Features

- 🖐️ **Real-time ASL Recognition** — MediaPipe Hands detects 21 hand landmarks
- 🔤 **Sentence Builder** — Gestures accumulate into a full sentence
- 🔊 **Text-to-Speech** — Built-in Web Speech API with voice/speed/pitch controls
- ⚡ **Quick Phrases** — Pre-loaded common phrases for fast communication
- 📚 **ASL Reference Guide** — Interactive learn page with all A–Z letters + phrase signs
- ⚙️ **Configurable** — Adjustable hold duration and confidence thresholds

## Setup

```bash
pip install -r requirements.txt
python app.py
```
Then open: http://localhost:5000

## How to Use

1. Click **Enable Camera** on the main page
2. Hold an ASL letter in front of your webcam
3. Keep it steady for the hold duration (default 1.2s)
4. The letter is added to your sentence
5. Click **Speak Text** to hear your message

## Project Structure

```
asl_app/
├── app.py                   # Flask routes
├── requirements.txt
├── templates/
│   ├── base.html            # Navbar + layout
│   ├── index.html           # Main camera + builder page
│   └── learn.html           # ASL reference guide
└── static/
    ├── css/style.css        # All styles
    └── js/
        ├── main.js          # UI utilities, TTS, phrases
        └── gesture.js       # MediaPipe + ASL classifier
```

## ASL Signs Supported

**Letters:** A B C D E F G H I J K L M N O P Q R S T U V W X Y Z  
**Phrases:** HELLO, THANK YOU, YES, NO, HELP, PLEASE, SORRY, LOVE

## Notes

- Best results with good lighting and a plain background
- Keep hand 30–60cm from camera
- The classifier uses rule-based landmark geometry (expandable with ML model)
