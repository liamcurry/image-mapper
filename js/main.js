(function () {

  'use strict';

  // requestAnimationFrame polyfill
  var lastTime = 0
    , vendors = ['ms', 'moz', 'webkit', 'o'];

  // For all browsers with prefix versions available
  for (var x=vendors.length; x-- && !window.requestAnimationFrame;) {
    window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
    window.cancelRequestAnimationFrame = window[vendors[x] + 'CancelRequestAnimationFrame'];
  }

  // For older browsers
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (callback, element) {
      var currTime = new Date().getTime()
        , timeToCall = Math.max(0, 16 - (currTime - lastTime))
        , id = window.setTimeout(function () {
          callback(currTime + timeToCall);
        }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!window.cancelRequestAnimationFrame) {
    window.cancelRequestAnimationFrame = function (id) {
      clearTimeout(id);
    };
  }

  function extend(ClassB, ClassA) {
    function ClassI() {}
    ClassI.prototype = ClassA.prototype;
    ClassB.prototype = new ClassI();
    ClassB.prototype.constructor = ClassB;
  }

  function Shape(options) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 1;
    this.height = options.height || 1;
    this.fill = options.fill || '#aaa';
  }

  Shape.prototype.draw = function (context) {
    context.fillStyle = this.fill;
    context.fillRect(this.x, this.y, this.width, this.height);
  };

  Shape.prototype.contains = function (mouseX, mouseY) {
    return (this.x <= mouseX) && (this.x + this.width >= mouseX) &&
           (this.y <= mouseY) && (this.y + this.height >= mouseY);
  };

  Shape.prototype.move = function (x, y) {
    this.x = x;
    this.y = y;
  };

  function Anchor(options) {
    Shape.call(this, options);
  }

  extend(Anchor, Shape);

  Anchor.prototype.draw = function (context) {
    // Align to center of corner by subtracting half width/height
    var halfHeight = this.height / 2
      , halfWidth = this.width / 2;
    context.fillStyle = this.fill;
    context.fillRect(this.x - halfWidth, this.y - halfHeight,
                     this.width, this.height);
  };

  function Rect(options) {
    Shape.call(this, options);
    this.anchorSize = options.anchorSize || 6;
    this.anchors = this.createAnchors();
  }

  extend(Rect, Shape);

  Rect.prototype.createAnchors = function () {
    var x = this.x
      , y = this.y
      , w = this.anchorSize
      , h = w;
    return [
        new Anchor({ x: x, y: y, width: w, height: h })
      , new Anchor({ x: x + this.width, y: y, width: w, height: h })
      , new Anchor({ x: x + this.width, y: y + this.height, width: w, height: h })
      , new Anchor({ x: x, y: y + this.height, width: w, height: h })
    ];
  };

  Rect.prototype.move = function (x, y) {
    this.x = x;
    this.y = y;
    this.anchors[0].move(x, y);
    this.anchors[1].move(x + this.width, y);
    this.anchors[2].move(x + this.width, y + this.height);
    this.anchors[3].move(x, y + this.height);
  };

  Rect.prototype.draw = function (context) {
    Shape.prototype.draw.call(this, context);
    for (var i=this.anchors.length; i--;) {
      this.anchors[i].draw(context);
    }
  };

  function ImgMapGen(options) {
    // Canvas and context
    this.canvas = options.canvas;
    this.context = this.canvas.getContext('2d');

    // Offsets to help mouse coords problems when there's borders or padding
    this.stylePaddingLeft = parseInt(this.getCanvasComputedStyle('paddingLeft'), 10) || 0;
    this.stylePaddingTop = parseInt(this.getCanvasComputedStyle('paddingTop'), 10) || 0;
    this.styleBorderLeft = parseInt(this.getCanvasComputedStyle('borderLeft'), 10) || 0;
    this.styleBorderTop = parseInt(this.getCanvasComputedStyle('borderTop'), 10) || 0;
    this.htmlTop = document.body.parentNode.offsetTop;
    this.htmlLeft = document.body.parentNode.offsetLeft;

    // Read files that are dropped
    this.droppable = options.droppable;
    this.currentImage = new Image();
    this.reader = new FileReader();

    // Keep track of state
    this.isValid = false;
    this.isDragging = false;
    this.dragOffX = 0;
    this.dragOffY = 0;
    this.shapes = [];

    // Initialize
    this.bindEvents();
    this.animate();   this.selection = null;
  }

  ImgMapGen.prototype.getCanvasComputedStyle = function (property) {
    return document.defaultView.getComputedStyle(this.canvas, null)[property];
  };

  ImgMapGen.prototype.resize = function (width, height) {
    this.canvas.setAttribute('width', width);
    this.canvas.setAttribute('height', height);
    this.isValid = false;
  };

  ImgMapGen.prototype.loadImage = function (data) {
    if (!data) { return; }
    this.currentImage.src = data;
    this.resize(this.currentImage.width, this.currentImage.height);
    this.context.drawImage(this.currentImage, 0, 0);
  };

  ImgMapGen.prototype.getMouse = function (event) {
    var element = this.canvas
      , offsetX = this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft
      , offsetY = this.stylePaddingTop + this.styleBorderTop + this.htmlTop
      , mouseX = 0
      , mouseY = 0;

    if (element.offsetParent !== undefined) {
      do {
        offsetX += element.offsetLeft;
        offsetY += element.offsetTop;
      } while ((element = element.offsetParent));
    }

    mouseX = event.pageX - offsetX;
    mouseY = event.pageY - offsetY;

    return { x: mouseX, y: mouseY };
  };

  ImgMapGen.prototype.bindEvents = function () {

    var _this = this;

    // Load images with File API and put them on the canvas
    this.reader.onload = function (e) {
      _this.loadImage(e.target.result);
    };

    // Add hover effect when dragging over files
    this.droppable.ondragover = function (e) {
      e.preventDefault();
      this.className = 'drag-over';
    };

    // After dragging files, remove dragging class
    this.droppable.ondragend = function (e) {
      e.preventDefault();
      this.className = '';
    };

    // On dropping files, load the file with the File API
    this.droppable.ondrop = function (e) {
      e.preventDefault();
      this.className = '';
      var file = e.dataTransfer.files[0];
      _this.reader.readAsDataURL(file);
    };

    this.canvas.onmousedown = function (e) {
      var mouse = _this.getMouse(e)
        , mouseX = mouse.x
        , mouseY = mouse.y
        , shapes = _this.shapes;

      // Loop through all the shapes and see if we can select one
      for (var i=shapes.length; i--;) {
        var shape = shapes[i];
        if (!shape.contains(mouseX, mouseY)) {
          continue;
        }
        _this.dragOffX = mouseX - shape.x;
        _this.dragOffY = mouseY - shape.y;
        _this.isDragging = true;
        _this.selection = shape;
        _this.isValid = false;
        return;
      }

      // If we haven't returned yet then the user didn't click on an
      // object, so we deselect anything that is already selected.
      if (_this.selection) {
        _this.selection = null;
        _this.isValid = false;
      }
    };

    this.canvas.onmouseup = function (e) {
      _this.isDragging = false;
    };

    this.canvas.onmousemove = function (e) {
      var mouse = _this.getMouse(e);
      if (_this.isDragging) {
        _this.selection.move(mouse.x - _this.dragOffX, mouse.y - _this.dragOffY);
        _this.isValid = false;
      }
    };

  };

  ImgMapGen.prototype.addShape = function (shape) {
    this.shapes.push(shape);
    this.isValid = false;
  };

  ImgMapGen.prototype.clear = function () {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  ImgMapGen.prototype.draw = function () {
    if (this.isValid) { return; }
    console.log('no longer valid -- drawing');
    var context = this.context
      , shapes = this.shapes;

    this.clear();
    if (this.currentImage) {
      this.loadImage(this.currentImage.src);
    }

    for (var i=shapes.length; i--;) {
      var shape = shapes[i];
      if (shape.x > this.width || shape.y > this.height ||
          shape.x + shape.width < 0 || shape.y + shape.height < 0) {
        continue;
      }
      shape.draw(this.context);
    }

    if (this.selection) {
      var selection = this.selection;
      context.strokeStyle = this.selectionColor;
      context.lineWidth = this.selectionWidth;
      context.strokeRect(selection.x, selection.y,
                         selection.width, selection.height);
    }
    this.isValid = true;
  };

  ImgMapGen.prototype.animate = function () {
    var _this = this;
    window.requestAnimationFrame(function () {
      _this.animate();
    });
    this.draw();
  };

  window.Rect = Rect;
  window.Shape = Shape;
  window.Anchor = Anchor;
  window.ImgMapGen = ImgMapGen;

}());
