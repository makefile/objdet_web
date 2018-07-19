function require(script) {
    $.ajax({
        url: script,
        dataType: "script",
        async: false,           // <-- This is the key, however this has been deprecated, for more solutions, see https://stackoverflow.com/questions/950087/how-do-i-include-a-javascript-file-in-another-javascript-file
        success: function () {
            // all good...
        },
        error: function () {
            throw new Error("Could not load script " + script);
        }
    });
}
// load the script of decompressing tiff image, for tiff/tif is not normal images supported by browser
//require("/static/js/tiff.min.js");
// load the script of dropzone(drag and drop file utils).
//require("/static/js/dropzone.js");

var currentFile = null;
var resizeRatio = 1;
var dx = 0;
var dy = 0;
Dropzone.autoDiscover = false;
var myDropzone = new Dropzone("#dropz", { //url: "/upload-det-rsi"});
    url: "/upload-det-rsi",
    timeout: 600000, /*milliseconds, default is 30 sec*/
    maxFiles: 100,
    maxFilesize: 1024,
    // acceptedFiles: ".jpg,.jpeg,.doc,.docx,.ppt,.pptx,.txt,.avi,.pdf,.mp3,.zip",
    // autoProcessQueue: false,
    // paramName: "file",
    createImageThumbnails: false,//不显示缩略图
    previewsContainer: false,//不显示preview
    // dictDefaultMessage: "拖入需要上传的文件",
    init: function () {
        var myDropzone = this;//, submitButton = document.querySelector("#qr"),
        //cancelButton = document.querySelector("#cancel");
        var picshow = document.querySelector("#dropz");
        myDropzone.on('addedfile', function (file) {
            //添加上传文件的过程
            if (currentFile) {
                this.removeFile(currentFile);
            }
            currentFile = file;
            picshow.setAttribute('plus_sign', 'none');
            $(".dz-message").html(null);
            var subregions = document.getElementById('rightpic');
            $(subregions).empty();
            subregions.setAttribute("class", "rightpic_hide");
            var FR= new FileReader();
            // handle special type of images
            if (file.type != "image/tif" && file.type != "image/tiff") {
              FR.onload = function(e) {
                // console.log( e.target.result); //This is the base64 data of file(gif) dropped
                //if you want to display it somewhere in your previewTemplate
                // var temp = file.previewTemplate;
                // picshow.innerHTML = "<img id='inputImage' src=''>";
                // var imgTag = picshow.querySelector("img");
                // imgTag.setAttribute('src', e.target.result); //setting as src of some img tag with class 'my-preview'

                var img = new Image();
                img.onload = imageLoaded;
                img.src = e.target.result;
              };
              FR.readAsDataURL(file);

            } else {
                FR.onload = function (event) {
                   var buffer = event.target.result;
                   var tiff = new Tiff({ buffer: buffer });
                   var tif_canvas = tiff.toCanvas();
                   //var width = tiff.width();
                   //var height = tiff.height();
                   var dataURL = tif_canvas.toDataURL();
                   var img = new Image();
                   img.onload = imageLoaded;
                   img.src = dataURL;
                };
                FR.onerror = function (event) {
                    //console.error("File could not be read! Code " + event.target.error.code);
                    $("#status").text("File could not be read! Code " + event.target.error.code);
                };
                FR.readAsArrayBuffer(file); 
            }
        });
        myDropzone.on('sending', function (data, xhr, formData) {
            /*Called just before each file is sent*/
            xhr.ontimeout = (() => {
                /*Execute on case of timeout only*/
                $("#status").text('Server Timeout')
            });
            //向后台发送该文件前添加参数、表单
            var thresholdValue = $("#thresholdValue").text();
            formData.append('threshold', thresholdValue);
            // formData.append('watermark', jQuery('#info').val());
        });
        myDropzone.on("complete", function(file) {
            // console.log("结束");
        });
        myDropzone.on('success', function (files, response) {
            // 得到返回结果
            // console.log(response);

            showResult(response);
        });
        myDropzone.on('error', function (files, response) {
            //文件上传失败后的操作
            $("#status").text("上传失败");
        });
        myDropzone.on('totaluploadprogress', function (progress, byte, bytes) {
            //progress为进度百分比
            if (progress == 100){
                $("#status").text("上传成功，等待结果...");
            }else{
                $("#status").text("上传进度：" + parseInt(progress) + "%");
            }
            //计算上传速度和剩余时间
            /*var mm = 0;
            var byte = 0;
            var tt = setInterval(function () {
                mm++;
                var byte2 = bytes;
                var remain;
                var speed;
                var byteKb = byte/1024;
                var bytesKb = bytes/1024;
                var byteMb = byte/1024/1024;
                var bytesMb = bytes/1024/1024;
                if(byteKb <= 1024){
                    speed = (parseFloat(byte2 - byte)/(1024)/mm).toFixed(2) + " KB/s";
                    remain = (byteKb - bytesKb)/parseFloat(speed);
                }else{
                    speed = (parseFloat(byte2 - byte)/(1024*1024)/mm).toFixed(2) + " MB/s";
                    remain = (byteMb - bytesMb)/parseFloat(speed);
                }
                $("#dropz #speed").text("上传速率：" + speed);
                $("#dropz #time").text("剩余时间"+arrive_timer_format(parseInt(remain)));
                if(bytes >= byte){
                    clearInterval(tt);
                    if(byteKb <= 1024){
                        $("#dropz #speed").text("上传速率：0 KB/s");
                    }else{
                        $("#dropz #speed").text("上传速率：0 MB/s");
                    }
                    $("#dropz #time").text("剩余时间：0:00:00");
                }
            },1000);*/
        });
        /*submitButton.addEventListener('click', function () {
            //点击上传文件
            myDropzone.processQueue();
        });
        cancelButton.addEventListener('click', function () {
            //取消上传
            myDropzone.removeAllFiles();
        });*/
    }
});
function imageLoaded() {
  var img = this;
  showImageOnCanvas(img);
}
function showImageOnCanvas(img) {
  var canvas = document.getElementById('canvas');
  canvas.style.display = 'block';
  canvas.width = 700;
  canvas.height = 700;
  var max_side = img.width > img.height?img.width:img.height;
  resizeRatio = 700.0 / max_side;
  var dispWidth = img.width * resizeRatio;
  var dispHeight = img.height * resizeRatio;
  dx = (canvas.width - dispWidth)/2;
  dy = (canvas.height - dispHeight)/2;
  var ctx = canvas.getContext("2d");
  ctx.drawImage(img,0,0,img.width,img.height,dx,dy,dispWidth,dispHeight);
}
// loaded from our server
function urlImgLoaded() {
  var img = this;
  showImageOnCanvas(img);
  showResult(img.det_result);
}
function showResult(jsonObj) {
    var subregions = document.getElementById('rightpic');
    subregions.setAttribute("class", "rightpic");
    var html = "<ul id='marquee'>";
    var result = jsonObj["object"];
    var cost_millis = jsonObj["millis"];
    var info_html = jsonObj["info_html"];
    $("#status").text(result.length + " 个目标.");
    $("#rsi-info").html(info_html);
    $("#costTimeValue").text(cost_millis);
    var costTime = document.getElementById('costTime');
    costTime.setAttribute("style","\"display: block\"");

    var canvas = document.getElementById('canvas');
    var canvas_org = copyCanvasRegionToBuffer(canvas, 1,1,canvas.width,canvas.height);
    var ctx = canvas.getContext("2d");
    var pxsz = Math.floor(0.03 * Math.max(canvas.width, canvas.height));

    //ctx.strokeStyle = "#00AA00";
    ctx.lineWidth = 3;
    ctx.font = "" + pxsz + "px verdana";
    ctx.fillStyle = 'red';

    for (x = 0; x < result.length; x++) {
        var bbox = result[x]["bbox"];
        var cur_class = result[x]["class"];
        var b0 = bbox[0];
        var b1 = bbox[1];
        var b2 = bbox[2];
        var b3 = bbox[3];
        //var img_x = b0;
        //var img_y = b1;
        //var img_w = b2 - b0;
        //var img_h = b3 - b1;
        var img_x = b0 * resizeRatio + dx;
        var img_y = b1 * resizeRatio + dy;
        var img_w = (b2 - b0) * resizeRatio;
        var img_h = (b3 - b1) * resizeRatio;

        var subimage  = copyCanvasRegionToBuffer(canvas_org, img_x,img_y,img_w,img_h);
        // html += "<li><img src='" + subimage.toDataURL()  + "' width='135' height='104'></li>";
        html += "<li><img src='" + subimage.toDataURL()  + "' ></li>";

        ctx.strokeStyle = result[x]["box_color"];
        ctx.strokeRect(img_x, img_y, img_w, img_h);

        ctx.fillText(cur_class, img_x, img_y - 10);
    }
    subregions.innerHTML = html + "</ul>";
    // subregions.innerHTML = html;
}

