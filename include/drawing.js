function dom_create_canvas(id, width, height) {
  var c = document.createElement('canvas');
  c.id = id;
  c.width = width;
  c.height = height;
  c.style.border = '2px solid #eef';
  c.style.padding = '1px';
  var ctx = c.getContext('2d');
  ctx.translate(width/2, height/2);
  ctx.scale(1, -1);
  ctx.lineCap = 'butt';
  ctx.font = '10px Courier';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  return c;
}

function dom_set_scale(context, x, y) {
  context.scale(x, y);
}

function dom_set_rotation(context, angle) {
  context.rotate(angle);
}

function dom_reset_transform(context, x, y) {
  context.setTransform(1, 0, 0, 1, x, y);
}

function dom_set_translation(context, x, y) {
  context.translate(x, y);
}

function dom_canvas_context(canvas) {
  return canvas.getContext('2d');
}

function dom_save(context) {
  context.save();
}

function dom_restore(context) {
  context.restore();
}

function dom_line_to(context, x0, y0, x1, y1) {
  context.beginPath();
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.stroke();
}

function dom_set_color(context, color) {
  context.strokeStyle = color;
}

function dom_set_thickness(context, width) {
  context.lineWidth = width;
}

function dom_clear(canvas) {
  var ctx = canvas.getContext('2d');
  ctx.clearRect(-canvas.width, -canvas.height, 2 * canvas.width, 2 * canvas.height);
}

function dom_canvas_width(canvas) {
  return canvas.width;
}

function dom_canvas_height(canvas) {
  return canvas.height;
}

function dom_set_font(context, font) {
  context.font = font;
}

function dom_set_text_baseline(context, baseline) {
  context.textBaseline = baseline;
}

function dom_set_text_align(context, align) {
  context.textAlign = align;
}

function dom_fill_text(context, text, x, y) {
  context.fillText(text, x, y);
}

function dom_measure_text(context, text) {
  var box = context.measureText(text);
  return [box.width, box.height];
}

function dom_remove_children(parent) {
  while (parent.hasChildNodes()) {   
    parent.removeChild(parent.firstChild);
  }
}

function DrawingWindow(id, width, height) {

  this.turtle_canvas = dom_create_canvas(id+'-turtle', width, height);
  this.turtle_context = dom_canvas_context(this.turtle_canvas);
  this.turtle_canvas.style.position = 'absolute';
  this.drawing_canvas = dom_create_canvas(id+'-drawing', width, height);
  this.drawing_canvas.style.position = 'absolute';
  this.drawing_canvas.style.boxShadow = '0 0 10px #999';
  this.drawing_context = dom_canvas_context(this.drawing_canvas);
  this.grid_canvas = dom_create_canvas(id+'-grid', width, height);
  this.grid_context = dom_canvas_context(this.grid_canvas);

  dom_set_color(this.grid_context, '#eef');

  var w2 = width/2;
  var h2 = height/2;
  var grid_step = 10;

  for (var x=0; x<=w2; x+=grid_step) {
    dom_set_thickness(this.grid_context, (x%(5*grid_step)===0)?2:1);
    dom_line_to(this.grid_context, x, -h2, x, h2);
    dom_line_to(this.grid_context, -x, -h2, -x, h2);
  }

  for (var y=0; y<=h2; y+=grid_step) {
    dom_set_thickness(this.grid_context, (y%(5*grid_step)===0)?2:1);
    dom_line_to(this.grid_context, -w2, y, w2, y);
    dom_line_to(this.grid_context, -w2, -y, w2, -y);
  }
}

DrawingWindow.prototype.export = function (thunk) {

    var w = this.drawing_canvas.width;
    var h = this.drawing_canvas.height;
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var ctx = c.getContext('2d');

    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fillRect(0,0,w,h);

    ctx.drawImage(this.grid_canvas, 0, 0);
    ctx.drawImage(this.drawing_canvas, 0, 0);
    ctx.drawImage(this.turtle_canvas, 0, 0);

    var URL = c.toDataURL();
    $('#urlModal-body').text(URL);
    $('#urlModal-clippy').empty().clippy({clippy_path: 'clippy.swf', text: URL});
    $('#urlModal').modal('show');
};

DrawingWindow.prototype.excursion = function (thunk) {
  var result;
  var pos = this.pos;
  var orient = this.orientation;
  dom_save(this.drawing_context);
  this.turtle_height++;
  result = thunk();
  dom_restore(this.drawing_context);
  --this.turtle_height;
  this.orientation = orient;
  this.pos = pos;
  return result;
};

DrawingWindow.prototype.cs = function () {
  dom_clear(this.drawing_canvas);
  this.turtle_height = 0;
  this.pen_height = 0;
  this.orientation = 90;
  this.pos = { x:0, y:0 };
  this.draw_turtle();
  this.set_color('#000');
  this.set_thickness(1);
};

DrawingWindow.prototype.fd = function (len) {
  var rad = Math.PI * this.orientation / 180;
  var x0 = this.pos.x;
  var y0 = this.pos.y;
  var x1 = x0 + len * Math.cos(rad);
  var y1 = y0 + len * Math.sin(rad);
  if (this.pen_height === 0) {
    dom_line_to(this.drawing_context, x0, y0, x1, y1);
  }
  this.pos = { x:x1, y:y1 };
  if (this.turtle_height === 0) {
    this.draw_turtle();
  }
};

DrawingWindow.prototype.bk = function (len) {
  this.fd(-len);
};

