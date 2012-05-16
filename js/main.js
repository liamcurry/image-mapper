!function () {

  var root = window
    , doc = root.document
    , boxes = []
    , selectionHandles
    , canvas = getElementById('mapper')
    , ctx = canvas.getContext('2d')
    , canvasWidth = canvas.width
    , canvasHeight = canvas.height
    , isDrag = false
    , isResizeDrag = false
    , expectResize = -1 // will save the # of the selection handle if the mouse is over one.
    , isCanvasValid = false
    , isImageDifferent = false
    , requestAnimationFrame = root['requestAnimationFrame'] ||
                              root['mozRequestAnimationFrame'] ||
                              root['webkitRequestAnimationFrame'] ||
                              root['msRequestAnimationFrame'] ||
                              root['oRequestAnimationFrame']
    , cursors = [
        'nw-resize', 'n-resize', 'ne-resize', 'w-resize'
      , 'e-resize', 'sw-resize', 's-resize', 'se-resize'
    ]
    , anchorSize = 6
    , anchorColor1 = '#cc0000'
    , anchorColor2 = 'darkred'
    , ghostCanvas = doc.createElement('canvas')
    , gctx = ghostCanvas.getContext('2d') // fake canvas context
    , reader = new FileReader()
    , currentImage = new Image()
    , elDroppable = doc.body
    , elURL = getElementById('url')
    , elTarget = getElementById('target')
    , elGenerated = getElementById('generated')
    , elControls = getElementById('controls')
    , elPreview = getElementById('preview')
    , elBtnGenerate = getElementById('generate')
    , elContent = getElementById('content')
    , offsetX, offsetY
    , stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop
    , selectedArea
    , mouseX, mouseY


  function Area(x, y, w, h, f) {
    this.x = x || 0
    this.y = y || 0
    this.w = w || 1 // default width and height?
    this.h = h || 1
    this.f = f || '#444444'
    this.href = '#'
    this.target = '_blank'
  }


  Area.prototype.draw = function (context, optionalColor) {
    var x = this.x
      , y = this.y
      , w = this.w
      , h = this.h

    context.fillStyle = context === gctx ? '#000' : 'rgba(220,205,65,0.7)'

    // We can skip the drawing of elements that have moved off the screen:
    if (x > canvasWidth || y > canvasHeight || x + w < 0 || y + h < 0) return

    context.fillRect(x, y, w, h)

    // draw selection
    // this is a stroke along the box and also 8 new selection handles
    if (selectedArea === this) {
      context.strokeStyle = anchorColor1
      context.lineWidth = 2
      context.strokeRect(x, y, w, h)
      context.fillStyle = anchorColor2

      var half = anchorSize / 2

      // top left, middle, right
      selectionHandles = [
          { x: x - half, y: y - half }
        , { x: x + w / 2 - half, y: y - half }
        , { x: x + w - half, y: y - half }
        , { x: x - half, y: y + h / 2 - half }
        , { x: x + w - half, y: y + h / 2 - half }
        , { x: x - half, y: y + h - half }
        , { x: x + w / 2 - half, y: y + h - half }
        , { x: x + w - half, y: y + h - half }
      ]

      for (var i=8; i--;) {
        var cur = selectionHandles[i]
        context.fillRect(cur.x, cur.y, anchorSize, anchorSize)
      }
    }

  }


  Area.prototype.attrs = function (attrs) {
      for (var name in attrs)
        this[name] = attrs[name]
  }


  Area.prototype.getCoords = function () {
    return [
        this.x
      , this.y
      , this.x + this.w
      , this.y + this.h
    ].join(',')
  }


  function getElementById(id) {
    return doc.getElementById(id)
  }


  function addRect(x, y, w, h) {
    boxes.push(new Area(x, y, w, h))
    invalidate()
  }


  function invalidate() {
    isCanvasValid = false
  }


  function save() {
    isCanvasValid = true
  }


  function load() {

  }


  function resize(width, height) {
    ghostCanvas.setAttribute('width', width)
    ghostCanvas.setAttribute('height', height)
    canvas.setAttribute('width', width)
    canvas.setAttribute('height', height)
    elContent.setAttribute('width', width)
    elContent.setAttribute('height', height)
    canvasWidth = width
    canvasHeight = height
    invalidate()
  }


  function clear(c) {
    c.clearRect(0, 0, canvasWidth, canvasHeight)
  }


  function draw() {
    requestAnimationFrame(draw)
    if (!isCanvasValid) {
      clear(ctx)

      if (isImageDifferent && currentImage.src) {
        resize(currentImage.width, currentImage.height)
        // Set the BG to the image instead of drawing it on the canvas. This
        // makes redrawing very speedy
        canvas.style.background = 'url(' + currentImage.src + ')'
        isImageDifferent = false
      }

      for (var i=boxes.length; i--;)
        boxes[i].draw(ctx)

      isCanvasValid = true
    }
  }


  function toggleControls(shouldEnable) {
    elControls.style.display = shouldEnable ? 'block' : 'none'
  }


  function getMouse(e) {
    var el = canvas
      , offsetX = stylePaddingLeft + styleBorderLeft
      , offsetY = stylePaddingTop + styleBorderTop

    do {
      offsetX += el.offsetLeft
      offsetY += el.offsetTop
    } while (el = el.offsetParent)

    mouseX = e.pageX - offsetX
    mouseY = e.pageY - offsetY
  }

  function getHTML() {
    var html = [
        '<img src="' + currentImage.src + '" usemap=map height=' + canvasHeight + ' width=' + canvasWidth + '>'
      , '<map name=map id=map>'
    ]
    for (var i=boxes.length; i--;) {
      var box = boxes[i]
      html.push('\t<area coords=' + box.getCoords() + ' href=' + box.href + ' target=' + box.target + '>')
    }
    html.push('</map>')
    return html.join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }


  // Start all the initialization stuff

  ghostCanvas.height = canvasHeight
  ghostCanvas.width = canvasWidth

  //fixes a problem where double clicking causes text to get selected on the canvas
  canvas.onselectstart = function () { return false }

  // fixes mouse co-ordinate problems when there's a border or padding
  // see getMouse for more detail
  if (doc.defaultView && doc.defaultView.getComputedStyle) {
    var style = doc.defaultView.getComputedStyle(canvas, null)
    stylePaddingLeft = +style.paddingLeft || 0
    stylePaddingTop = +style.paddingTop || 0
    styleBorderLeft = +style.borderLeftWidth || 0
    styleBorderTop = +style.borderTopWidth || 0
  }

  requestAnimationFrame(draw)

  // set our events. Up and down are for dragging,
  // double click is for making new boxes
  canvas.onmousedown = function (e) {
    getMouse(e)

    //we are over a selection box
    if (expectResize !== -1) {
      isResizeDrag = true
    } else {
      clear(gctx)
      for (var i=boxes.length; i--;) {
        // draw shape onto ghost context
        boxes[i].draw(gctx, 'black')

        // get image data at the mouse x,y pixel
        var imageData = gctx.getImageData(mouseX, mouseY, 1, 1)
          , index = (mouseX + mouseY * imageData.width) * 4

        // if the mouse pixel exists, select and break
        if (imageData.data[3] > 0) {
          selectedArea = boxes[i]
          elURL.value = selectedArea.href
          elTarget.value = selectedArea.target
          offsetX = mouseX - selectedArea.x
          offsetY = mouseY - selectedArea.y
          selectedArea.x = mouseX - offsetX
          selectedArea.y = mouseY - offsetY
          toggleControls(1)
          isDrag = true
          invalidate()
          clear(gctx)
          return
        }
      }
      // havent returned means we have selected nothing
      selectedArea = null
      elURL.value = ''
      elTarget.value = ''
      toggleControls(0)

      // clear the ghost canvas for next time
      clear(gctx)
      // invalidate because we might need the selection border to disappear
      invalidate()
    }
  }

  canvas.onmouseup = function () {
    isDrag = false
    isResizeDrag = false
    expectResize = -1
  }

  canvas.ondblclick = function (e) {
    getMouse(e)
    addRect(mouseX - 10, mouseY - 10, 20, 20)
  }

  canvas.onmousemove = function (e) {

    if (isDrag) {
      getMouse(e)
      selectedArea.attrs({
          x: mouseX - offsetX
        , y: mouseY - offsetY
      })
      invalidate()
    } else if (isResizeDrag) {
      var x = selectedArea.x
        , y = selectedArea.y
        , w = selectedArea.w
        , h = selectedArea.h
        , newAttrs = [
          {
              x: mouseX
            , y: mouseY
            , w: w + (x - mouseX)
            , h: h + (y - mouseY)
          }
          , {
              y: mouseY
            , h: h + (y - mouseY)
          }
          , {
              y: mouseY
            , w: mouseX - x
            , h: h + (y - mouseY)
          }
          , {
              x: mouseX
            , w: w + (x - mouseX)
          }
          , {
              w: mouseX - x
          }
          , {
              x: mouseX
            , w: w + (x - mouseX)
            , h: mouseY - y
          }
          , {
              h: mouseY - y
          }
          , {
              w: mouseX - x
            , h: mouseY - y
          }
        ]

      selectedArea.attrs(newAttrs[expectResize])
      invalidate()
    }

    getMouse(e)
    // if there's a selection see if we grabbed one of the selection handles
    if (selectedArea && !isResizeDrag) {
      for (var i=8; i--;) {
        var anchor = selectionHandles[i]

        // we dont need to use the ghost context because
        // selection handles will always be rectangles
        if (mouseX >= anchor.x && mouseX <= anchor.x + anchorSize &&
            mouseY >= anchor.y && mouseY <= anchor.y + anchorSize) {
          // we found one!
          expectResize = i
          invalidate()
          this.style.cursor = cursors[i]
          return
        }

      }
      // not over a selection box, return to normal
      isResizeDrag = false
      expectResize = -1
      this.style.cursor = 'auto'
    }
  }

  reader.onload = function (e) {
    currentImage.src = e.target.result
    boxes = []
    canvas.removeAttribute('hidden')
    isImageDifferent = true
    invalidate()
  }

  elDroppable.ondragover = function (e) {
    e.preventDefault()
    this.className = 'drag-over'
  }

  elDroppable.ondragend = function (e) {
    e.preventDefault()
  }

  elDroppable.ondrop = function (e) {
    e.preventDefault()
    this.className = 'has-image'
    reader.readAsDataURL(e.dataTransfer.files[0])
  }

  elURL.onkeyup = function () {
    if (selectedArea)
      selectedArea.href = this.value
  }

  elTarget.onchange = function () {
    if (selectedArea)
      selectedArea.target = this.value
  }

  elBtnGenerate.onclick = function (e) {
    e.preventDefault()
    elGenerated.innerHTML = getHTML()
  }

}()