function uploadUrlAndShowResult(url) {
  // clear display
  var picshow = document.querySelector("#dropz");
  picshow.setAttribute('plus_sign', 'none');
  $(".dz-message").html(null);
  // load image
  var img = new Image();
  //img.setAttribute("crossOrigin",'Anonymous');
  //img.src = url + '?' + new Date().getTime();//受限于 CORS 策略，会存在跨域问题,虽然可以绘制,但是会污染画布，一旦一个画布被污染,就无法提取画布的数据，比如无法使用使用画布toBlob(),toDataURL(),或getImageData()方法;会抛出一个安全错误
  // 另外,add a timestamp to the image URL to avoid the storage server from responding with 304 without the Access-Control-Allow-Origin header.但是对于严格的服务器没有仍然不管用 
  //img.onload = imageLoaded;
  var formData = new FormData();
  formData.append("image_url", url);
  var thresholdValue = $("#thresholdValue").text();
  formData.append('threshold', thresholdValue);

  $.ajax({
    type: "POST",
    timeout: 600000,
    url: "/upload-det-rsi",
    data: formData,
    processData: false,
    contentType: false,
    error: function (resp) {
      $("#status").text("Unable to perform detection.");
    },
    success: function (resp) {
      img.src = resp["image_base64"];
      img.det_result = resp;
      img.onload = urlImgLoaded;
    }
  });

}

