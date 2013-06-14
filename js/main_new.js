(function () {

  var Status = {IDLE: 'idle', MOVING: 'moving', RESIZING: 'resizing'};

  var Anchor = {NW: 'nw', N: 'n', NE: 'ne', E: 'e',
                SE: 'se', S: 's', SW: 'sw', W: 'w'};

  var status = Status.IDLE;
  var mouseX, mouseY;
  var anchor;

  function Map(canvas, form, options) {
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
    this.image.src = '';
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

  Map.prototype.remove = function (area) {
    if (area === this.selected) this.selected = null;
    this.areas.splice(this.areas.indexOf(area, 1));
    this.redraw = true;
  };

  Map.prototype.draw = function () {
    window.requestAnimationFrame(this.draw);
    if (!this.redraw) return;

    this.clear();
    for (var i=this.areas.length; i--;)
      this.areas[i].draw(this.context);
    this.redraw = false;
  };

  Map.prototype.clear = function () {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  Map.prototype.select = function (area) {
    this.selected = area;
    this.selected.select();
    this.redraw = true;
  };

  Map.prototype.deselect = function () {
    this.selected.deselect();
    this.selected = null;
    this.redraw = true;
  };

  Map.prototype.toHTML = function () {
    var html = [
      '<img src="',
      (useBase64 ? map.currentImage.src : '//YOUR.LINK.TO/IMG.PNG'),
      '" usemap=map height=',
      this.canvas.height + ' width=' + this.width + '>',
      '<map name=map id=map>'
    ];
    for (var i=map.rects.length; i--;)
      html.push(map.rects[i].toHTML());
    html.push('</map>');
    return html.join('\n');
  };

  function Area(x, y, width, height) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || Area.DEFAULT_SIZE;
    this.height = height || Area.DEFAULT_SIZE;
    this._anchors = [];
  }

  Area.DEFAULT_SIZE = 20;
  Area.ANCHOR_SIZE = 10;

  Area.inX = function (x, width, pointX) {
    return x <= pointX && x + width >= pointX;
  };

  Area.inY = function (y, height, pointY) {
    return y <= pointY && y + height >= pointY;
  };

  Area.in = function (x, y, width, height, pointX, pointY) {
    var inX = Area.inX(x, width, pointX);
    var inY = Area.inY(y, height, pointY);
    return Area.inX && inY;
  };

  Area.prototype.anchors = function () {
    var _size = Area.ANCHOR_SIZE;
    var _x = this.x - _size / 2;
    var _y = this.y - _half;

    return [
      { x: x - half, y: y - half },
      { x: x + w / 2 - half, y: y - half },
      { x: x + w - half, y: y - half },
      { x: x - half, y: y + h / 2 - half },
      { x: x + w - half, y: y + h / 2 - half },
      { x: x - half, y: y + h - half },
      { x: x + w / 2 - half, y: y + h - half },
      { x: x + w - half, y: y + h - half }
    ];
  };

  function () {

  };

  Area.prototype.draw = function () {};

  Area.prototype.select = function () {};

  Area.prototype.move = function () {};

  Area.prototype.resize = function () {};

  Area.prototype.in = function (x, y) {
    return Area.in(this.x, this.y, this.width, this.height, x, y);
  };

  Area.prototype.isAnchor = function (x, y) {
    var _size = Area.ANCHOR_SIZE;
    var _x = this.x - _size / 2;
    var _y = this.y - _half;

    return Area.inX(_x, _size, x) ? (
        Area.inY(_y, _size, y) ? Anchor.NW :
        Area.inY(_y + this.height / 2, _size, y) ? Anchor.W :
        Area.inY(_y + this.height, _size, y) ? Anchor.SW : null
      ) :
      Area.inX(_x + this.width / 2, _size, x) ? (
        Area.inY(_y, _size, y) ? Anchor.N :
        Area.inY(_y + this.height, _size, y) ? Anchor.S : null
      ) :
      Area.inX(_x + this.width, _size, x) ? (
        Area.inY(_y - _half, _size, y) ? Anchor.NE :
        Area.inY(_y - _half + this.height / 2, _size, y) ? Anchor.E :
        Area.inY(_y - _half + this.height, _size) ? Anchor.SE : null
      ) : null;
  };

  Area.prototype.toHTML = function () {
    return '<area coords=' + rect.getCoords() + ' href=' + rect.href + ' target=' + rect.target + '>');
  };

  window.requestAnimationFrame = window.requestAnimationFrame ||
    window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame || window.oRequestAnimationFrame;

  window.onload = function () {
    var canvas = document.getElementById('canvas');
    var form = document.getElementById('form');
    var inputs = form.getElementsByTagName('input');
    var map = new Map(canvas);
    var reader = new FileReader();
    var dropzone = document.body;

    reader.onload = function (e) {
      map.load(e.target.result);
    };

    dropzone.ondragover = function (e) {
      e.preventDefault();
    };

    dropzone.ondragend = function (e) {
      e.preventDefault();
    };

    dropzone.ondrop = function (e) {
      e.preventDefault();
      reader.readAsDataURL(e.dataTransfer.files[0]);
    };

    canvas.ondblclick = function (e) {
      var x = mouseX - Area.DEFAULT_SIZE / 2;
      var y = mouseY - Area.DEFAULT_SIZE / 2;
      map.add(new Area(x, y));
    };

    var changedInput = function (e) {
      if (!map.selected) return;
      map.selected[this.name] = this.value;
    };

    for (var i=inputs.length; i--;)
      inputs[i].onchange = changedInput;

    document.body.onclick = function (e) {
      // Hovering over an anchor, so resize
      if (anchor) {
        status = Status.RESIZING;
      } else {
        for (var i=map.areas.length; i--;) {
          if (map.rects[i].in(mouseX, mouseY)) {
            status = Status.MOVING;
            return map.select(i);
          }
        }
      }
      this.classList.add(status);
    };

    document.body.onkeydown = function (e) {
      if (map.selected && (e.keyCode === 8 || e.keyCode === 46))
        map.remove(map.selected);
    };

    document.body.onmousemove = function (e) {
      if (status === Status.DRAGGING) {
        map.selected.move(mouseX, mouseY);
      } else if (status === Status.RESIZING) {
        map.selected.resize(anchor);
      }
    };

  };

}());
