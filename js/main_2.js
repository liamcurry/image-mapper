(function () {

  window.requestAnimationFrame = window.requestAnimationFrame ||
    window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame || window.oRequestAnimationFrame;

  // will save the # of the selection handle if the mouse is over one.
  var currentAnchor = -1;
  var useBase64 = false;
  var Anchors = { NW: 0, N: 1, NE: 2, W: 3, E: 4, SW: 5, S: 6, SE: 7 };
  var cursors = [
    'nw-resize', 'n-resize', 'ne-resize',
    'w-resize',
    'e-resize',
    'sw-resize', 's-resize', 'se-resize'
  ];
  var anchorSize = 6;
  var anchorColor1 = '#cc0000';
  var anchorColor2 = 'darkred';
  var reader = new FileReader();
  var elGenerated = document.getElementById('generated');
  var elControls = document.getElementById('controls');
  var elSelected = document.getElementById('selected');
  var offsetX, offsetY, mouseX, mouseY;
  var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
  var Status = {IDLE: 0, RESIZING: 1, MOVING: 2};
  var status = Status.IDLE;

  function Map(canvas) {
    this.reset();
    this.image = new Image();
    this.canvas = canvas;
    this.context = this.canvas.getContext('2d');
    this.options = options || {};
    window.requestAnimationFrame(this.draw);
  }

  Map.prototype.reset = function () {
    this.areas = [];
    this.selected = null;
    this.redraw = true;
  };

  Map.prototype.load = function (imageData) {
    this.reset();
    this.image.src = imageData;
    this.canvas.width = this.image.width;
    this.canvas.height = this.image.height;
    this.canvas.style.background = 'url(' + imageData + ')';
  };

  Map.prototype.add = function (area) {
    this.areas.push(this.selected = area);
    this.redraw = true;
  };

  Map.prototype.remove = function (index) {
    this.areas.splice(index || this.areas.indexOf(this.selected), 1);
    this.selected = null;
    this.redraw = true;
  };

  Map.prototype.draw = function () {
    if (status === Status.IDLE && !this.redraw) return;
    this.clear();
    for (var i=this.areas.length; i--;)
      this.areas[i].draw(this.context, this.selected);
    updateGenerated(this);
    this.redraw = false;
  };

  Map.prototype.clear = function () {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  Map.prototype.select = function (index) {
    if (index === this.areas.indexOf(this.selected)) return;
    this.selected = this.areas[index];
  };

  Map.prototype.deselect = function () {
    toggleControls(0);
    this.selected = null;
    this.redraw = false;
  };

  Map.prototype.toHTML = function () {
    var html = [
      '<img src="' +
      (useBase64 ? this.image.src : '//YOUR.LINK.TO/IMG.PNG') +
      '" usemap=map height=' + this.canvas.height + ' width=' + this.canvas.width + '>',
      '<map name=map id=map>'
    ];
    for (var i=this.areas.length; i--;)
      html.push(this.areas[i].toHTML());
    html.push('</map>');
    return html.join('\n');
  };

  function Area(x, y, canvas, width, height, fill) {
    this.x = x || 0;
    this.y = y || 0;
    this.canvas = canvas;
    this.width = width || Area.DEFAULT_SIZE;
    this.height = height || Area.DEFAULT_SIZE;
    this.fill = fill || '#444444';
    this.url = '#';
    this.target = '_blank';
    this.anchors = [];
  }

  Area.DEFAULT_SIZE = 20;

  Area.prototype.draw = function (context, selected) {
    var x = this.x, y = this.y, w = this.width, h = this.height;

    context.fillStyle = 'rgba(220,205,65,0.7)';
    context.fillRect(x, y, w, h);

    // draw selection
    // this is a stroke along the rect and also 8 new selection handles
    if (selected === this) {
      context.strokeStyle = anchorColor1;
      context.lineWidth = 2;
      context.strokeRect(x, y, w, h);
      context.fillStyle = anchorColor2;

      var half = anchorSize / 2;

      // top left, middle, right
      this.anchors = [
        { x: x - half,
          y: y - half },
        { x: x + w / 2 - half,
          y: y - half },
        { x: x + w - half, y: y - half },
        { x: x - half, y: y + h / 2 - half },
        { x: x + w - half, y: y + h / 2 - half },
        { x: x - half, y: y + h - half },
        { x: x + w / 2 - half, y: y + h - half },
        { x: x + w - half, y: y + h - half }
      ];

      for (var i=8; i--;) {
        var anchor = this.anchors[i];
        context.fillRect(anchor.x, anchor.y, anchorSize, anchorSize);
      }
    }

  };

  Area.prototype.resizeToMouse = function (fromAnchor) {
    var x = this.x, y = this.y, w = this.width, h = this.height;
    var attrs = {};

    switch (fromAnchor) {
    case Anchors.NW:
      attrs = {
        y: mouseY, h: h + (y - mouseY),
        x: mouseX, w: w + (x - mouseX)
      };
      break;
    case Anchors.N:
      attrs = { y: mouseY, h: h + (y - mouseY) };
      break;
    case Anchors.NE:
      attrs = { y: mouseY, h: h + (y - mouseY), w: mouseX - x };
      break;
    case Anchors.E:
      attrs = { w: mouseX - x };
      break;
    case Anchors.SE:
      attrs = { w: mouseX - x, h: mouseY - y };
      break;
    case Anchors.S:
      attrs = { h: mouseY - y };
      break;
    case Anchors.SW:
      attrs = { x: mouseX, w: w + (x - mouseX), h: mouseY - y };
      break;
    case Anchors.W:
      attrs = { x: mouseX, w: w + (x - mouseX) };
      break;
    }
    this.attrs(attrs);
  };

  Area.prototype.attrs = function (attrs) {
    if (attrs.x)
      this.x = Math.max(0, Math.min(attrs.x, this.x + this.width, this.canvas.width - this.width));
    if (attrs.y)
      this.y = Math.max(0, Math.min(attrs.y, this.y + this.height, this.canvas.height - this.height));
    if (attrs.w)
      this.width = Math.max(0, Math.min(attrs.w, this.canvas.width - this.x));
    if (attrs.h)
      this.height = Math.max(0, Math.min(attrs.h, this.canvas.height - this.y));
  };

  Area.prototype.coords = function () {
    return [this.x, this.y, this.x + this.width, this.y + this.height].join(',');
  };

  Area.prototype.isWithin = function (x, y) {
    return this.x <= x && this.x + this.width >= x &&
           this.y <= y && this.y + this.height >= y;
  };

  Area.prototype.toHTML = function () {
    return '<area coords=' + this.coords() + ' href=' + this.url +
           ' target=' + this.target + '>';
  };

  function toggleControls(shouldEnable) {
    elControls.className = shouldEnable ? 'enabled' : 'disabled';
  }

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

  function updateGenerated(map) {
    var html = map.toHTML();
    elGenerated.innerHTML = '<pre>' + html.replace(/</g, '&lt;')
                                          .replace(/>/g, '&gt;') + '</pre>';
  }

  window.onload = function () {
    var canvas = document.getElementById('mapper');
    var map = new Map(canvas);

    // fixes mouse coordinate problems when there's a border or padding
    // see getMouse for more detail
    if (document.defaultView && document.defaultView.getComputedStyle) {
      var style = document.defaultView.getComputedStyle(canvas, null);
      stylePaddingLeft = +style.paddingLeft || 0;
      stylePaddingTop = +style.paddingTop || 0;
      styleBorderLeft = +style.borderLeftWidth || 0;
      styleBorderTop = +style.borderTopWidth || 0;
    }

    canvas.ondblclick = function (e) {
      getMouse(e, canvas);
      var areaX = mouseX - Area.DEFAULT_SIZE / 2;
      var areaY = mouseY - Area.DEFAULT_SIZE / 2;
      map.add(new Area(areaX, areaY, this));
    };

    //fixes a problem where double clicking causes text to get selected on the canvas
    canvas.onselectstart = function () { return false; };

    // set our events. Up and down are for dragging,
    // double click is for making new areas
    document.body.onmousedown = function (e) {
      getMouse(e, canvas);

      //we are over a selection rect
      if (currentAnchor !== -1) {
        map.status = Status.RESIZING;
        this.classList.add('state-resizing');
      } else {
        for (var i=map.areas.length; i--;) {
          if (map.areas[i].isWithin(mouseX, mouseY)) {
            this.classList.add('state-dragging');
            return map.select(i);
          }
        }
        // havent returned means we have selected nothing
        map.deselect();
      }
    };

    document.body.onmouseup = function () {
      map.status = Status.IDLE;
      currentAnchor = -1;
      this.classList.remove('state-dragging', 'state-resizing');
    };

    document.body.onmousemove = function (e) {

      getMouse(e, canvas);

      if (map.status === Status.MOVING) {
        map.selected.attrs({ x: mouseX - offsetX, y: mouseY - offsetY });
      } else if (map.status === Status.RESIZING) {
        map.selected.resizeToMouse(currentAnchor);
      } else if (map.selected) {
        // see if we're hovering over an anchor
        for (var i=8; i--;) {
          var anchor = map.selected.anchors[i];

          // we dont need to use the ghost context because
          // selection handles will always be rectangles
          if (mouseX >= anchor.x && mouseX <= anchor.x + anchorSize &&
              mouseY >= anchor.y && mouseY <= anchor.y + anchorSize) {
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
        map.remove();
      }
    };

    reader.onload = function (e) {
      map.load(e.target.result);
    };

    /*
    for (var i=selectedFields.length; i--;) {
      document.getElementById(selectedFields[i]).onchange = function () {
        var attrs = {};
        attrs[selectedFields[i]] = this.value;
        map.selected.attrs(attrs);
      };
    }
    */

    var redraw = function () {
      map.draw();
      window.requestAnimationFrame(redraw);
    };
    window.requestAnimationFrame(redraw);
    window._map = map;
  };

}());
