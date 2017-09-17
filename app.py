#encoding=utf-8
import os
import time
# import cPickle
import datetime
import logging
import flask
import werkzeug
import optparse
import tornado.wsgi
import tornado.httpserver
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw
# import cStringIO as StringIO
try:
    import cStringIO as StringIO
except ImportError:
    from io import StringIO

import urllib
import exifutil
import sys
reload(sys)
sys.setdefaultencoding('utf-8') # add this to support Chinese in python2

# import caffe
import darknet

REPO_DIRNAME = os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + '/../..')
UPLOAD_FOLDER = '/tmp/objdet_demos_uploads'
ALLOWED_IMAGE_EXTENSIONS = set(['png', 'bmp', 'jpg', 'jpe', 'jpeg', 'gif', 'tif', 'tiff'])

# Obtain the flask app object
app = flask.Flask(__name__)


@app.route('/')
def index():
    return flask.render_template('index.html', has_result=False)

# fyk
def load_img(img_buffer):
    # image = caffe.io.load_image(string_buffer)
    pass
def disp_wait_msg(imagesrc):
    flask.render_template(
        'index.html', has_result=True,
        result=(False, '处理图片中...'),
        imagesrc=imagesrc
    )


def draw_rectangle(draw, coordinates, color, width=1, draw_ellipse=False):
    for i in range(width):
        rect_start = (coordinates[0] - i, coordinates[1] - i)
        rect_end = (coordinates[2] + i, coordinates[3] + i)
        if draw_ellipse:
            draw.ellipse((rect_start, rect_end), outline=color)
        else:
            draw.rectangle((rect_start, rect_end), outline=color)


def draw_rectangles(image_pil,det_result):
    # draw rectangles
    draw = ImageDraw.Draw(image_pil)
    for idx, item in enumerate(det_result):
        x, y, w, h = item[2]
        half_w = w / 2
        half_h = h / 2
        box = (int(x - half_w+1), int(y - half_h+1), int(x + half_w+1), int(y + half_h+1))
        # draw.rectangle(box, outline=(0, 255, 0))
        draw_rectangle(draw,box,(0, 255, 0),width=2,draw_ellipse=True)
        # draw.ellipse(box, outline=(255, 0, 0))
        draw.text((x - half_w + 5, y - half_h + 5), str(idx + 1)+" : "+item[0], fill=(0, 0, 150))
    del draw


@app.route('/classify_url', methods=['GET'])
def classify_url():
    imageurl = flask.request.args.get('imageurl', '')
    try:
        # download
        raw_data = urllib.urlopen(imageurl).read()
        string_buffer = StringIO.StringIO(raw_data)
        # image = load_img(string_buffer)
        image_pil = Image.open(string_buffer)
        filename = os.path.join(UPLOAD_FOLDER, 'tmp.jpg')
        with open(filename,'wb') as f:
            f.write(raw_data)

    except Exception as err:
        # For any exception we encounter in reading the image, we will just
        # not continue.
        logging.info('URL Image open error: %s', err)
        return flask.render_template(
            'index.html', has_result=True,
            result=(False, 'Cannot open image from URL.')
        )

    logging.info('Image: %s', imageurl)
    # img_base64 = embed_image_html(filename)
    # disp_wait_msg(img_base64)
    results = app.clf.classify_image(filename)
    draw_rectangles(image_pil, results[1])
    new_img_base64 = embed_image_html(image_pil)
    return flask.render_template(
        'index.html', has_result=True, result=results, imagesrc=new_img_base64)
        # 'index.html', has_result=True, result=result, imagesrc=imageurl)


@app.route('/classify_upload', methods=['POST'])
def classify_upload():
    try:
        # We will save the file to disk for possible data collection.
        imagefile = flask.request.files['imagefile']
        filename_ = str(datetime.datetime.now()).replace(' ', '_') + \
            werkzeug.secure_filename(imagefile.filename)
        filename = os.path.join(UPLOAD_FOLDER, filename_)
        imagefile.save(filename)
        logging.info('Saving to %s.', filename)
        image_pil = exifutil.open_oriented_pil(filename)

    except Exception as err:
        logging.info('Uploaded image open error: %s', err)
        return flask.render_template(
            'index.html', has_result=True,
            result=(False, 'Cannot open uploaded image.')
        )
    # img_base64 = embed_image_html(image_pil)
    # disp_wait_msg(img_base64)
    results = app.clf.classify_image(filename)
    # [('F22', 0.9006772637367249, (338.6946105957031, 431.28515625, 608.9721069335938, 220.40663146972656)),
    #  ('F22', 0.890718400478363, (545.9476318359375, 294.4508361816406, 509.1690979003906, 177.72409057617188)),
    #  ('F22', 0.8847938179969788, (642.2884521484375, 193.6743927001953, 401.5226745605469, 135.20948791503906))]

    draw_rectangles(image_pil, results[1])
    new_img_base64 = embed_image_html(image_pil)
    # import time
    # time.sleep(5) # test
    return flask.render_template(
        'index.html', has_result=True, result=results,
        imagesrc=new_img_base64
    )


def embed_image_html(image_pil):
    """Creates an image embedded in HTML base64 format."""
    # image_pil = Image.fromarray((255 * image).astype('uint8'))
    # image_pil = Image.open(image)
    size = (512, 512) # (256, 256)
    resized = image_pil.resize(size)
    string_buf = StringIO.StringIO()
    resized.save(string_buf, format='png')
    data = string_buf.getvalue().encode('base64').replace('\n', '')
    return 'data:image/png;base64,' + data


def allowed_file(filename):
    return (
        '.' in filename and
        filename.rsplit('.', 1)[1] in ALLOWED_IMAGE_EXTENSIONS
    )