//剩余时间格式转换：
function arrive_timer_format(s) {
    var t;
    if(s > -1){
        var hour = Math.floor(s/3600);
        var min = Math.floor(s/60) % 60;
        var sec = s % 60;
        var day = parseInt(hour / 24);
        if (day > 0) {
            hour = hour - 24 * day;
            t = day + "day " + hour + ":";
        }
        else t = hour + ":";
        if(min < 10){t += "0";}
        t += min + ":";
        if(sec < 10){t += "0";}
        t += sec;
    }
    return t;
}

function uploadAndShowResult() {
  var subregions = document.getElementById('subregions');

  fileChangesInput(fileInput); // Reset

  $(subregions).empty()

  thresholdValue = $("#thresholdValue").text();
  var formData = new FormData();
  formData.append("image", document.getElementById("inputImage").files[0]);
  $.ajax({
    type: "POST",
    timeout: 50000,
    url: "http://IP/or/host/detectObject?threshold=" + thresholdValue,
    data: formData,
    processData: false,
    contentType: false,
    error: function (resp) {
      $("#status").text("Unable to perform detection.");
    },
    success: function (resp) {
      console.log(resp);
      // fileChangesInput(fileInput);

      if(resp.length == 0){
          $("#status").text("No objects found.");
      } else {
          if(resp.length == 1){
              $("#status").text("1 object found.");
          } else {
              $("#status").text(resp.length + " objects found.");
          }
      }

      $(subregions).empty()

      for (x = 0; x < resp.length; x++) {
        var bbox      = resp[x]["bbox"];
        var cur_class = resp[x]["class"];
        var b0        = bbox[0];
        var b1        = bbox[1];
        var b2        = bbox[2];
        var b3        = bbox[3];
        var img_x     = b0;
        var img_y     = b1;
        var img_w     = b2 - b0;
        var img_h     = b3 - b1;
        var canvas    = document.getElementById('canvas');
        var ctx       = canvas.getContext("2d");
        var subimage  = copyCanvasRegionToBuffer(canvas, img_x,img_y,img_w,img_h);

        subregions.appendChild(subimage);
      }

      for (x = 0; x < resp.length; x++) {
        var bbox      = resp[x]["bbox"];
        var cur_class = resp[x]["class"];
        var b0        = bbox[0];
        var b1        = bbox[1];
        var b2        = bbox[2];
        var b3        = bbox[3];
        var img_x     = b0;
        var img_y     = b1;
        var img_w     = b2 - b0;
        var img_h     = b3 - b1;
        var canvas    = document.getElementById('canvas');
        var ctx       = canvas.getContext("2d");
        var pxsz      = Math.floor(0.03 * Math.max(canvas.width, canvas.height))

        ctx.strokeStyle="#FF0000";
        ctx.lineWidth=5;
        ctx.strokeRect(img_x,img_y,img_w,img_h);

        ctx.font = "" + pxsz + "px verdana";
        console.log(ctx.font);
        ctx.fillStyle = 'red';
        ctx.fillText("Class:" + cur_class, img_x, img_y - 15);
      }
    }
  });

  $("#status").text("Waiting for response...");
}
// Thanks SO: http://stackoverflow.com/questions/4532166/how-to-capture-a-section-of-a-canvas-to-a-bitmap
function copyCanvasRegionToBuffer( canvas, x, y, w, h ){
  var bufferCanvas = document.createElement('canvas');
  bufferCanvas.width  = w;
  bufferCanvas.height = h;
  bufferCanvas.getContext('2d').drawImage( canvas, x, y, w, h, 0, 0, w, h );
  return bufferCanvas;
}
