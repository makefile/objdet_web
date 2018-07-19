
# Object Detection Web Demo

<img src="https://img.shields.io/badge/Flask-serve-4BC51D.svg?style=flat">
<img src="https://img.shields.io/badge/platform-linux-lightgrey.svg">
<img src="https://img.shields.io/badge/language-python2.7-blue.svg">

Image object detection demo(YOLO,SSD, Faster rcnn, etc.) running as a Flask web server.

> ***Notice***
This repo is not a turnkey project for object detection web system but an easy template for those who are not familiar with Web development just like me. You need to understand and modify the code little or much to use.

## Requirements

The demo server requires Python with some dependencies.
To make sure you have the dependencies, please run `pip install -r examples/web_demo/requirements.txt`.

## Run

Running `python app.py` will bring up the demo server, accessible at `http://0.0.0.0:5000`.
You can enable debug mode of the web server, or switch to a different port:

    % python app.py -h
    Usage: app.py [options]

    Options:
      -h, --help            show this help message and exit
      -d, --debug           enable debug mode
      -p PORT, --port=PORT  which port to serve content on

## More

The Javascript code `static/js/template.js` includes several part:

- use of `Dropzone.js`(Drag and drop file plugin) to upload image and get result with AJAX.
- parse JSON result and draw rectangles on image in browser canvas.
