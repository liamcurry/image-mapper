(function () {

  var currentAnchor = -1;
  var cursors = [
    'nw-resize', 'n-resize', 'ne-resize', 'w-resize',
    'e-resize', 'sw-resize', 's-resize', 'se-resize'
  ];
  var elGenerated = document.getElementById('generated');
  var elControls = document.getElementById('controls');
  var fields = ['x', 'y', 'width', 'height', 'url', 'target', 'alt'];
  var mouseX, mouseY;
  var updateGeneratedThrottle;

  function Map(canvas, preview, form) {
    var _this = this;
    this.canvas = canvas;
    this.preview = preview;
    this.form = form;
    this.base64 = true;
    this.context = canvas.getContext('2d');
    this.image = new Image();
    this.image.onload = function () {
      canvas.width = this.width;
      canvas.height = this.height;
      canvas.style.background = 'url(' + this.src + ')';
      preview.innerHTML = _this.toHTML(true).innerHTML;
      updateGenerated(_this);
    };
    this.reset();
  }

  Map.prototype.reset = function () {
    this.redraw = true;
    this.selected = null;
    this.rects = [];
  };

  Map.prototype.load = function (imageData) {
    this.reset();
    this.image.src = imageData;
  };

  Map.prototype.remove = function (index) {
    this.rects.splice(index || this.rects.indexOf(this.selected), 1);
    this.selected = null;
    this.redraw = true;
  };

  Map.prototype.add = function (area) {
    area.canvas = this.canvas;
    this.rects.push(area);
    this.select(area);
  };

  Map.prototype.select = function (area) {
    this.selected = area;
    this.toggleControls(true);
    this.redraw = true;
  };

  Map.prototype.deselect = function () {
    this.selected = null;
    this.toggleControls(false);
    this.redraw = true;
  };

  Map.prototype.clear = function () {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  Map.prototype.draw = function () {
    if (!this.redraw) return;
    this.clear();
    for (var i=this.rects.length; i--;)
      this.rects[i].draw(this.context, this.selected);
    this.redraw = false;
  };

  Map.prototype.toHTML = function (useBase64) {
    var div = document.createElement('div');
    var map = document.createElement('map');
    var image = this.image;
    if (!useBase64) {
      image = new Image();
      image.width = this.image.width;
      image.height = this.image.height;
    }
    map.id = map.name = image.useMap = 'map';
    for (var i=this.rects.length; i--;)
      map.appendChild(this.rects[i].toHTML());
    div.appendChild(image);
    div.appendChild(map);
    return div;
  };

  Map.prototype.toggleControls = function (shouldEnable) {
    for (var fieldName, i=fields.length; i--;) {
      fieldName = fields[i];
      this.form[fieldName].value = shouldEnable ? this.selected[fieldName] : '';
      this.form[fieldName].disabled = !shouldEnable;
    }
  };

  function Rect(canvas, x, y, width, height, f) {
    this.canvas = canvas;
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || Rect.DEFAULT_SIZE; // default width and height?
    this.height = height || Rect.DEFAULT_SIZE;
    this.f = f || '#444444';
    this.url = '#';
    this.target = '_blank';
    this.alt = '';
  }

  Rect.DEFAULT_SIZE = 20;
  Rect.ANCHOR_SIZE = 6;
  Rect.ANCHOR_STROKE = '#cc0000';
  Rect.ANCHOR_FILL = 'darkred';
  Rect.Anchors = { NW: 0, N: 1, NE: 2, W: 3, E: 4, SW: 5, S: 6, SE: 7 };

  Rect.prototype.anchors = function () {
    var x = this.x - Rect.ANCHOR_SIZE / 2;
    var y = this.y - Rect.ANCHOR_SIZE / 2;
    var w = this.width, h = this.height;
    return [
      { x: x,          y: y },
      { x: x + w / 2,  y: y },
      { x: x + w,      y: y },
      { x: x,          y: y + h / 2 },
      { x: x + w,      y: y + h / 2 },
      { x: x,          y: y + h },
      { x: x + w / 2,  y: y + h },
      { x: x + w,      y: y + h }
    ];
  };

  Rect.prototype.draw = function (context, selected) {
    context.fillStyle = 'rgba(220,205,65,0.7)';
    context.fillRect(this.x, this.y, this.width, this.height);

    if (selected === this) {
      context.strokeStyle = Rect.ANCHOR_STROKE;
      context.lineWidth = 1;
      context.strokeRect(this.x, this.y, this.width, this.height);
      context.fillStyle = Rect.ANCHOR_FILL;

      // top left, middle, right
      var anchors = this.anchors();
      for (var i=8; i--;) {
        var anchor = anchors[i];
        context.fillRect(anchor.x, anchor.y, Rect.ANCHOR_SIZE, Rect.ANCHOR_SIZE);
      }
    }
  };

  Rect.prototype.transform = function (anchor) {
    var x = this.x, y = this.y, w = this.width, h = this.height;
    var attrs = {};

    switch (anchor) {
    case Rect.Anchors.NW:
      attrs = { y: mouseY, x: mouseX };
      break;
    case Rect.Anchors.N:
      attrs = { y: mouseY };
      break;
    case Rect.Anchors.NE:
      attrs = { y: mouseY, width: mouseX - x };
      break;
    case Rect.Anchors.E:
      attrs = { width: mouseX - x };
      break;
    case Rect.Anchors.SE:
      attrs = { width: mouseX - x, height: mouseY - y };
      break;
    case Rect.Anchors.S:
      attrs = { height: mouseY - y };
      break;
    case Rect.Anchors.SW:
      attrs = { x: mouseX, height: mouseY - y };
      break;
    case Rect.Anchors.W:
      attrs = { x: mouseX };
      break;
    }
    this.attrs(attrs, true);
  };

  Rect.prototype.attrs = function (attrs, shouldStretch) {
    if ('url' in attrs) this.url = attrs.url;
    if ('target' in attrs) this.target = attrs.target;

    if ('x' in attrs) {
      if (shouldStretch) {
        var oldX = this.x;
        this.x = Math.max(0, Math.min(attrs.x, this.x + this.width));
        this.width = this.width + oldX - this.x;
        if (this.width + this.x > this.canvas.width)
          this.width = this.canvas.width - this.x;
      } else {
        this.x = Math.max(0, Math.min(attrs.x, this.x + this.width, this.canvas.width - this.width));
      }
    }

    if ('y' in attrs) {
      if (shouldStretch) {
        var oldY = this.y;
        this.y = Math.max(0, Math.min(attrs.y, this.y + this.height));
        this.height = this.height + oldY - this.y;
        if (this.height + this.y > this.canvas.height)
          this.height = this.canvas.height - this.y;
      } else {
        this.y = Math.max(0, Math.min(attrs.y, this.y + this.height, this.canvas.height - this.height));
      }
    }

    if ('width' in attrs && !(this.x === 0 && 'x' in attrs))
      this.width = Math.max(0, Math.min(attrs.width, this.canvas.width - this.x));

    if ('height' in attrs && !(this.y === 0 && 'y' in attrs))
      this.height = Math.max(0, Math.min(attrs.height, this.canvas.height - this.y));

  };

  Rect.prototype.getCoords = function () {
    return [this.x, this.y, this.x + this.width, this.y + this.height].join(',');
  };

  Rect.prototype.isWithin = function (x, y) {
    return this.x <= x && this.x + this.width >= x &&
           this.y <= y && this.y + this.height >= y;
  };

  Rect.prototype.toHTML = function () {
    var area = document.createElement('area');
    area.coords = this.getCoords();
    area.href = this.url;
    area.target = this.target;
    area.alt = this.alt;
    return area;
  };

  function updateGenerated(map) {
    if (updateGeneratedThrottle) {
      return;
    } else {
      updateGeneratedThrottle = true;
      setTimeout(function () {
        updateGeneratedThrottle = false;
      }, 1000);
    }
    var div = map.toHTML(map.base64);
    elGenerated.innerHTML = div.innerHTML;
    map.preview.getElementsByTagName('map')[0].innerHTML =
      div.getElementsByTagName('map')[0].innerHTML;
    if (map.selected) {
      for (var fieldName, i=fields.length; i--;) {
        fieldName = fields[i];
        if (map.form[fieldName].value != map.selected[fieldName])
          map.form[fieldName].value = map.selected[fieldName];
      }
    }
  }

  window.onload = function () {
    var canvas = document.getElementById('mapper');
    var preview = document.getElementById('preview')
                          .getElementsByClassName('content')[0];
    var form = document.getElementById('selected');
    var map = window.map = new Map(canvas, preview, form);
    var reader = new FileReader();
    var Status = {IDLE: 0, RESIZING: 1, DRAGGING: 2};
    var status = Status.IDLE;
    var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
    var offsetX, offsetY;

    function getMouse(e, canvas) {
      var el = canvas;
      var offsetX = stylePaddingLeft + styleBorderLeft;
      var offsetY = stylePaddingTop + styleBorderTop;

      do {
        offsetX += el.offsetLeft;
        offsetY += el.offsetTop;
      } while (el = el.offsetParent);

      mouseX = Math.max(0, e.pageX - offsetX);
      mouseY = Math.max(0, e.pageY - offsetY);
    }

    // fixes mouse co-ordinate problems when there's a border or padding
    // see getMouse for more detail
    if (document.defaultView && document.defaultView.getComputedStyle) {
      var style = document.defaultView.getComputedStyle(canvas, null);
      stylePaddingLeft = +style.paddingLeft || 0;
      stylePaddingTop = +style.paddingTop || 0;
      styleBorderLeft = +style.borderLeftWidth || 0;
      styleBorderTop = +style.borderTopWidth || 0;
    }

    canvas.ondblclick = function (e) {
      var x = mouseX - Rect.ANCHOR_SIZE / 2;
      var y = mouseY - Rect.ANCHOR_SIZE / 2;
      map.add(new Rect(map.canvas, x, y));
    };

    //fixes a problem where double clicking causes text to get selected on the canvas
    canvas.onselectstart = function () { return false; };

    // set our events. Up and down are for dragging,
    // double click is for making new rects
    canvas.onmousedown = function (e) {
      if (e.target.id === 'remove') return map.remove();
      if (e.target.id === 'add') return map.add(new Rect());
      if (fields.indexOf(e.target.id) >= 0) return;

      //we are over a selection rect
      if (currentAnchor !== -1) {
        status = Status.RESIZING;
        this.classList.add('state-resizing');
      } else if (status !== Status.DRAGGING) {
        for (var i=map.rects.length; i--;) {
          if (map.rects[i].isWithin(mouseX, mouseY)) {
            status = Status.DRAGGING;
            this.classList.add('state-dragging');
            if (map.selected !== map.rects[i])
              map.select(map.rects[i]);
            offsetX = mouseX - map.selected.x;
            offsetY = mouseY - map.selected.y;
            return;
          }
        }
        // havent returned means we have selected nothing
        status = Status.IDLE;
        map.deselect();
      }
    };

    document.body.onmouseup = function () {
      if (status !== Status.IDLE) {
        updateGenerated(map);
        status = Status.IDLE;
        currentAnchor = -1;
        this.classList.remove('state-dragging', 'state-resizing');
      }
    };

    document.body.onmousemove = function (e) {
      getMouse(e, map.canvas);

      if (status === Status.DRAGGING) {
        map.selected.attrs({ x: mouseX - offsetX, y: mouseY - offsetY });
        map.redraw = true;
      } else if (status === Status.RESIZING) {
        map.selected.transform(currentAnchor);
        map.redraw = true;
      } else if (map.selected) {
        // see if we're hovering over an anchor
        var anchors = map.selected.anchors();
        for (var i=8; i--;) {
          var anchor = anchors[i];
          // we dont need to use the ghost context because
          // selection handles will always be rectangles
          if (mouseX >= anchor.x && mouseX <= anchor.x + Rect.ANCHOR_SIZE &&
              mouseY >= anchor.y && mouseY <= anchor.y + Rect.ANCHOR_SIZE) {
            // we found one!
            currentAnchor = i;
            map.redraw = true;
            this.style.cursor = cursors[i];
            return;
          }
        }
        currentAnchor = -1;
        this.style.cursor = map.selected.isWithin(mouseX, mouseY) ? 'move' : 'auto';
      }
    };

    document.body.ondragover = function (e) {
      e.preventDefault();
      this.className = 'state-dragover';
    };

    document.body.ondragend = function (e) { e.preventDefault(); };

    document.body.ondrop = function (e) {
      e.preventDefault();
      reader.readAsDataURL(e.dataTransfer.files[0]);
    };

    document.body.onkeydown = function (e) {
      if ((e.keyCode === 8 || e.keyCode === 46) && map.selected &&
          fields.indexOf(e.target.id) < 0) {
        e.preventDefault();
        map.remove();
      }
    };

    document.getElementById('base64').onchange = function () {
      map.base64 = this.checked;
      updateGenerated(map);
    };

    reader.onload = function (e) {
      map.load(e.target.result);
      document.body.className = 'state-started';
    };

    function updateField() {
      var attrs = {};
      if (!this.value || !map.selected) return;
      attrs[this.id] = this.value;
      map.selected.attrs(attrs);
      map.redraw = true;
      updateGenerated(map);
    }

    for (var i=fields.length; i--;) {
      var field = document.getElementById(fields[i]);
      field.onkeyup = updateField;
      field.onchange = updateField;
    }

    window.requestAnimationFrame = window.requestAnimationFrame ||
      window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
      window.msRequestAnimationFrame || window.oRequestAnimationFrame;

    var redraw = function () {
      map.draw();
      window.requestAnimationFrame(redraw);
    };

    window.requestAnimationFrame(redraw);
  };

}());
