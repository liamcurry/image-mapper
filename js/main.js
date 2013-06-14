(function () {

  window.requestAnimationFrame = window.requestAnimationFrame ||
    window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame || window.oRequestAnimationFrame;

  // will save the # of the selection handle if the mouse is over one.
  var currentAnchor = -1;
  var useBase64 = false;
  var Anchors = { NW: 0, N: 1, NE: 2, W: 3, E: 4, SW: 5, S: 6, SE: 7 };
  var cursors = [
    'nw-resize', 'n-resize', 'ne-resize', 'w-resize',
    'e-resize', 'sw-resize', 's-resize', 'se-resize'
  ];
  var anchorColor1 = '#cc0000';
  var anchorColor2 = 'darkred';
  var reader = new FileReader();
  var elGenerated = document.getElementById('generated');
  var elControls = document.getElementById('controls');
  var canvas = document.getElementById('mapper');
  var form = document.getElementById('selected');
  var fields = ['x', 'y', 'width', 'height', 'url', 'target'];
  var offsetX, offsetY, mouseX, mouseY;
  var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;

  var Status = {IDLE: 0, RESIZING: 1, DRAGGING: 2};
  var status = Status.IDLE;

  window.map = {

    selected: null,

    rects: [],

    redraw: true,

    image: new Image(),

    context: canvas.getContext('2d'),

    status: 0,

    load: function (imageData) {
      map.image.src = imageData;
      map.rects = [];
      canvas.width = map.image.width;
      canvas.height = map.image.height;
      canvas.style.background = 'url(' + imageData + ')';
      map.redraw = true;
    },

    addRect: function (x, y, w, h) {
      map.selected = new Rect(x, y, w, h);
      map.rects.push(map.selected);
      map.redraw = true;
    },

    select: function (index) {
      var selected = map.selected = map.rects[index];
      var fieldName;
      for (var i=fields.length; i--;) {
        fieldName = fields[i];
        form[fieldName].value = selected[fieldName];
      }

      offsetX = mouseX - selected.x;
      offsetY = mouseY - selected.y;

      map.selected.x = mouseX - offsetX;
      map.selected.y = mouseY - offsetY;

      toggleControls(1);
      status = Status.DRAGGING;
      map.redraw = true;
    },

    deselect: function () {
      map.selected = null;
      toggleControls(0);
      map.redraw = true;
    },

    clear: function () {
      map.context.clearRect(0, 0, canvas.width, canvas.height);
    },

    draw: function () {
      if (!map.redraw) return;
      map.clear();
      for (var i=map.rects.length; i--;)
        map.rects[i].draw(map.context);
      map.redraw = false;
    },

    toHTML: function () {
      var html = [
        '<img src="' +
        (useBase64 ? map.image.src : '//YOUR.LINK.TO/IMG.PNG') +
        '" usemap=map height=' + canvas.height + ' width=' + canvas.width + '>',
        '<map name=map id=map>'
      ];
      for (var i=map.rects.length; i--;)
        html.push(map.rects[i].toHTML());
      html.push('</map>');
      return html.join('\n');
    }

  };

  function Rect(x, y, width, height, f) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 1; // default width and height?
    this.height = height || 1;
    this.f = f || '#444444';
    this.url = '#';
    this.target = '_blank';
    this.anchors = [];
  }

  Rect.ANCHOR_SIZE = 6;

  Rect.prototype.draw = function (context, optionalColor) {
    context.fillStyle = 'rgba(220,205,65,0.7)';
    context.fillRect(this.x, this.y, this.width, this.height);

    if (map.selected === this) {
      var x = this.x - Rect.ANCHOR_SIZE / 2;
      var y = this.y - Rect.ANCHOR_SIZE / 2;
      var w = this.width, h = this.height;

      context.strokeStyle = anchorColor1;
      context.lineWidth = 2;
      context.strokeRect(this.x, this.y, this.width, this.height);
      context.fillStyle = anchorColor2;

      // top left, middle, right
      this.anchors = [
        { x: x, y: y },
        { x: x + w / 2,  y: y },
        { x: x + w,      y: y },
        { x: x,          y: y + h / 2 },
        { x: x + w,      y: y + h / 2 },
        { x: x,          y: y + h },
        { x: x + w / 2,  y: y + h },
        { x: x + w,      y: y + h }
      ];

      for (var i=8; i--;) {
        var anchor = this.anchors[i];
        context.fillRect(anchor.x, anchor.y, Rect.ANCHOR_SIZE, Rect.ANCHOR_SIZE);
      }
    }

  };

  Rect.prototype.resize = function (fromAnchor) {
    var x = this.x, y = this.y, w = this.width, h = this.height;
    var attrs = {};

    switch (fromAnchor) {
    case Anchors.NW:
      attrs = {
        y: mouseY, height: h + (y - mouseY),
        x: mouseX, width: w + (x - mouseX)
      };
      break;
    case Anchors.N:
      attrs = { y: mouseY, height: h + (y - mouseY) };
      break;
    case Anchors.NE:
      attrs = { y: mouseY, height: h + (y - mouseY), width: mouseX - x };
      break;
    case Anchors.E:
      attrs = { width: mouseX - x };
      break;
    case Anchors.SE:
      attrs = { width: mouseX - x, height: mouseY - y };
      break;
    case Anchors.S:
      attrs = { height: mouseY - y };
      break;
    case Anchors.SW:
      attrs = { x: mouseX, width: w + (x - mouseX), height: mouseY - y };
      break;
    case Anchors.W:
      attrs = { x: mouseX, width: w + (x - mouseX) };
      break;
    }
    this.attrs(attrs);
  };

  Rect.prototype.attrs = function (attrs) {
    if (attrs.url)
      this.url = attrs.url;
    if (attrs.target)
      this.target = attrs.target;
    if (attrs.x)
      this.x = Math.max(0, Math.min(attrs.x, this.x + this.width, canvas.width - this.width));
    if (attrs.y)
      this.y = Math.max(0, Math.min(attrs.y, this.y + this.height, canvas.height - this.height));
    if (attrs.width)
      this.width = Math.max(0, Math.min(attrs.width, canvas.width - this.x));
    if (attrs.height)
      this.height = Math.max(0, Math.min(attrs.height, canvas.height - this.y));
    map.redraw = true;
  };

  Rect.prototype.getCoords = function () {
    return [this.x, this.y, this.x + this.width, this.y + this.height].join(',');
  };

  Rect.prototype.isWithin = function (x, y) {
    return this.x <= x && this.x + this.width >= x &&
           this.y <= y && this.y + this.height >= y;
  };

  Rect.prototype.toHTML = function () {
    return '<area coords=' + this.getCoords() + ' href=' + this.url +
           ' target=' + this.target + '>';
  };

  function toggleControls(shouldEnable) {
    elControls.className = shouldEnable ? 'enabled' : 'disabled';
  }

  function getMouse(e) {
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

  function updateGenerated(map) {
    var html = map.toHTML();
    elGenerated.innerHTML = '<pre>' + html.replace(/</g, '&lt;')
                                          .replace(/>/g, '&gt;') + '</pre>';
    if (map.selected) {
      console.log('updating selected');
      for (var fieldName, i=fields.length; i--;) {
        fieldName = fields[i];
        form[fieldName].value = map.selected[fieldName];
      }
    }
  }

  canvas.ondblclick = function (e) {
    getMouse(e);
    map.addRect(mouseX - 10, mouseY - 10, 20, 20);
  };

  //fixes a problem where double clicking causes text to get selected on the canvas
  canvas.onselectstart = function () { return false; };

  // set our events. Up and down are for dragging,
  // double click is for making new rects
  document.body.onmousedown = function (e) {
    getMouse(e);
    if (fields.indexOf(e.target.id) >= 0) return;

    //we are over a selection rect
    if (currentAnchor !== -1) {
      status = Status.RESIZING;
      this.classList.add('state-resizing');
    } else {
      for (var i=map.rects.length; i--;) {
        if (map.rects[i].isWithin(mouseX, mouseY)) {
          this.classList.add('state-dragging');
          return map.select(i);
        }
      }
      // havent returned means we have selected nothing
      map.deselect();
    }
  };

  document.body.onmouseup = function () {
    if (status !== Status.IDLE) updateGenerated(map);
    status = Status.IDLE;
    currentAnchor = -1;
    this.classList.remove('state-dragging', 'state-resizing');
  };

  document.body.onmousemove = function (e) {

    getMouse(e);

    if (status === Status.DRAGGING) {
      map.selected.attrs({ x: mouseX - offsetX, y: mouseY - offsetY });
      map.redraw = true;
    } else if (status === Status.RESIZING) {
      map.selected.resize(currentAnchor);
    } else if (map.selected) {
      // see if we're hovering over an anchor
      for (var i=8; i--;) {
        var anchor = map.selected.anchors[i];

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
    this.className = 'state-started';
    reader.readAsDataURL(e.dataTransfer.files[0]);
  };

  document.body.onkeydown = function (e) {
    if ((e.keyCode === 8 || e.keyCode === 46) && map.selected) {
      e.preventDefault();
      map.rects.splice(map.rects.indexOf(map.selected), 1);
      map.selected = null;
      map.redraw = true;
    }
  };

  reader.onload = function (e) {
    map.load(e.target.result);
  };

  for (var i=fields.length; i--;) {
    document.getElementById(fields[i]).onkeydown = function () {
      var attrs = {};
      attrs[this.id] = this.value;
      map.selected.attrs(attrs);
      map.redraw = true;
    };
  }

  window.onload = function () {
    // fixes mouse co-ordinate problems when there's a border or padding
    // see getMouse for more detail
    if (document.defaultView && document.defaultView.getComputedStyle) {
      var style = document.defaultView.getComputedStyle(canvas, null);
      stylePaddingLeft = +style.paddingLeft || 0;
      stylePaddingTop = +style.paddingTop || 0;
      styleBorderLeft = +style.borderLeftWidth || 0;
      styleBorderTop = +style.borderTopWidth || 0;
    }

    var redraw = function () {
      map.draw();
      window.requestAnimationFrame(redraw);
    };

    window.requestAnimationFrame(redraw);
    window.map = map;
  };

}());
