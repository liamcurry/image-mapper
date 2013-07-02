// Warning: this code is an ugly mess, I know. I'll clean it up later.
(function () {

  var currentAnchor = -1;
  var cursors = [
    'nw-resize', 'n-resize', 'ne-resize', 'w-resize',
    'e-resize', 'sw-resize', 's-resize', 'se-resize'
  ];
  var $generated = $('#pane-code').find('textarea');
  var $controls = $('#pane-info');
  var fields = ['x', 'y', 'width', 'height', 'url', 'target', 'alt'];
  var mouseX, mouseY;
  var Anchor = { NW: 0, N: 1, NE: 2, W: 3, E: 4, SW: 5, S: 6, SE: 7 };

  function Map($canvas, preview, form) {
    var _this = this;
    this.$canvas = $canvas;
    this.preview = preview;
    this.form = form;
    this.context = $canvas[0].getContext('2d');
    this.image = new Image();
    this.image.useMap = '#map';
    this.image.onload = function () {
      $canvas.attr({ width: this.width, height: this.height })
        .css('background', 'url(' + this.src + ')');
      preview.html($(this).clone()).prepend(_this.render());
      updateGenerated(_this);
    };
    console.log(this);
    this.reset();
  }

  Map.prototype = {

    reset: function () {
      this.redraw = true;
      this.selected = null;
      this.rects = [];
    },

    load: function (src) {
      this.reset();
      this.image.src = src;
    },

    remove: function (index) {
      this.rects.splice(index || this.rects.indexOf(this.selected), 1);
      this.deselect();
      this.redraw = true;
    },

    add: function (area) {
      area.$canvas = this.$canvas;
      this.rects.push(area);
      this.select(area);
    },

    select: function (area) {
      this.selected = area;
      this.toggleControls(true);
      this.redraw = true;
    },

    deselect: function () {
      this.selected = null;
      this.toggleControls(false);
      this.redraw = true;
    },

    clear: function () {
      this.context.clearRect(0, 0, this.$canvas.width(), this.$canvas.height());
    },

    draw: function () {
      if (!this.redraw) return;
      this.clear();
      for (var i=this.rects.length; i--;)
        this.rects[i].draw(this.context, this.selected);
      this.redraw = false;
    },

    render: function () {
      var $map = $('<map>').attr({'id': 'map', 'name': 'map'});
      for (var i=this.rects.length; i--;)
        $map.append(this.rects[i].render());
      return $map;
    },

    toCode: function () {
      var html = $('<div>').html(this.image).append(this.render()).html();
      html = html.split('>').join('>\n'); // add newlines
      html = html.split('<area').join('  <area');
      return html;
    },

    toggleControls: function (shouldEnable) {
      for (var fieldName, i=fields.length; i--;) {
        fieldName = fields[i];
        this.form[fieldName].value = shouldEnable ? this.selected[fieldName] : '';
        this.form[fieldName].disabled = !shouldEnable;
      }
    }

  };

  function Rect($canvas, x, y, width, height, f) {
    this.$canvas = $canvas;
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || Rect.DEFAULT_SIZE; // default width and height?
    this.height = height || Rect.DEFAULT_SIZE;
    this.f = f || Rect.FILL; //'#444444';
    this.url = '';
    this.target = '_blank';
    this.alt = '';
  }

  Rect.FILL = '#ECF0F1';
  Rect.DEFAULT_SIZE = 20;
  Rect.ANCHOR_SIZE = 6;
  Rect.ANCHOR_STROKE = Rect.ANCHOR_FILL = 'darkred'; //'#2C3E50';

  Rect.prototype = {

    anchors: function () {
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
    },

    draw: function (context, selected) {
      context.fillStyle = 'rgba(220,205,65,0.7)';
      context.fillRect(this.x, this.y, this.width, this.height);

      if (selected === this) {
        context.strokeStyle = Rect.ANCHOR_STROKE;
        context.lineWidth = 1;
        context.strokeRect(this.x, this.y, this.width, this.height);
        //context.fillStyle = Rect.ANCHOR_FILL;

        // top left, middle, right
        var anchors = this.anchors();
        for (var i=8; i--;) {
          var anchor = anchors[i];
          context.strokeRect(anchor.x, anchor.y, Rect.ANCHOR_SIZE, Rect.ANCHOR_SIZE);
        }
      }
    },

    transform: function (anchor) {
      var x = this.x, y = this.y, w = this.width, h = this.height;
      var attrs = {};

      switch (anchor) {
        case Anchor.NW: attrs = { y: mouseY, x: mouseX }; break;
        case Anchor.NE: attrs = { y: mouseY, width: mouseX - x }; break;
        case Anchor.SE: attrs = { width: mouseX - x, height: mouseY - y }; break;
        case Anchor.SW: attrs = { x: mouseX, height: mouseY - y }; break;
        case Anchor.N: attrs = { y: mouseY }; break;
        case Anchor.E: attrs = { width: mouseX - x }; break;
        case Anchor.S: attrs = { height: mouseY - y }; break;
        case Anchor.W: attrs = { x: mouseX }; break;
      }
      this.set(attrs, true);
    },

    set: function (attrs, shouldStretch) {
      var canvasHeight = this.$canvas.height();
      var canvasWidth = this.$canvas.width();

      if ('url' in attrs) this.url = attrs.url;
      if ('target' in attrs) this.target = attrs.target;
      if ('alt' in attrs) this.alt = this.title = attrs.alt;

      if ('x' in attrs) {
        if (shouldStretch) {
          var oldX = this.x;
          this.x = Math.max(0, Math.min(attrs.x, this.x + this.width));
          this.width = this.width + oldX - this.x;
          if (this.width + this.x > canvasWidth)
            this.width = canvasWidth - this.x;
        } else {
          this.x = Math.max(0, Math.min(attrs.x, this.x + this.width, canvasWidth - this.width));
        }
      }

      if ('y' in attrs) {
        if (shouldStretch) {
          var oldY = this.y;
          this.y = Math.max(0, Math.min(attrs.y, this.y + this.height));
          this.height = this.height + oldY - this.y;
          if (this.height + this.y > canvasHeight)
            this.height = canvasHeight - this.y;
        } else {
          this.y = Math.max(0, Math.min(attrs.y, this.y + this.height, canvasHeight - this.height));
        }
      }

      if ('width' in attrs && !(this.x === 0 && 'x' in attrs))
        this.width = Math.max(0, Math.min(attrs.width, canvasWidth - this.x));

      if ('height' in attrs && !(this.y === 0 && 'y' in attrs))
        this.height = Math.max(0, Math.min(attrs.height, canvasHeight - this.y));

    },

    nudge: function (anchor) {
      switch (anchor) {
        case Anchor.N: this.set({ y: this.y - 1 }); break;
        case Anchor.S: this.set({ y: this.y + 1 }); break;
        case Anchor.W: this.set({ x: this.x - 1 }); break;
        case Anchor.E: this.set({ x: this.x + 1 }); break;
      }
    },

    isWithin: function (x, y) {
      return this.x <= x && this.x + this.width >= x &&
              this.y <= y && this.y + this.height >= y;
    },

    render: function () {
      return $('<area>').attr({
        coords: [
          this.x, this.y, this.x + this.width, this.y + this.height
        ].join(','),
        href: this.url,
        target: this.target,
        alt: this.alt
      });
    }

  };

  function updateGenerated(map, updateInputs) {
    var $div = map.render();
    $generated.val(map.toCode());
    map.preview.find('map').replaceWith(map.render());
    if (map.selected && updateInputs !== false) {
      for (var fieldName, i=fields.length; i--;) {
        fieldName = fields[i];
        if (map.form[fieldName].value != map.selected[fieldName])
          map.form[fieldName].value = map.selected[fieldName];
      }
    }
  }

  $(function () {
    var $canvas = $('#map');
    var preview = $('#preview').find('.content');
    var form = document.getElementById('pane-info');
    var map = window.map = new Map($canvas, preview, form);
    var Status = {IDLE: 0, RESIZING: 1, DRAGGING: 2};
    var status = Status.IDLE;
    var reader = new FileReader();
    var mouseOffsetX, mouseOffsetY;

    function start(src) {
      $('body').addClass('state-started');
      map.load(src);
    }

    reader.onload = function (e) {
      start(e.target.result);
    };

    $canvas
      .on('selectstart', function () { return false; })
      .on('dblclick', function (e) {
        map.add(new Rect(map.$canvas, mouseX, mouseY));
      })
      .on('mousedown', function (e) {
        if (currentAnchor !== -1) {
          status = Status.RESIZING;
          document.body.classList.add('state-resizing');
        } else if (status !== Status.DRAGGING) {
          for (var i=map.rects.length; i--;) {
            var rect = map.rects[i];
            var pos = $(e.target).position();
            var offsetX = e.offsetX || e.pageX - pos.left;
            var offsetY = e.offsetY || e.pageY - pos.top;
            if (rect.isWithin(offsetX, offsetY)) {
              status = Status.DRAGGING;
              document.body.classList.add('state-dragging');
              mouseOffsetX = offsetX - rect.x;
              mouseOffsetY = offsetY - rect.y;
              if (map.selected !== rect)
                map.select(rect);
              return;
            }
          }
          // havent returned means we have selected nothing
          status = Status.IDLE;
          map.deselect();
        }
      });

    $('body')
      .on('mouseup', function () {
        if (status !== Status.IDLE) {
          updateGenerated(map);
          status = Status.IDLE;
          currentAnchor = -1;
          $(this).removeClass('state-dragging state-resizing');
        }
      })
      .on('mousemove', function (e) {
        var offsets = $canvas.offset();
        mouseX = Math.floor(Math.max(0, e.pageX - offsets.left));
        mouseY = Math.floor(Math.max(0, e.pageY - offsets.top));

        if (status === Status.DRAGGING) {
          map.selected.set({
            x: mouseX - mouseOffsetX,
            y: mouseY - mouseOffsetY
          });
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
      })
      .on('dragover', function (e) {
        e.preventDefault();
        this.className = 'state-dragover';
      })
      .on('dragend', function (e) { e.preventDefault(); })
      .on('drop', function (e) {
        e.preventDefault();
        reader.readAsDataURL(e.originalEvent.dataTransfer.files[0]);
      })
      .on('keydown', function (e) {
        if (!map.selected || fields.indexOf(e.target.id) >= 0) return;

        switch (e.which) {
        case 8:
        case 46:
          e.preventDefault();
          map.remove();
          break;
        case 37:
          e.preventDefault();
          map.selected.nudge(Anchor.W);
          map.redraw = true;
          break;
        case 38:
          e.preventDefault();
          map.selected.nudge(Anchor.N);
          map.redraw = true;
          break;
        case 39:
          e.preventDefault();
          map.selected.nudge(Anchor.E);
          map.redraw = true;
          break;
        case 40:
          e.preventDefault();
          map.selected.nudge(Anchor.S);
          map.redraw = true;
          break;
        }
      });

    $('#area-remove').on('click', function (e) {
      e.preventDefault();
      map.remove();
    });

    $('#area-add').on('click', function (e) {
      e.preventDefault();
      map.add(new Rect());
    });

    $('#start-file').on('change', function (e) {
      reader.readAsDataURL(e.target.files[0]);
    });

    $generated.on('click', function () {
      this.select();
    });

    $('a.restart').click(function (e) {
      e.preventDefault();
      document.body.className = '';
    });

    $('#selected').find('input, select').on('change keyup', function () {
      var attrs = {};
      if (!this.value || !map.selected) return;
      attrs[this.id] = this.value;
      map.selected.set(attrs);
      map.redraw = true;
      updateGenerated(map, false);
    });

    var vars = {};
    var q = document.URL.split('?')[1];
    if (q) {
      q = q.split('&');
      for (var i=q.length, hash; i--;) {
        console.log(q[i]);
        hash = q[i].split('=');
        vars[hash[0]] = decodeURIComponent(hash[1]);
      }
    }
    if ('url' in vars) {
      start(vars.url);
    }

    window.onpaste = function (e) {
      reader.readAsDataURL(e.clipboardData.items[0].getAsFile());
    };

    window.requestAnimationFrame = window.requestAnimationFrame ||
      window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
      window.msRequestAnimationFrame || window.oRequestAnimationFrame;

    function draw() {
      map.draw();
      window.requestAnimationFrame(draw);
    }

    window.requestAnimationFrame(draw);
  });

}());