class ImagenetClassifier(object):
    default_args = {
         'model_def_file': (
             '{}/models/bvlc_reference_caffenet/deploy.prototxt'.format(REPO_DIRNAME)),
         'pretrained_model_file': (
             '{}/models/bvlc_reference_caffenet/bvlc_reference_caffenet.caffemodel'.format(REPO_DIRNAME)),
         'mean_file': (
             '{}/python/caffe/imagenet/ilsvrc_2012_mean.npy'.format(REPO_DIRNAME)),
         'class_labels_file': (
             '{}/data/ilsvrc12/synset_words.txt'.format(REPO_DIRNAME)),
         'bet_file': (
             '{}/data/ilsvrc12/imagenet.bet.pickle'.format(REPO_DIRNAME)),
    }
    # for key, val in default_args.iteritems():
    #     if not os.path.exists(val):
    #         raise Exception(
    #             "File for {} is missing. Should be at: {}".format(key, val))
    default_args['image_dim'] = 256
    default_args['raw_scale'] = 255.

    # fyk 预先加载模型
    def __init__(self, model_def_file, pretrained_model_file, mean_file,
                 raw_scale, class_labels_file, bet_file, image_dim, gpu_mode):
        logging.info('Loading net and associated files...')
        base_dir = "/home/s05/fyk/darknet-modify/"
        self.net = darknet.load_net(base_dir + "PLANE/yolo-voc.2.0.cfg", base_dir + "backup/yolo-voc_26000.weights", 0)
        self.meta = darknet.load_meta(base_dir + "PLANE/voc.data")

        # if gpu_mode:
        #     caffe.set_mode_gpu()
        # else:
        #     caffe.set_mode_cpu()
        # self.net = caffe.Classifier(
        #     model_def_file, pretrained_model_file,
        #     image_dims=(image_dim, image_dim), raw_scale=raw_scale,
        #     mean=np.load(mean_file).mean(1).mean(1), channel_swap=(2, 1, 0)
        # )
        # with open(class_labels_file) as f:
        #     labels_df = pd.DataFrame([
        #         {
        #             'synset_id': l.strip().split(' ')[0],
        #             'name': ' '.join(l.strip().split(' ')[1:]).split(',')[0]
        #         }
        #         for l in f.readlines()
        #     ])
        # self.labels = labels_df.sort('synset_id')['name'].values
        # self.bet = cPickle.load(open(bet_file))
        # A bias to prefer children nodes in single-chain paths
        # I am setting the value to 0.1 as a quick, simple model.
        # We could use better psychological models here...
        # self.bet['infogain'] -= np.array(self.bet['preferences']) * 0.1

    def classify_image(self, image_filename):
        try:
            starttime = time.time()
            # scores = self.net.predict([image], oversample=True).flatten()
            results = darknet.detect(self.net, self.meta, image_filename)
            # [('F22', 0.9006772637367249, (338.6946105957031, 431.28515625, 608.9721069335938, 220.40663146972656)),
            #  ('F22', 0.890718400478363, (545.9476318359375, 294.4508361816406, 509.1690979003906, 177.72409057617188)),
            #  ('F22', 0.8847938179969788, (642.2884521484375, 193.6743927001953, 401.5226745605469, 135.20948791503906))]
            endtime = time.time()
            bet_result = [(str(idx+1)+' : '+v[0], '%.5f' % v[1])
                          for idx, v in enumerate(results)]
            # logging.info('bet result: %s', str(bet_result))
            rtn = (True, results, bet_result, '%.3f' % (endtime - starttime))
            return rtn

            # indices = (-scores).argsort()[:5]
            # predictions = self.labels[indices]

            # In addition to the prediction text, we will also produce
            # the length for the progress bar visualization.
            # meta = [
            #     (p, '%.5f' % scores[i])
            #     for i, p in zip(indices, predictions)
            # ]
            # logging.info('result: %s', str(meta))

            # Compute expected information gain
            # expected_infogain = np.dot(
            #     self.bet['probmat'], scores[self.bet['idmapping']])
            # expected_infogain *= self.bet['infogain']

            # sort the scores
            # infogain_sort = expected_infogain.argsort()[::-1]
            # bet_result = [(self.bet['words'][v], '%.5f' % expected_infogain[v])
            #               for v in infogain_sort[:5]]
            # logging.info('bet result: %s', str(bet_result))

            # return (True, meta, bet_result, '%.3f' % (endtime - starttime))

        except Exception as err:
            logging.info('Classification error: %s', err)
            return (False, 'Something went wrong when classifying the '
                           'image. Maybe try another one?')


def start_tornado(app, port=5000):
    http_server = tornado.httpserver.HTTPServer(
        tornado.wsgi.WSGIContainer(app))
    http_server.listen(port)
    print("Tornado server starting on port {}".format(port))
    tornado.ioloop.IOLoop.instance().start()


def start_from_terminal(app):
    """
    Parse command line options and start the server.
    """
    parser = optparse.OptionParser()
    parser.add_option(
        '-d', '--debug',
        help="enable debug mode",
        action="store_true", default=False)
    parser.add_option(
        '-p', '--port',
        help="which port to serve content on",
        type='int', default=5000)
    parser.add_option(
        '-g', '--gpu',
        help="use gpu mode",
        action='store_true', default=True)

    opts, args = parser.parse_args()
    ImagenetClassifier.default_args.update({'gpu_mode': opts.gpu})

    # Initialize classifier + warm start by forward for allocation
    app.clf = ImagenetClassifier(**ImagenetClassifier.default_args)
    #app.clf.net.forward()

    if opts.debug:
        app.run(debug=True, host='0.0.0.0', port=opts.port)
    else:
        start_tornado(app, opts.port)


if __name__ == '__main__':
    logging.getLogger().setLevel(logging.INFO)
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    start_from_terminal(app)