DrawingWindow.prototype.set_color = function (color) {
  dom_set_color(this.drawing_context, color);
};

DrawingWindow.prototype.set_thickness = function (width) {
  var ctx = this.drawing_context;
  dom_set_font(ctx, (9+width) + 'px Courier');
  dom_set_thickness(ctx, width);
};

DrawingWindow.prototype.pu = function () {
  this.pen_height++;
};

DrawingWindow.prototype.pd = function () {
  if (--this.pen_height <= 0) {
    this.pen_height = 0;
  }
};

DrawingWindow.prototype.triangle = function (h, base) {
  var x = base/2;
  var y = Math.sqrt(x*x + h*h);
  var alpha = 180 * Math.asin(h/y) / Math.PI;
  var beta = 2 * (90 - alpha);
  this.lt(90);
  this.pu(); this.fd(x); this.pd();
  this.rt(180 - alpha);
  this.fd(y);
  this.rt(180 - beta);
  this.fd(y);
  this.rt(180 - alpha);
  this.fd(2*x);
};

DrawingWindow.prototype.draw_turtle = function () {
  var self = this;
  self.excursion(function () {
    var save_canvas = self.drawing_canvas;
    var save_context = self.drawing_context;
    var save_pen = self.pen_height;
    self.pen_height = 0;
    self.drawing_canvas = self.turtle_canvas;
    self.drawing_context = self.turtle_context;
    dom_clear(self.drawing_canvas);
    self.set_color('#f00');
    self.set_thickness(2);
    self.triangle(15, 10);
    self.drawing_canvas = save_canvas;
    self.drawing_context = save_context;
    self.pen_height = save_pen;
  });
};

DrawingWindow.prototype.ht = function () {
  if (this.turtle_height++ === 0) {
    dom_clear(this.turtle_canvas);
  }
};

DrawingWindow.prototype.st = function () {
  if (--this.turtle_height <= 0) {
    this.turtle_height = 0;
    this.draw_turtle();
  }
};

DrawingWindow.prototype.lt = function (angle) {
  this.orientation += angle;
  if (this.turtle_height === 0) {
    this.draw_turtle();
  }
};

DrawingWindow.prototype.rt = function (angle) {
  this.orientation -= angle;
  if (this.turtle_height === 0) {
    this.draw_turtle();
  }
};

DrawingWindow.prototype.setpc = function (r, g, b) {
  this.set_color('rgb('+Math.floor(r*255)+','+Math.floor(g*255)+','+Math.floor(b*255)+')');
};

DrawingWindow.prototype.setpw = function (width) {
  this.set_thickness(width);
};

DrawingWindow.prototype.drawtext = function (text) {
  var ctx = this.drawing_context;
  ctx.save();
  ctx.translate(this.pos.x, this.pos.y);
  ctx.rotate((Math.PI/180)*this.orientation);
  ctx.scale(1, -1);
  dom_fill_text(ctx, text+'', 0, 0);
  ctx.restore();
};

var drawing_window;

function init_drawing_window(width, height) {
  drawing_window = new DrawingWindow('cb-drawing-window', width, height);
  drawing_window.cs();
}

init_drawing_window(360, 220);
//init_drawing_window(250, 250);

function showing_drawing_window() {
  return $('#cb-drawing-window').is(':visible');
}

function export_drawing_window() {
  drawing_window.export();
}

function show_drawing_window() {
  $('#cb-drawing-window').css('display', 'inline');
  var parent = document.getElementById('cb-drawing-window');
  dom_remove_children(parent);
  parent.appendChild(drawing_window.drawing_canvas);
  parent.appendChild(drawing_window.turtle_canvas);
  parent.appendChild(drawing_window.grid_canvas);
  cb.transcript.addLine('showing drawing window', 'error-message');
  document.getElementById('show-drawing-window-icon').className = 'icon-ok';
}

function hide_drawing_window() {
  var parent = document.getElementById('cb-drawing-window');
  dom_remove_children(parent);
  $('#cb-drawing-window').css('display', 'none');
  cb.transcript.addLine('hiding drawing window', 'error-message');
  document.getElementById('show-drawing-window-icon').className = 'icon-none';
}

function ensure_showing_drawing_window() {
  if (!showing_drawing_window()) {
    show_drawing_window();
  }
}

function builtin_cs() {
  ensure_showing_drawing_window();
  drawing_window.cs();
}

function builtin_st() {
  ensure_showing_drawing_window();
  drawing_window.st();
}

function builtin_ht() {
  ensure_showing_drawing_window();
  drawing_window.ht();
}

function builtin_pu() {
  ensure_showing_drawing_window();
  drawing_window.pu();
}

function builtin_pd() {
  ensure_showing_drawing_window();
  drawing_window.pd();
}

function builtin_fd(distance) {
  ensure_showing_drawing_window();
  drawing_window.fd(distance);
}

function builtin_bk(distance) {
  ensure_showing_drawing_window();
  drawing_window.bk(distance);
}

function builtin_lt(angle) {
  ensure_showing_drawing_window();
  drawing_window.lt(angle);
}

function builtin_rt(angle) {
  ensure_showing_drawing_window();
  drawing_window.rt(angle);
}

function builtin_setpc(r, g, b) {
  ensure_showing_drawing_window();
  drawing_window.setpc(r, g, b);
}

function builtin_setpw(width) {
  ensure_showing_drawing_window();
  drawing_window.setpw(width);
}

function builtin_drawtext(text) {
  ensure_showing_drawing_window();
  drawing_window.drawtext(text);
}
