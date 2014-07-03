
(function(/*! Stitch !*/) {
  if (!this.require) {
    var modules = {}, cache = {}, require = function(name, root) {
      var path = expand(root, name), module = cache[path], fn;
      if (module) {
        return module.exports;
      } else if (fn = modules[path] || modules[path = expand(path, './index')]) {
        module = {id: path, exports: {}};
        try {
          cache[path] = module;
          fn(module.exports, function(name) {
            return require(name, dirname(path));
          }, module);
          return module.exports;
        } catch (err) {
          delete cache[path];
          throw err;
        }
      } else {
        throw 'module \'' + name + '\' not found';
      }
    }, expand = function(root, name) {
      var results = [], parts, part;
      if (/^\.\.?(\/|$)/.test(name)) {
        parts = [root, name].join('/').split('/');
      } else {
        parts = name.split('/');
      }
      for (var i = 0, length = parts.length; i < length; i++) {
        part = parts[i];
        if (part == '..') {
          results.pop();
        } else if (part != '.' && part != '') {
          results.push(part);
        }
      }
      return results.join('/');
    }, dirname = function(path) {
      return path.split('/').slice(0, -1).join('/');
    };
    this.require = function(name) {
      return require(name, '');
    }
    this.require.define = function(bundle) {
      for (var key in bundle)
        modules[key] = bundle[key];
    };
  }
  return this.require.define;
}).call(this)({"poly": function(exports, require, module) {(function() {
  var ChartMainView, ChartViewerMainView, DashMainView, DashViewerMainView, LocalDataSource, RemoteDataSource, _ref;

  require('poly/main/init');

  ChartMainView = require('poly/main/main/chartbuilder');

  ChartViewerMainView = require('poly/main/main/chartviewer');

  DashMainView = require('poly/main/main/dashbuilder');

  DashViewerMainView = require('poly/main/main/dashviewer');

  _ref = require('poly/main/data/dataSource'), LocalDataSource = _ref.LocalDataSource, RemoteDataSource = _ref.RemoteDataSource;

  module.exports = {
    dashboard: function(params) {
      var view;
      $(params.dom).addClass('polychart-ui');
      view = new DashMainView(params);
      ko.renderTemplate("tmpl-main", view, {}, params.dom);
      return {
        serialize: view.serialize
      };
    },
    dashviewer: function(params) {
      var view;
      $(params.dom).addClass('polychart-ui');
      view = new DashViewerMainView(params);
      ko.renderTemplate("tmpl-dashboard-viewer", view, {}, params.dom);
      return {};
    },
    chartbuilder: function(params) {
      var view;
      $(params.dom).addClass('polychart-ui');
      view = new ChartMainView(params);
      ko.renderTemplate("tmpl-main-chart", view, {}, params.dom);
      return {
        serialize: view.serialize
      };
    },
    chartviewer: function(params) {
      var view;
      $(params.dom).addClass('polychart-ui');
      view = new ChartViewerMainView(params);
      ko.renderTemplate("tmpl-chart-viewer", view, {
        afterRender: view.init
      }, params.dom);
      return {};
    },
    data: function(args) {
      switch (args.type) {
        case 'local':
          return new LocalDataSource(args.tables);
        case 'remote':
          return new RemoteDataSource(args.dataSourceKey, args.customBackend, args.dataSourceType);
      }
    }
  };

}).call(this);
}, "poly/common/events": function(exports, require, module) {(function() {
  var EventLeaf, EventsFactory, EventsFactoryConstructor, err, serverApi, _debug, _generateId,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __slice = [].slice;

  try {
    serverApi = require('poly/common/serverApi');
  } catch (_error) {
    err = _error;
    console.warn("Missing `serverApi` module, continuing without it.");
    serverApi = null;
  }

  EventsFactoryConstructor = (function() {
    function EventsFactoryConstructor() {
      this._chain = __bind(this._chain, this);
      this._trigger = __bind(this._trigger, this);
      this._one = __bind(this._one, this);
      this._on = __bind(this._on, this);
      this.addEventTrackingTo = __bind(this.addEventTrackingTo, this);
      this.getTreeFor = __bind(this.getTreeFor, this);
      this.getTree = __bind(this.getTree, this);
      this.evtHistory = {};
      this._tree = null;
      this._dummy = $({});
      this._defaultListeners = {};
    }

    EventsFactoryConstructor.prototype.getTree = function(tree, defaultPropHandler) {
      return this.getTreeFor(tree, defaultPropHandler, null);
    };

    EventsFactoryConstructor.prototype.getTreeFor = function(tree, defaultPropHandler, page) {
      this.tree = tree;
      this.defaultPropHandler = defaultPropHandler;
      if (!_.isFunction(this.defaultPropHandler)) {
        this.defaultPropHandler = function() {};
      }
      if ((page != null) && (this._tree != null) && page in this._tree) {
        return this._tree[page];
      } else if ((page != null) && page in this.tree) {
        return this._instantiateTree(this.tree[page], null);
      } else {
        this._tree = this._instantiateTree(this.tree, null);
        return this._tree;
      }
    };

    EventsFactoryConstructor.prototype.addEventTrackingTo = function(elem, evt, type, info) {
      if ((info != null) && !_.isObject(info)) {
        info = {
          info: "" + info
        };
      }
      _debug("analytics.track" + type, elem, evt.name, info);
      if (window.analytics != null) {
        return analytics["track" + type](elem, evt.name, info);
      }
    };

    EventsFactoryConstructor.prototype._instantiateTree = function(tree, name) {
      var key, newName, result, twoDown, val;
      result = {};
      for (key in tree) {
        val = tree[key];
        newName = name != null ? "" + name + "_" + key : key;
        twoDown = _.values(_.values(tree)[0]);
        if (_.isEmpty(twoDown) || !_.isObject(twoDown[0]) || _.isArray(twoDown[0])) {
          result[key] = new EventLeaf(newName, val);
          this.defaultPropHandler(newName, val);
        } else {
          result[key] = this._instantiateTree(val, newName);
        }
      }
      return result;
    };

    EventsFactoryConstructor.prototype._registerDefaultListeners = function() {
      _.each(this._defaultListeners, function(listener, evt) {
        return this._dummy.on(evt, listener);
      });
    };

    EventsFactoryConstructor.prototype._getHistory = function(id) {
      if (id != null) {
        return this.evtHistory[id];
      } else {
        return this.evtHistory;
      }
    };

    EventsFactoryConstructor.prototype._setHistory = function(key, val) {
      if ((key != null) && (val != null)) {
        this.evtHistory[key] = val;
      }
    };

    EventsFactoryConstructor.prototype._on = function(evt, sel, dat, fn) {
      _debug("on", evt, sel, dat, fn);
      return this._dummy.on(evt, sel, dat, fn);
    };

    EventsFactoryConstructor.prototype._one = function(evt, sel, dat, fn) {
      _debug("one", evt, sel, dat, fn);
      return this._dummy.one(evt, sel, dat, fn);
    };

    EventsFactoryConstructor.prototype._trigger = function(evt, pars) {
      var id;
      _debug("trigger", evt, pars);
      id = _generateId();
      this._setHistory(evt, id);
      return this._dummy.trigger(evt, _.extend({}, pars, {
        cid: id
      }));
    };

    EventsFactoryConstructor.prototype._chain = function(evt, prev, pars) {
      var id;
      _debug("chain", evt, prev, pars);
      id = prev != null ? prev : generateId();
      if (!_.isNumber(id)) {
        if ((id != null ? id.name : void 0) != null) {
          id = id.name;
        }
        id = this._getHistory(id);
      }
      return this._dummy.trigger(evt, _.extend({}, pars, {
        cid: id
      }));
    };

    EventsFactoryConstructor.prototype._trackClick = function(str, obj, pars) {
      var _this = this;
      return $(obj).click(function(evt) {
        return _this._track(str, pars);
      });
    };

    EventsFactoryConstructor.prototype._trackForm = function(str, obj, pars) {
      var _this = this;
      return $(obj).submit(function(evt) {
        evt.preventDefault();
        _this._track(str, pars);
        return setTimeout(function() {
          return $(obj).submit();
        }, 500);
      });
    };

    EventsFactoryConstructor.prototype._trackLink = function(str, obj, pars) {
      var href,
        _this = this;
      href = $(obj).attr('href');
      return $(obj).click(function(evt) {
        evt.preventDefault();
        _this._track(str, pars);
        return setTimeout(function() {
          return window.location.href = href;
        }, 500);
      });
    };

    EventsFactoryConstructor.prototype._identify = function(e, t, n, r) {
      _debug("analytics.identify", e, t, n, r);
      if (window.analytics != null) {
        return window.analytics.identify(e, t, n, r);
      }
    };

    EventsFactoryConstructor.prototype._track = function(e, t, n, r) {
      _debug("analytics.track", e, t, n, r);
      if (window.analytics != null) {
        window.analytics.track(e, t, n, r);
        if (serverApi != null) {
          return serverApi.sendPost("/event/" + e, t);
        }
      }
    };

    return EventsFactoryConstructor;

  })();

  EventsFactory = new EventsFactoryConstructor();

  EventLeaf = (function() {
    function EventLeaf(name, defaults) {
      this.name = name;
      this.defaults = defaults;
      this.triggerElem = __bind(this.triggerElem, this);
      this.oneElem = __bind(this.oneElem, this);
      this.onElem = __bind(this.onElem, this);
      this.trackLink = __bind(this.trackLink, this);
      this.trackForm = __bind(this.trackForm, this);
      this.trackClick = __bind(this.trackClick, this);
      this.chain = __bind(this.chain, this);
      this.trigger = __bind(this.trigger, this);
      this.one = __bind(this.one, this);
      this.on = __bind(this.on, this);
    }

    EventLeaf.prototype.on = function(sel, dat, fn) {
      return EventsFactory._on(this.name, sel, dat, fn);
    };

    EventLeaf.prototype.one = function(sel, dat, fn) {
      return EventsFactory._one(this.name, sel, dat, fn);
    };

    EventLeaf.prototype.trigger = function(pars) {
      return EventsFactory._trigger(this.name, pars);
    };

    EventLeaf.prototype.chain = function(prev, pars) {
      return EventsFactory._chain(this.name, prev, pars);
    };

    EventLeaf.prototype.trackClick = function(obj, pars) {
      return EventsFactory._trackClick(this.name, obj, pars);
    };

    EventLeaf.prototype.trackForm = function(obj, pars) {
      return EventsFactory._trackForm(this.name, obj, pars);
    };

    EventLeaf.prototype.trackLink = function(obj, pars) {
      return EventsFactory._trackLink(this.name, obj, pars);
    };

    EventLeaf.prototype.onElem = function(obj, sel, dat, fn) {
      return $(obj).on(this.name, sel, dat, fn);
    };

    EventLeaf.prototype.oneElem = function(obj, sel, dat, fn) {
      return $(obj).one(this.name, sel, dat, fn);
    };

    EventLeaf.prototype.triggerElem = function(obj, pars) {
      return $(obj).trigger(this.name, pars);
    };

    return EventLeaf;

  })();

  _generateId = function() {
    return "" + (Math.random());
  };

  _debug = function() {
    var argList, args, funString;
    funString = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (window.polydebug || Cookies.read('polydebug')) {
      try {
        argList = (_.map(args, JSON.stringify)).join(', ');
        console.debug("" + funString + "(" + argList + ")");
      } catch (_error) {
        err = _error;
        console.debug("" + funString + "(" + (args.join(', ')) + ")");
        console.debug("While attempting to stringfy previous: " + err);
        window.errObj = args;
      }
    }
  };

  module.exports = EventsFactory;

}).call(this);
}, "poly/common/serverApi": function(exports, require, module) {(function() {
  var makeRequest, sendFile, sendGet, sendPost, sendQueryPost;

  makeRequest = function(path, data, callback, config) {
    callback || (callback = function() {});
    return $.ajax("/api" + path, _.extend({
      data: data,
      dataType: 'json',
      headers: {
        'X-CSRFToken': Cookies.read('csrftoken')
      },
      success: function(data, textStatus, req) {
        return callback(null, data);
      },
      error: function(req, textStatus, errorThrown) {
        var contentType, err, responseBody;
        err = {
          httpStatus: req.status,
          message: textStatus
        };
        contentType = req.getResponseHeader('Content-Type');
        contentType = contentType && $.trim(contentType.split(';')[0]);
        if (contentType === 'application/json') {
          responseBody = JSON.parse(req.responseText);
          err.message = responseBody.message;
        }
        return callback(err);
      }
    }, config));
  };

  sendGet = function(path, params, callback) {
    var request;
    request = makeRequest(path, params, callback);
    return {
      abort: function() {
        return request.abort();
      }
    };
  };

  sendQueryPost = function(path, params, callback) {
    var request;
    if (params == null) {
      params = {};
    }
    request = makeRequest(path, params, callback, {
      type: 'POST'
    });
    return {
      abort: function() {
        return request.abort();
      }
    };
  };

  sendPost = function(path, body, callback) {
    var request;
    body || (body = {});
    request = makeRequest(path, JSON.stringify(body), callback, {
      type: 'POST',
      processData: false
    });
    return {
      abort: function() {
        return request.abort();
      }
    };
  };

  sendFile = function(path, file, callback, onProgress) {
    var request;
    onProgress || (onProgress = function() {});
    request = makeRequest(path, file, callback, {
      type: 'POST',
      contentType: file.type,
      processData: false,
      xhr: function() {
        var xhr, _ref;
        xhr = new XMLHttpRequest();
        if (xhr != null) {
          if ((_ref = xhr.upload) != null) {
            _ref.addEventListener('progress', function(evt) {
              return onProgress(evt.loaded, evt.lengthComputable ? evt.total : -1);
            }, false);
          }
        }
        return xhr;
      }
    });
    return {
      abort: function() {
        return request.abort();
      }
    };
  };

  module.exports = {
    sendGet: sendGet,
    sendQueryPost: sendQueryPost,
    sendPost: sendPost,
    sendFile: sendFile
  };

}).call(this);
}, "poly/demoData/content": function(exports, require, module) {module.exports.content={"id":["13","14","15","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","37","38","39","40","41","43","45","46","47","48","49","50","51","52","53","54","55","56","57","58","59","60","61","64","65","66","67","69","70","73","76","77","78","79","81","82","83","85","86","88","89","90","92","93","94","95","96","97","98","99","100","101","102","103","104","106","107","108","109","110","111","112","113","114","115","116","117","118","119","120","121","122","123","124","125","130","131","132","133","134","135","136","137","138","139","140","141","142","143","144","145","146","147","149","150","151","152","219","220","221","223","224","228","231","232","233","234","235","236","247","248","249","250","251","254","255","256","257","258","281","282","283","284","285","286","287","288","289","290","291","292","296","297","298","299","300","302","308","311","312","316","317","322","325","326","327","328","331","332","333","334","335","336","337","338","339","340","341","342","343","349","353","356","357","358","359","360","361","362","364","365","366","370","371","379","380","384","385","388","389","390","391","402","403","411","412","415","416","417","418","419","420","425","426"],"user_id":["7","7","8","12","12","16","27","39","44","44","45","8","8","8","51","51","36","36","36","58","67","64","68","68","71","72","63","86","86","88","88","94","94","102","99","113","113","113","103","107","117","109","117","123","127","128","128","27","86","27","135","152","152","161","162","168","168","168","172","171","171","171","182","192","197","199","199","199","199","199","199","195","171","171","171","168","168","168","195","208","210","214","171","171","171","171","216","216","223","223","224","225","226","231","231","231","171","171","171","171","171","171","238","171","171","171","237","239","171","171","171","239","239","242","248","185","251","251","257","258","8","270","193","272","171","171","171","171","171","287","291","291","291","291","226","299","299","308","5","199","315","315","320","320","322","322","322","306","306","306","333","335","343","343","344","348","346","231","360","366","366","367","367","226","375","375","375","375","375","375","375","375","375","375","375","375","375","375","375","375","375","381","393","405","405","405","406","408","409","409","412","414","414","405","405","422","433","439","434","434","434","449","449","443","443","454","459","443","470","475","491","501","504","510","511"],"created":["2012-11-19 04:30:57","2012-11-19 04:37:15","2012-11-19 11:41:32","2012-11-19 18:37:53","2012-11-19 18:38:24","2012-11-19 19:23:45","2012-11-19 19:32:20","2012-11-20 01:42:32","2012-11-20 05:41:07","2012-11-20 06:01:38","2012-11-20 06:32:09","2012-11-20 09:58:46","2012-11-20 09:59:30","2012-11-20 10:12:50","2012-11-20 18:50:00","2012-11-20 18:50:16","2012-11-20 19:12:45","2012-11-20 19:13:24","2012-11-20 19:14:23","2012-11-20 19:33:37","2012-11-20 20:09:14","2012-11-20 20:11:11","2012-11-20 20:19:33","2012-11-20 20:20:34","2012-11-20 21:39:48","2012-11-20 21:52:36","2012-11-20 22:58:46","2012-11-21 02:46:52","2012-11-21 04:25:57","2012-11-21 04:28:25","2012-11-21 04:29:02","2012-11-21 09:06:20","2012-11-21 09:06:53","2012-11-21 15:34:04","2012-11-21 15:37:37","2012-11-21 16:51:04","2012-11-21 16:53:30","2012-11-21 16:53:38","2012-11-21 17:08:14","2012-11-21 20:05:03","2012-11-21 20:12:13","2012-11-21 20:12:45","2012-11-21 20:12:59","2012-11-22 14:01:09","2012-11-23 16:34:09","2012-11-24 06:55:37","2012-11-24 07:05:32","2012-11-26 19:01:43","2012-11-27 02:15:18","2012-11-27 02:53:05","2012-11-28 13:51:57","2012-11-29 05:59:04","2012-11-29 05:59:55","2012-11-30 22:09:17","2012-12-02 01:10:18","2012-12-04 22:56:15","2012-12-04 22:57:08","2012-12-04 22:58:09","2012-12-05 21:09:02","2012-12-06 04:09:37","2012-12-09 16:41:16","2012-12-10 22:58:06","2012-12-12 05:51:18","2012-12-14 21:05:20","2012-12-18 00:32:23","2012-12-18 04:41:07","2012-12-18 15:35:50","2012-12-18 15:41:24","2012-12-18 17:45:24","2012-12-18 19:00:55","2012-12-18 20:19:32","2012-12-19 11:12:10","2012-12-20 02:23:31","2012-12-20 02:25:25","2012-12-20 02:29:03","2012-12-20 21:27:23","2012-12-20 21:29:19","2012-12-20 21:34:07","2012-12-22 12:58:19","2012-12-24 03:24:33","2012-12-24 12:42:46","2012-12-30 10:56:10","2012-12-31 00:55:14","2012-12-31 00:55:50","2012-12-31 00:58:34","2012-12-31 14:18:51","2013-01-01 00:59:13","2013-01-02 20:12:35","2013-01-06 05:27:36","2013-01-06 05:30:16","2013-01-07 05:32:04","2013-01-07 10:28:19","2013-01-07 16:50:13","2013-01-08 18:51:19","2013-01-08 19:10:15","2013-01-08 19:10:25","2013-01-09 14:33:48","2013-01-09 14:34:10","2013-01-09 14:35:01","2013-01-09 14:35:32","2013-01-09 14:41:51","2013-01-09 14:41:59","2013-01-09 14:59:26","2013-01-09 15:01:25","2013-01-09 15:05:28","2013-01-09 15:06:19","2013-01-09 16:12:17","2013-01-09 21:45:17","2013-01-09 22:27:30","2013-01-09 22:27:54","2013-01-09 22:28:07","2013-01-09 22:59:17","2013-01-09 23:48:53","2013-01-10 21:36:25","2013-01-15 10:38:41","2013-01-16 14:39:55","2013-01-16 15:34:05","2013-01-16 15:34:35","2013-01-21 05:42:35","2013-01-21 08:40:55","2013-01-21 16:32:11","2013-01-22 20:15:34","2013-01-22 21:56:15","2013-01-23 02:57:54","2013-01-25 19:34:21","2013-01-25 19:35:57","2013-01-25 19:37:05","2013-01-25 19:37:21","2013-01-25 19:38:59","2013-01-26 17:22:07","2013-01-28 23:43:44","2013-01-28 23:45:10","2013-01-28 23:45:46","2013-01-28 23:47:15","2013-01-29 17:21:28","2013-02-01 14:09:59","2013-02-01 15:12:01","2013-02-05 16:48:56","2013-02-05 19:05:43","2013-02-05 23:55:52","2013-02-08 05:03:34","2013-02-08 05:11:47","2013-02-09 02:55:44","2013-02-09 02:55:56","2013-02-09 13:47:39","2013-02-09 13:47:45","2013-02-09 15:31:31","2013-02-11 10:13:36","2013-02-11 10:13:44","2013-02-11 10:24:16","2013-02-12 12:44:21","2013-02-14 10:17:42","2013-02-16 04:33:44","2013-02-17 14:14:18","2013-02-18 08:25:23","2013-02-22 02:23:38","2013-02-22 15:55:34","2013-02-26 19:46:32","2013-02-28 18:54:38","2013-03-04 08:17:01","2013-03-04 08:18:34","2013-03-05 18:20:46","2013-03-05 18:31:37","2013-03-05 19:13:02","2013-03-06 06:02:13","2013-03-06 09:23:26","2013-03-06 12:01:49","2013-03-06 12:10:54","2013-03-07 05:43:35","2013-03-07 05:43:40","2013-03-07 05:44:19","2013-03-07 05:44:23","2013-03-07 05:53:23","2013-03-07 05:53:26","2013-03-07 06:15:31","2013-03-07 06:18:31","2013-03-07 06:20:14","2013-03-07 06:21:23","2013-03-07 08:56:46","2013-03-07 08:57:22","2013-03-07 08:58:55","2013-03-08 01:00:20","2013-03-13 19:29:27","2013-03-18 09:12:16","2013-03-18 09:15:04","2013-03-18 09:28:16","2013-03-18 11:52:04","2013-03-18 19:31:35","2013-03-20 04:41:06","2013-03-20 04:41:45","2013-03-20 19:04:52","2013-03-20 21:26:27","2013-03-20 21:30:46","2013-03-22 13:06:08","2013-03-22 13:06:21","2013-03-26 13:52:29","2013-03-28 13:29:57","2013-03-29 19:31:58","2013-03-30 11:45:36","2013-04-01 17:58:11","2013-04-01 18:03:21","2013-04-01 23:30:11","2013-04-01 23:30:53","2013-04-02 20:21:57","2013-04-02 20:22:25","2013-04-04 13:14:21","2013-04-05 04:13:26","2013-04-09 17:44:18","2013-04-09 20:14:05","2013-04-10 00:15:10","2013-04-11 13:35:12","2013-04-14 13:07:47","2013-04-16 18:02:06","2013-04-19 11:26:03","2013-04-19 15:07:23"],"dataset_id":["5","6","4","5","5","8","7","3","33","37","4","41","41","42","3","3","46","46","46","6","7","6","5","5","54","3","5","4","4","5","5","5","5","7","3","3","4","4","5","66","6","7","6","7","7","7","4","3","5","4","93","5","5","5","6","8","8","8","106","5","5","4","113","118","3","4","124","125","8","8","8","8","129","129","129","123","123","123","3","6","3","3","129","129","129","129","4","8","7","7","5","143","149","7","7","7","129","129","129","129","129","129","6","129","129","129","156","8","129","129","129","8","8","6","4","3","6","6","5","5","161","6","5","6","129","129","129","129","129","6","186","186","186","186","3","7","5","5","3","4","5","5","7","7","6","6","5","3","3","6","5","6","4","4","3","6","276","5","281","4","3","289","289","3","295","298","300","300","300","300","300","300","300","300","300","300","300","300","300","300","300","6","8","313","313","313","4","5","4","4","3","4","4","313","313","6","331","6","8","8","8","342","342","8","8","3","3","8","8","6","3","373","6","7","376"],"title":["Browsers","Sales Dataset","Operating Systems","Browsers by Market Share (March 2012)","Browsers by Market Share (March 2012)","AdWords Campaign","Iris Flowers","Facebook Page","Crime Data From DC","Dummy Account","Operating Systems","Sistemas operativos y navegadores","Sistemas operativos y navegadores","Estadísticas Equomunidad","Facebook Page","Facebook Page","Oranges","Oranges","Oranges","Sales Dataset","Iris Flowers","Sales Dataset","Browsers","Browsers","things","Facebook Page","Browsers","Operating Systems","Operating Systems","Browsers","Browsers","Browsers","Browsers","Iris Flowers","Facebook Page","sedsdf","Operating Systems","Operating Systems","Browsers","profit and sales","Sales Dataset","Iris Flowers","Sales Dataset","o4iuioiuerfo","Iris Flowers","Iris Flowers","Operating Systems","Facebook Page","Browsers","Operating Systems","sales","Browsers","Browsers","Browsers","Sales Dataset","AdWords Campaign","AdWords Campaign","AdWords Campaign","SSH Blocks","Browsers","Browsers","Operating Systems","cats","Subbotnik","Facebook Page","Operating Systems","Patent","Hoovers","AdWords Campaign","Title","AdWords Campaign","AdWords Campaign","Canada CPI","My Chart 1","Scatter Plot","School Shottings","School Shottings","School Shottings","Facebook Page","Sales Dataset","Facebook Page","Facebook Page","Canada CPI","My Graph #1","My Graph #1","My Graph #1","Operating Systems","AdWords Campaign","Iris Flowers","Iris Flowers","Browsers","123","test","Iris Flowers","Iris Flowers","Iris Flowers","Graph 1","Graph 1","Graph 2","Canada CPI","Canada CPI","Canada CPI","iadiadgidada","Canada CPI","Canada CPI","Canada CPI","Electric Reliability Update","AdWords Campaign","Canada CPI","Canada CPI","Canada CPI","AdWords Campaign","AdWords Campaign","Sales Dataset","Operating Systems","Facebook Page","Expense by Date","Expense by Date","fdsafd","Browsers","Socios Ayuda en Acción","Sales Dataset","Browsers","Sales Dataset","Canada CPI","Canada CPI","Canada CPI","Canada CPI","Canada CPI","Sales Dataset","Relationship Between Product Count and Transaction Count (grouped by Average Member Value)","Relationship Between Product Count and Transaction Count (grouped by Average Member Value)","Product Count vs Transaction Count (grouped by Average Member Value)","Product Count vs Transaction Count (grouped by Average Member Value)","Facebook Page","Iris Flowers","Browsers","Browsers","Facebook Page","Operating Systems","Browsers","Browsers","Iris Flowers","Iris Flowers","Sales Dataset","Sales Dataset","Browsers","Facebook Page","Facebook Page","Sales Dataset","Browsers","Sales Dataset","Operating Systems","Operating Systems","Facebook Page","Sales Dataset","blueberry","Browsers","ESV200remesas","Operating Systems","Facebook Page","T","T","Facebook Page","rf_exp","rf_transpose","rf_graph_data","rf_graph_data","rf_graph_data","rf_graph_data","rf_graph_data","rf_graph_data","rf_graph_data","rf_graph_data","rf_graph_data","rf_graph_data","rf_graph_data","rf_graph_data","rf_graph_data","rf_graph_data","rf_graph_data","Expenses/Sales by City","Clicks Received Per Day","K-test","Sammenhengen mellom Internettjenester og Total Poengsum i Den Store Kommunetesten","Sammenhengen mellom Internettjenester og Total Poengsum i Den Store Kommunetesten","Operating Systems","Browsers","Operating Systems","Operating Systems","Facebook Page","OS","OS","Sammenhengen mellom Internettjenester og Total Poengsum i Den Store Kommunetesten","Sammenhengen mellom Internettjenester og Total Poengsum i Den Store Kommunetesten","Sales Dataset","JoA","Sales Dataset","AdWords Campaign","AdWords Campaign","AdWords Campaign","Search Terms","Search Terms","AdWords Campaign","AdWords Campaign","Facebook Page","Facebook Page","AdWords Campaign","AdWords Campaign","Sales Dataset","Facebook Page","drilling","Sales Dataset","Iris Flowers","Twitter Users"],"public":["0","0","0","0","0","1","1","0","0","0","0","1","0","0","0","1","0","0","1","1","0","0","0","1","0","0","0","1","1","0","1","0","0","0","0","1","0","1","0","1","0","0","0","0","1","1","0","1","1","1","0","0","1","0","0","1","0","0","1","0","1","0","0","0","0","0","0","0","0","0","0","0","0","1","1","1","1","1","0","0","0","0","0","1","1","0","0","0","1","0","0","0","0","1","0","1","1","0","0","0","0","1","0","0","1","1","0","1","0","0","1","1","1","0","0","0","1","1","0","1","0","0","0","1","1","1","0","0","0","1","0","0","0","0","0","0","0","0","0","0","0","0","0","1","0","0","0","0","0","0","0","0","0","0","0","1","0","1","0","0","0","0","0","0","0","1","1","1","0","1","0","1","0","1","0","0","0","0","1","0","1","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","1","0","0","0","0","0","0","1","1","0","0","1","0","1","0","0","0","1","0"]}
}, "poly/demoData/email": function(exports, require, module) {module.exports.emails={"id":["1632","1633","1634","1635","1636","1637","1638","1639","1640","1641","1642","1643","1644","1645","1646","1647","1648","1649","1650","1651","1652","1653","1654","1655","1656","1657","1658","1659","1660","1661","1662","1663","1664","1665","1666","1667","1668","1669","1670","1671","1672","1673","1674","1675","1676","1677","1678","1679","1680","1681","1682","1683","1684","1685","1686","1687","1688","1689","1690","1691","1692","1693","1694","1695","1696","1697","1698","1699","1700","1701","1702","1703","1704","1705","1706","1707","1708","1709","1710","1711","1712","1713","1714","1715","1716","1717","1718","1719","1720","1721","1722","1723","1724","1725","1726","1727","1728","1729","1730","1731","1732","1733","1734","1735","1736","1737","1738","1739","1740","1741","1742","1743","1744","1745","1746","1747","1748","1749","1750","1751","1752","1753","1754","1755","1756","1757","1758","1759","1760","1761","1762","1763","1764","1765","1766","1767","1768","1769","1770","1771","1772","1773","1774","1775","1776","1777","1778","1779","1780","1781","1782","1783","1784","1785","1786","1787","1788","1789","1790","1791","1792","1793","1794","1795","1796","1797","1798","1799","1800","1801","1802","1803","1804","1805","1806","1807","1808","1809","1810","1811","1812","1813","1814","1815","1816","1817","1818","1819","1820","1821","1822","1823","1824","1825","1826","1827","1828","1829","1830","1831","1832","1833","1834","1835","1836","1837","1838","1839","1840","1841","1842","1843","1844","1845","1846","1847","1848","1849","1850","1851","1852","1853","1854","1855","1856","1857","1858","1859","1860","1861","1862","1863","1864","1865","1866","1867","1868","1869","1870","1871","1872","1873","1874","1875"],"template_id":["8","2","2","2","2","2","8","2","2","2","2","2","2","2","2","2","2","2","8","2","2","2","2","2","2","2","2","2","8","2","2","2","2","2","2","2","8","2","8","2","8","2","2","2","2","2","2","8","8","2","2","2","2","2","2","2","2","2","2","2","2","2","2","8","2","2","8","2","8","1","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","2","8","1"],"created":["2013-03-01 01:20:35","2013-03-02 04:56:04","2013-03-02 21:11:23","2013-03-02 23:08:31","2013-03-03 00:28:16","2013-03-04 06:17:58","2013-03-04 06:17:58","2013-03-05 18:05:39","2013-03-05 20:44:07","2013-03-05 22:35:05","2013-03-05 22:42:03","2013-03-05 23:56:27","2013-03-06 05:02:12","2013-03-06 09:17:20","2013-03-07 04:11:25","2013-03-07 04:14:45","2013-03-07 14:18:13","2013-03-07 20:13:18","2013-03-07 20:47:52","2013-03-08 00:50:03","2013-03-08 01:05:35","2013-03-08 01:08:46","2013-03-08 10:30:33","2013-03-11 01:57:28","2013-03-11 02:55:09","2013-03-11 13:57:54","2013-03-11 16:24:30","2013-03-11 17:36:16","2013-03-11 19:20:51","2013-03-11 21:03:23","2013-03-12 14:27:48","2013-03-12 23:28:56","2013-03-13 19:11:00","2013-03-14 09:49:30","2013-03-14 18:34:30","2013-03-14 20:46:09","2013-03-14 22:17:59","2013-03-15 20:32:41","2013-03-16 02:15:48","2013-03-16 02:20:40","2013-03-17 03:15:14","2013-03-17 22:47:55","2013-03-17 22:49:56","2013-03-18 08:43:44","2013-03-18 11:41:00","2013-03-18 16:17:19","2013-03-18 18:03:24","2013-03-18 18:03:24","2013-03-19 00:37:43","2013-03-20 04:36:02","2013-03-20 14:58:56","2013-03-20 18:07:43","2013-03-20 19:02:43","2013-03-20 21:17:23","2013-03-20 21:22:34","2013-03-21 02:35:02","2013-03-21 12:17:48","2013-03-21 16:44:52","2013-03-21 21:07:57","2013-03-22 20:24:04","2013-03-25 08:14:40","2013-03-25 16:26:27","2013-03-26 13:46:55","2013-03-26 14:17:40","2013-03-26 14:18:16","2013-03-26 20:17:44","2013-03-26 20:17:44","2013-03-26 20:55:45","2013-03-26 20:55:45","2013-03-27 05:20:58","2013-03-27 13:26:37","2013-03-27 13:26:37","2013-03-27 13:31:59","2013-03-27 13:31:59","2013-03-27 14:49:54","2013-03-27 14:49:54","2013-03-27 15:06:05","2013-03-27 15:06:05","2013-03-27 17:14:58","2013-03-27 17:14:58","2013-03-27 17:52:26","2013-03-27 17:52:26","2013-03-27 20:12:26","2013-03-27 20:12:26","2013-03-28 13:14:22","2013-03-28 13:14:22","2013-03-28 14:28:20","2013-03-28 14:28:21","2013-03-29 02:55:39","2013-03-29 02:55:39","2013-03-29 13:38:44","2013-03-29 13:38:44","2013-03-29 15:23:48","2013-03-29 15:23:48","2013-03-29 15:23:52","2013-03-29 15:23:52","2013-03-29 15:34:35","2013-03-29 15:34:35","2013-03-29 22:15:45","2013-03-29 22:15:45","2013-03-30 01:10:14","2013-03-30 01:10:15","2013-03-30 19:24:52","2013-03-30 19:24:53","2013-03-31 00:32:49","2013-03-31 00:32:49","2013-03-31 19:26:34","2013-03-31 19:26:34","2013-03-31 20:56:29","2013-03-31 20:56:29","2013-04-01 18:42:04","2013-04-01 18:42:04","2013-04-01 19:56:18","2013-04-01 19:56:18","2013-04-01 22:10:26","2013-04-01 22:10:26","2013-04-01 22:54:49","2013-04-01 22:54:49","2013-04-03 00:18:01","2013-04-03 00:18:01","2013-04-03 03:19:57","2013-04-03 03:19:57","2013-04-03 09:49:54","2013-04-03 09:49:54","2013-04-03 13:01:40","2013-04-03 13:01:40","2013-04-04 13:09:20","2013-04-04 13:09:20","2013-04-04 17:36:55","2013-04-04 17:36:55","2013-04-04 18:20:54","2013-04-04 18:20:54","2013-04-04 21:47:37","2013-04-04 21:47:37","2013-04-04 23:26:18","2013-04-04 23:26:18","2013-04-05 04:08:47","2013-04-05 04:08:47","2013-04-05 14:05:58","2013-04-05 14:05:58","2013-04-05 20:19:58","2013-04-05 20:20:00","2013-04-06 14:59:24","2013-04-06 14:59:24","2013-04-07 05:01:12","2013-04-07 05:01:12","2013-04-08 15:25:52","2013-04-08 15:25:52","2013-04-09 01:20:53","2013-04-09 01:20:53","2013-04-09 15:16:32","2013-04-09 15:16:33","2013-04-09 15:27:14","2013-04-09 15:27:14","2013-04-09 19:09:12","2013-04-09 19:09:12","2013-04-09 19:35:34","2013-04-09 19:35:34","2013-04-09 19:39:41","2013-04-09 19:39:41","2013-04-09 19:41:38","2013-04-09 19:41:38","2013-04-09 19:41:39","2013-04-09 19:41:39","2013-04-09 22:38:33","2013-04-09 22:48:57","2013-04-09 22:48:57","2013-04-09 23:52:16","2013-04-09 23:52:16","2013-04-10 00:00:29","2013-04-10 00:00:29","2013-04-10 04:14:30","2013-04-10 04:14:30","2013-04-10 08:30:51","2013-04-10 08:30:51","2013-04-10 12:59:20","2013-04-10 12:59:20","2013-04-10 13:34:03","2013-04-10 13:34:03","2013-04-10 14:00:25","2013-04-10 14:00:25","2013-04-10 15:14:40","2013-04-10 15:14:40","2013-04-10 16:51:46","2013-04-10 16:51:46","2013-04-10 17:06:19","2013-04-10 17:06:19","2013-04-10 17:20:25","2013-04-10 17:20:25","2013-04-10 18:53:10","2013-04-10 18:53:10","2013-04-10 19:47:11","2013-04-10 19:47:11","2013-04-10 20:16:08","2013-04-10 20:16:08","2013-04-10 21:04:28","2013-04-10 21:04:28","2013-04-10 21:30:33","2013-04-10 21:30:33","2013-04-11 06:42:45","2013-04-11 06:42:46","2013-04-11 12:56:19","2013-04-11 12:56:20","2013-04-11 14:34:53","2013-04-11 14:34:53","2013-04-11 16:29:16","2013-04-11 16:29:16","2013-04-11 22:15:02","2013-04-11 22:15:03","2013-04-11 23:39:16","2013-04-11 23:39:16","2013-04-12 02:40:32","2013-04-12 02:40:32","2013-04-12 14:38:28","2013-04-12 14:38:28","2013-04-12 15:10:03","2013-04-12 15:10:03","2013-04-14 09:41:10","2013-04-14 09:41:10","2013-04-14 10:42:57","2013-04-14 10:42:57","2013-04-14 12:41:35","2013-04-14 12:41:35","2013-04-14 21:09:33","2013-04-14 21:09:34","2013-04-15 17:28:10","2013-04-15 17:28:10","2013-04-16 17:54:13","2013-04-16 17:54:13","2013-04-17 01:32:26","2013-04-17 01:32:26","2013-04-17 04:18:15","2013-04-17 04:18:15","2013-04-17 09:35:17","2013-04-17 09:35:17","2013-04-17 21:01:37","2013-04-17 21:01:37","2013-04-18 07:38:22","2013-04-18 07:38:22","2013-04-19 11:14:14","2013-04-19 11:14:14","2013-04-19 14:51:24","2013-04-19 14:51:24","2013-04-19 18:27:38"],"success":["1","1","1","1","1","1","0","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","0","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","0","1","1","0","1","0","1","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1","0","1"],"message_hash":["a26aaf39","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c",null,"f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","1db28572","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f3fa3842","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","d2056a70","f9a0170c","62dcdff8","f9a0170c","eba12c05","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c",null,"5996d522","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c","f9a0170c",null,"f9a0170c","f9a0170c",null,"f9a0170c",null,"5d57655f","f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"f9a0170c",null,"daaa227e"],"source":["web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web","web"]}
}, "poly/demoData/sales": function(exports, require, module) {module.exports.sales=[{"date":"01/28/2012","income":69504,"expense":18437},{"date":"01/04/2012","income":58264,"expense":38507},{"date":"01/10/2012","income":79633,"expense":41439},{"date":"01/30/2012","income":62371,"expense":16766},{"date":"01/23/2012","income":79957,"expense":40398},{"date":"01/11/2012","income":55268,"expense":57013},{"date":"01/30/2012","income":73216,"expense":57339},{"date":"01/07/2012","income":71778,"expense":14765},{"date":"01/26/2012","income":61958,"expense":42564},{"date":"01/02/2012","income":55277,"expense":78378},{"date":"01/28/2012","income":99313,"expense":56199},{"date":"01/01/2012","income":76560,"expense":77535},{"date":"01/04/2012","income":98110,"expense":33240},{"date":"01/02/2012","income":63163,"expense":28064},{"date":"01/21/2012","income":66578,"expense":63136},{"date":"01/18/2012","income":83902,"expense":60515},{"date":"01/30/2012","income":93981,"expense":69033},{"date":"01/16/2012","income":56444,"expense":43060},{"date":"01/24/2012","income":64623,"expense":36342},{"date":"01/15/2012","income":78447,"expense":72411},{"date":"01/25/2012","income":90529,"expense":57202},{"date":"01/08/2012","income":78160,"expense":29243},{"date":"01/23/2012","income":67529,"expense":79913},{"date":"01/23/2012","income":67149,"expense":51283},{"date":"01/18/2012","income":73197,"expense":41397},{"date":"01/23/2012","income":78329,"expense":41514},{"date":"01/23/2012","income":55425,"expense":16844},{"date":"01/21/2012","income":70749,"expense":14949},{"date":"01/13/2012","income":71489,"expense":57478},{"date":"01/01/2012","income":66438,"expense":63294},{"date":"01/13/2012","income":71866,"expense":10476},{"date":"01/03/2012","income":74149,"expense":32186},{"date":"01/26/2012","income":92506,"expense":52831},{"date":"01/02/2012","income":89461,"expense":19980},{"date":"01/19/2012","income":99410,"expense":35071},{"date":"01/17/2012","income":51708,"expense":65913},{"date":"01/04/2012","income":51623,"expense":51815},{"date":"01/21/2012","income":53682,"expense":36814},{"date":"01/09/2012","income":79806,"expense":39164},{"date":"01/17/2012","income":98641,"expense":14204},{"date":"01/06/2012","income":93258,"expense":47759},{"date":"01/11/2012","income":75513,"expense":78158},{"date":"01/27/2012","income":81860,"expense":74768},{"date":"01/03/2012","income":52218,"expense":14687},{"date":"01/11/2012","income":80175,"expense":36120},{"date":"01/25/2012","income":91416,"expense":12857},{"date":"01/08/2012","income":68997,"expense":31790},{"date":"01/18/2012","income":67888,"expense":26105},{"date":"01/01/2012","income":96158,"expense":20289},{"date":"01/03/2012","income":68632,"expense":73795},{"date":"01/20/2012","income":75257,"expense":38477},{"date":"01/20/2012","income":85505,"expense":47634},{"date":"01/02/2012","income":50208,"expense":64864},{"date":"01/02/2012","income":96035,"expense":52020},{"date":"01/12/2012","income":60020,"expense":72546},{"date":"01/21/2012","income":83018,"expense":14588},{"date":"01/10/2012","income":71646,"expense":21942},{"date":"01/01/2012","income":51961,"expense":14907},{"date":"01/07/2012","income":54793,"expense":15852},{"date":"01/13/2012","income":56853,"expense":58955},{"date":"01/04/2012","income":72837,"expense":77577},{"date":"01/17/2012","income":87009,"expense":68569},{"date":"01/28/2012","income":63833,"expense":16855},{"date":"01/18/2012","income":53338,"expense":23988},{"date":"01/17/2012","income":62246,"expense":40759},{"date":"01/04/2012","income":55558,"expense":62506},{"date":"01/20/2012","income":92312,"expense":67490},{"date":"01/18/2012","income":64385,"expense":69528},{"date":"01/06/2012","income":80252,"expense":24587},{"date":"01/15/2012","income":72534,"expense":66381},{"date":"01/03/2012","income":55094,"expense":17772},{"date":"01/04/2012","income":93550,"expense":47437},{"date":"01/09/2012","income":64082,"expense":73716},{"date":"01/22/2012","income":80246,"expense":36425},{"date":"01/22/2012","income":99692,"expense":61939},{"date":"01/22/2012","income":53842,"expense":41540},{"date":"01/26/2012","income":85368,"expense":67192},{"date":"01/14/2012","income":64363,"expense":78883},{"date":"01/19/2012","income":95749,"expense":34782},{"date":"01/29/2012","income":59193,"expense":21192},{"date":"01/03/2012","income":89673,"expense":30652},{"date":"01/30/2012","income":95499,"expense":54778},{"date":"01/09/2012","income":55815,"expense":23837},{"date":"01/08/2012","income":74504,"expense":60494},{"date":"01/25/2012","income":70303,"expense":75854},{"date":"01/12/2012","income":76339,"expense":45557},{"date":"01/11/2012","income":52589,"expense":37844},{"date":"01/17/2012","income":52138,"expense":33340},{"date":"01/14/2012","income":65399,"expense":55337},{"date":"01/17/2012","income":85547,"expense":31127},{"date":"01/30/2012","income":69483,"expense":65146},{"date":"01/12/2012","income":87620,"expense":16791},{"date":"01/06/2012","income":80241,"expense":12776},{"date":"01/24/2012","income":54052,"expense":46385},{"date":"01/28/2012","income":69685,"expense":28544},{"date":"01/14/2012","income":83984,"expense":23100},{"date":"01/07/2012","income":77997,"expense":51276},{"date":"01/24/2012","income":91342,"expense":57338},{"date":"01/20/2012","income":89366,"expense":32183},{"date":"01/20/2012","income":69880,"expense":23536}]
}, "poly/demoData/users": function(exports, require, module) {module.exports.users = [{"id":1,"signup_date":"01/14/2012","gender":"Male","time_on_site":460},{"id":2,"signup_date":"01/23/2012","gender":"Female","time_on_site":740},{"id":3,"signup_date":"01/29/2012","gender":"Male","time_on_site":797},{"id":4,"signup_date":"01/29/2012","gender":"Female","time_on_site":445},{"id":5,"signup_date":"01/05/2012","gender":"Male","time_on_site":433},{"id":6,"signup_date":"01/29/2012","gender":"Female","time_on_site":878},{"id":7,"signup_date":"01/09/2012","gender":"Male","time_on_site":875},{"id":8,"signup_date":"01/03/2012","gender":"Female","time_on_site":652},{"id":9,"signup_date":"01/07/2012","gender":"Male","time_on_site":64},{"id":10,"signup_date":"01/20/2012","gender":"Female","time_on_site":334},{"id":11,"signup_date":"01/05/2012","gender":"Male","time_on_site":898},{"id":12,"signup_date":"01/27/2012","gender":"Female","time_on_site":102},{"id":13,"signup_date":"01/20/2012","gender":"Female","time_on_site":810},{"id":14,"signup_date":"01/29/2012","gender":"Male","time_on_site":45},{"id":15,"signup_date":"01/30/2012","gender":"Male","time_on_site":667},{"id":16,"signup_date":"01/23/2012","gender":"Male","time_on_site":459},{"id":17,"signup_date":"01/29/2012","gender":"Female","time_on_site":342},{"id":18,"signup_date":"01/10/2012","gender":"Female","time_on_site":101},{"id":19,"signup_date":"01/10/2012","gender":"Female","time_on_site":462},{"id":20,"signup_date":"01/20/2012","gender":"Male","time_on_site":13},{"id":21,"signup_date":"01/26/2012","gender":"Male","time_on_site":645},{"id":22,"signup_date":"01/30/2012","gender":"Male","time_on_site":651},{"id":23,"signup_date":"01/23/2012","gender":"Male","time_on_site":319},{"id":24,"signup_date":"01/14/2012","gender":"Female","time_on_site":45},{"id":25,"signup_date":"01/30/2012","gender":"Female","time_on_site":339},{"id":26,"signup_date":"01/15/2012","gender":"Female","time_on_site":193},{"id":27,"signup_date":"01/05/2012","gender":"Female","time_on_site":502},{"id":28,"signup_date":"01/14/2012","gender":"Female","time_on_site":512},{"id":29,"signup_date":"01/03/2012","gender":"Female","time_on_site":985},{"id":30,"signup_date":"01/05/2012","gender":"Male","time_on_site":137},{"id":31,"signup_date":"01/14/2012","gender":"Male","time_on_site":523},{"id":32,"signup_date":"01/07/2012","gender":"Male","time_on_site":778},{"id":33,"signup_date":"01/21/2012","gender":"Male","time_on_site":796},{"id":34,"signup_date":"01/23/2012","gender":"Male","time_on_site":3},{"id":35,"signup_date":"01/08/2012","gender":"Female","time_on_site":425},{"id":36,"signup_date":"01/13/2012","gender":"Female","time_on_site":152},{"id":37,"signup_date":"01/30/2012","gender":"Female","time_on_site":908},{"id":38,"signup_date":"01/26/2012","gender":"Male","time_on_site":590},{"id":39,"signup_date":"01/14/2012","gender":"Female","time_on_site":105},{"id":40,"signup_date":"01/08/2012","gender":"Male","time_on_site":611},{"id":41,"signup_date":"01/14/2012","gender":"Female","time_on_site":15},{"id":42,"signup_date":"01/20/2012","gender":"Male","time_on_site":682},{"id":43,"signup_date":"01/11/2012","gender":"Male","time_on_site":99},{"id":44,"signup_date":"01/28/2012","gender":"Female","time_on_site":830},{"id":45,"signup_date":"01/09/2012","gender":"Female","time_on_site":751},{"id":46,"signup_date":"01/09/2012","gender":"Male","time_on_site":735},{"id":47,"signup_date":"01/06/2012","gender":"Female","time_on_site":565},{"id":48,"signup_date":"01/14/2012","gender":"Male","time_on_site":138},{"id":49,"signup_date":"01/21/2012","gender":"Female","time_on_site":392},{"id":50,"signup_date":"01/03/2012","gender":"Female","time_on_site":618},{"id":51,"signup_date":"01/17/2012","gender":"Male","time_on_site":158},{"id":52,"signup_date":"01/17/2012","gender":"Male","time_on_site":888},{"id":53,"signup_date":"01/07/2012","gender":"Female","time_on_site":573},{"id":54,"signup_date":"01/15/2012","gender":"Female","time_on_site":293},{"id":55,"signup_date":"01/25/2012","gender":"Male","time_on_site":113},{"id":56,"signup_date":"01/21/2012","gender":"Male","time_on_site":123},{"id":57,"signup_date":"01/16/2012","gender":"Female","time_on_site":708},{"id":58,"signup_date":"01/10/2012","gender":"Male","time_on_site":648},{"id":59,"signup_date":"01/12/2012","gender":"Male","time_on_site":999},{"id":60,"signup_date":"01/19/2012","gender":"Female","time_on_site":891},{"id":61,"signup_date":"01/29/2012","gender":"Male","time_on_site":445},{"id":62,"signup_date":"01/08/2012","gender":"Male","time_on_site":22},{"id":63,"signup_date":"01/21/2012","gender":"Female","time_on_site":137},{"id":64,"signup_date":"01/02/2012","gender":"Female","time_on_site":370},{"id":65,"signup_date":"01/12/2012","gender":"Male","time_on_site":303},{"id":66,"signup_date":"01/12/2012","gender":"Male","time_on_site":346},{"id":67,"signup_date":"01/12/2012","gender":"Female","time_on_site":758},{"id":68,"signup_date":"01/18/2012","gender":"Female","time_on_site":528},{"id":69,"signup_date":"01/25/2012","gender":"Female","time_on_site":711},{"id":70,"signup_date":"01/08/2012","gender":"Male","time_on_site":9},{"id":71,"signup_date":"01/09/2012","gender":"Male","time_on_site":725},{"id":72,"signup_date":"01/06/2012","gender":"Female","time_on_site":955},{"id":73,"signup_date":"01/29/2012","gender":"Female","time_on_site":939},{"id":74,"signup_date":"01/22/2012","gender":"Male","time_on_site":240},{"id":75,"signup_date":"01/13/2012","gender":"Male","time_on_site":79},{"id":76,"signup_date":"01/04/2012","gender":"Female","time_on_site":686},{"id":77,"signup_date":"01/06/2012","gender":"Male","time_on_site":755},{"id":78,"signup_date":"01/19/2012","gender":"Male","time_on_site":534},{"id":79,"signup_date":"01/14/2012","gender":"Male","time_on_site":870},{"id":80,"signup_date":"01/21/2012","gender":"Male","time_on_site":421},{"id":81,"signup_date":"01/09/2012","gender":"Female","time_on_site":892},{"id":82,"signup_date":"01/25/2012","gender":"Male","time_on_site":634},{"id":83,"signup_date":"01/04/2012","gender":"Male","time_on_site":0},{"id":84,"signup_date":"01/23/2012","gender":"Female","time_on_site":982},{"id":85,"signup_date":"01/10/2012","gender":"Male","time_on_site":983},{"id":86,"signup_date":"01/17/2012","gender":"Male","time_on_site":537},{"id":87,"signup_date":"01/20/2012","gender":"Male","time_on_site":123},{"id":88,"signup_date":"01/05/2012","gender":"Female","time_on_site":139},{"id":89,"signup_date":"01/12/2012","gender":"Female","time_on_site":92},{"id":90,"signup_date":"01/29/2012","gender":"Female","time_on_site":999},{"id":91,"signup_date":"01/17/2012","gender":"Female","time_on_site":510},{"id":92,"signup_date":"01/18/2012","gender":"Male","time_on_site":697},{"id":93,"signup_date":"01/20/2012","gender":"Female","time_on_site":393},{"id":94,"signup_date":"01/03/2012","gender":"Female","time_on_site":157},{"id":95,"signup_date":"01/07/2012","gender":"Female","time_on_site":135},{"id":96,"signup_date":"01/12/2012","gender":"Male","time_on_site":434},{"id":97,"signup_date":"01/13/2012","gender":"Female","time_on_site":346},{"id":98,"signup_date":"01/21/2012","gender":"Female","time_on_site":677},{"id":99,"signup_date":"01/12/2012","gender":"Female","time_on_site":229},{"id":100,"signup_date":"01/22/2012","gender":"Male","time_on_site":58}]
}, "poly/dsform": function(exports, require, module) {(function() {
  var Animation, CsvCleanTable, DataSourceFormView, FormStep, FormStepComplete, FormStepConnectionType, FormStepCsvChoose, FormStepCsvClean, FormStepCsvUpload, FormStepDataSourceName, FormStepDatabaseAccount, FormStepDirectConnection, FormStepGAProfileId, FormStepSSH, FormStepSocketFilename, FormStepSourceType, NUM_STEPS, Selector, SlickColumn, TOAST, dsEvents, impute, serverApi,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Animation = require('poly/main/anim');

  TOAST = require('poly/main/error/toast');

  serverApi = require('poly/common/serverApi');

  dsEvents = require('poly/main/events').nav.dscreate;

  NUM_STEPS = 5;

  /*
  This class implements the new data source form. It uses instances of `FormStep`
  subclasses, which define their own templates for rendering. They also implement
  functions to validate data, extend a data object, and provide the next step
  object.
  
  There is also an `allSteps` array, which keeps track of the step objects that
  the user has previously visited. This allows the user to step back to make a
  correction, without losing information that has been filled out in the following
  steps.
  */


  DataSourceFormView = (function() {
    function DataSourceFormView(availableDataSourceTypes) {
      this.initDataSourceView = __bind(this.initDataSourceView, this);
      this.prevStep = __bind(this.prevStep, this);
      this.nextStep = __bind(this.nextStep, this);
      this.initFormStep = __bind(this.initFormStep, this);
      var _this = this;
      this.data = {};
      this.formStep = ko.observable(new FormStepSourceType(availableDataSourceTypes));
      this.stepNum = ko.observable(0);
      this.progPercWidth = ko.computed(function() {
        var expectedNumSteps, fullWidth;
        fullWidth = $('.progress-bar', _this.dom).width();
        if (_this.formStep() === null) {
          return fullWidth;
        }
        expectedNumSteps = _this.formStep().expectedStepsLeft + _this.stepNum();
        return (_this.stepNum() / expectedNumSteps) * fullWidth;
      });
      this.allSteps = [this.formStep()];
      this.actionsDisabled = ko.observable(false);
      this.backBtnVisible = ko.computed(function() {
        var formStep;
        formStep = _this.formStep();
        return _this.stepNum() !== 0 && !_.isEmpty(formStep.backBtnText);
      });
      this.nextBtnVisible = ko.computed(function() {
        return _this.formStep().expectedStepsLeft !== 0 && !_.isEmpty(_this.formStep().nextBtnText);
      });
      dsEvents.nextstep.on(this.nextStep);
    }

    DataSourceFormView.prototype.initFormStep = function(dom) {
      return this.formStep().initDOM(dom, this.data);
    };

    DataSourceFormView.prototype.nextStep = function() {
      var asyncValidateCallback, errorMsg, loadingAnim,
        _this = this;
      if (this.actionsDisabled()) {
        return false;
      }
      if (errorMsg = this.formStep().getFormErrorMessage(this.data)) {
        TOAST.raise(errorMsg);
        return false;
      }
      loadingAnim = new Animation('loading', this.dom);
      this.actionsDisabled(true);
      asyncValidateCallback = function(resp) {
        var nextAllStep, nextStep;
        loadingAnim.remove();
        _this.actionsDisabled(false);
        if (_.isString(resp)) {
          return TOAST.raise(resp);
        } else if (resp === true) {
          _this.formStep().extendFormData(_this.data);
          nextStep = _this.formStep().constructNextStep();
          if (_this.allSteps.length > _this.stepNum() + 1) {
            nextAllStep = _this.allSteps[_this.stepNum() + 1];
            if (nextAllStep.templateName === nextStep.templateName) {
              nextStep = nextAllStep;
              nextStep.returnToStep();
            } else {
              _this.allSteps = _this.allSteps.splice(0, _this.stepNum() + 1);
            }
          } else {
            _this.allSteps.push(nextStep);
          }
          _this.formStep(nextStep);
          return _this.stepNum(_this.stepNum() + 1);
        }
      };
      return this.formStep().asyncFormValidate(asyncValidateCallback, this.data);
    };

    DataSourceFormView.prototype.prevStep = function() {
      if (this.actionsDisabled()) {
        return false;
      }
      this.formStep().prevStep();
      this.formStep(this.allSteps[this.stepNum() - 1]);
      return this.stepNum(this.stepNum() - 1);
    };

    DataSourceFormView.prototype.formSubmit = function() {
      this.nextStep();
      return false;
    };

    DataSourceFormView.prototype.initDataSourceView = function(dom) {
      this.dom = dom;
    };

    return DataSourceFormView;

  })();

  FormStep = (function() {
    function FormStep() {
      this.constructNextStep = __bind(this.constructNextStep, this);
      this.asyncFormValidate = __bind(this.asyncFormValidate, this);
      this.getFormErrorMessage = __bind(this.getFormErrorMessage, this);
      this.extendFormData = __bind(this.extendFormData, this);
      this.initDOM = __bind(this.initDOM, this);
      this.expectedStepsLeft = 6;
    }

    FormStep.prototype.prevStep = function() {};

    FormStep.prototype.returnToStep = function() {};

    FormStep.prototype.backBtnText = 'Back';

    FormStep.prototype.nextBtnText = 'Next Step';

    FormStep.prototype.initDOM = function(dom, data) {
      this.dom = dom;
    };

    FormStep.prototype.extendFormData = function(data) {
      throw 'FormStep subclass must implement this method';
    };

    FormStep.prototype.getFormErrorMessage = function(data) {};

    FormStep.prototype.asyncFormValidate = function(callback, data) {
      return callback(true);
    };

    FormStep.prototype.constructNextStep = function() {
      throw 'FormStep subclass must construct next step!';
    };

    return FormStep;

  })();

  FormStepSourceType = (function(_super) {
    __extends(FormStepSourceType, _super);

    function FormStepSourceType(availableTypes) {
      this.constructNextStep = __bind(this.constructNextStep, this);
      this.extendFormData = __bind(this.extendFormData, this);
      this.getFormErrorMessage = __bind(this.getFormErrorMessage, this);
      this.typeButtonClicked = __bind(this.typeButtonClicked, this);
      var allTypeButtons, b;
      this.stepName = 'Select Data Source Type';
      this.templateName = 'tmpl-nds-form-source-type';
      this.expectedStepsLeft = 6;
      this.type = ko.observable(null);
      allTypeButtons = [
        {
          name: 'mysql'
        }, {
          name: 'postgresql',
          wide: true
        }, {
          name: 'salesforce'
        }, {
          name: 'infobright'
        }, {
          name: 'googleAnalytics',
          wide: true
        }, {
          name: 'csv'
        }
      ];
      this.typeButtons = (function() {
        var _i, _len, _ref, _results;
        _results = [];
        for (_i = 0, _len = allTypeButtons.length; _i < _len; _i++) {
          b = allTypeButtons[_i];
          if (_ref = b.name, __indexOf.call(availableTypes, _ref) >= 0) {
            _results.push(b);
          }
        }
        return _results;
      })();
    }

    FormStepSourceType.prototype.typeButtonClicked = function(typeButton) {
      return this.type(typeButton.name);
    };

    FormStepSourceType.prototype.getFormErrorMessage = function() {
      if (_.isEmpty(this.type())) {
        return "You need to select a data source type!";
      }
    };

    FormStepSourceType.prototype.extendFormData = function(data) {
      data.type = this.type();
      if (this.type() === 'postgresql') {
        return data.connectionType = 'direct';
      }
    };

    FormStepSourceType.prototype.constructNextStep = function() {
      dsEvents.dbtype.trigger({
        details: this.type()
      });
      switch (this.type()) {
        case 'mysql':
        case 'infobright':
          return new FormStepConnectionType();
        case 'postgresql':
          return new FormStepDirectConnection();
        case 'googleAnalytics':
          return new FormStepGAProfileId();
        case 'salesforce':
          return new FormStepDataSourceName();
        case 'csv':
          return new FormStepCsvChoose();
      }
    };

    return FormStepSourceType;

  })(FormStep);

  FormStepConnectionType = (function(_super) {
    __extends(FormStepConnectionType, _super);

    function FormStepConnectionType() {
      this.constructNextStep = __bind(this.constructNextStep, this);
      this.asyncFormValidate = __bind(this.asyncFormValidate, this);
      this.getFormErrorMessage = __bind(this.getFormErrorMessage, this);
      this.extendFormData = __bind(this.extendFormData, this);
      var _this = this;
      this.stepName = 'Select Connection Type';
      this.templateName = 'tmpl-nds-form-connection-type';
      this.expectedStepsLeft = 5;
      this.options = ko.observableArray(['ssh', 'direct']);
      this.optionsText = function(item) {
        switch (item) {
          case 'ssh':
            return 'SSH';
          case 'direct':
            return 'Direct Connection';
        }
      };
      this.type = ko.observable();
    }

    FormStepConnectionType.prototype.extendFormData = function(data) {
      return data.connectionType = this.type();
    };

    FormStepConnectionType.prototype.getFormErrorMessage = function() {
      if (this.type() !== 'direct' && this.type() !== 'ssh') {
        return "Invalid connection type entered!";
      }
    };

    FormStepConnectionType.prototype.asyncFormValidate = function(callback, data) {
      if (this.type() === 'ssh' && (!data.sshKey || !data.sshPublicKey)) {
        return serverApi.sendPost('/ssh/keygen', {}, function(err, resp) {
          if (err) {
            return callback('An error occurred contacting the server');
          } else {
            data.sshKey = resp.privateKey;
            data.sshPublicKey = resp.publicKey;
            return callback(true);
          }
        });
      } else {
        return callback(true);
      }
    };

    FormStepConnectionType.prototype.constructNextStep = function() {
      dsEvents.conntype.chain(dsEvents.dbtype, {
        details: this.type()
      });
      if (this.type() === 'ssh') {
        return new FormStepSSH();
      } else if (this.type() === 'direct') {
        return new FormStepDirectConnection();
      }
    };

    return FormStepConnectionType;

  })(FormStep);

  FormStepSSH = (function(_super) {
    __extends(FormStepSSH, _super);

    function FormStepSSH() {
      this.constructNextStep = __bind(this.constructNextStep, this);
      this.extendFormData = __bind(this.extendFormData, this);
      this.asyncFormValidate = __bind(this.asyncFormValidate, this);
      this.getFormErrorMessage = __bind(this.getFormErrorMessage, this);
      this.initDOM = __bind(this.initDOM, this);
      this.stepName = 'Set Up an SSH Account';
      this.templateName = 'tmpl-nds-form-ssh';
      this.expectedStepsLeft = 4;
      this.sshUsername = ko.observable('');
      this.sshHost = ko.observable('');
      this.sshPort = ko.observable('22');
      this.sshPublicKey = ko.observable('');
      this.requireSocketFilename = false;
    }

    FormStepSSH.prototype.initDOM = function(dom, data) {
      if (data.type === 'mysql') {
        this.defaultSocketFile = '/var/run/mysqld/mysqld.sock';
      } else if (data.type === 'infobright') {
        this.defaultSocketFile = '/tmp/mysql-ib.sock';
      }
      return this.sshPublicKey(data.sshPublicKey);
    };

    FormStepSSH.prototype.getFormErrorMessage = function() {
      if (_.isEmpty(this.sshUsername())) {
        return "You must enter an SSH username!";
      }
      if (_.isEmpty(this.sshHost())) {
        return "You must enter an SSH host!";
      }
      if (_.isEmpty(this.sshPort())) {
        return "You must enter an SSH port!";
      }
    };

    FormStepSSH.prototype.asyncFormValidate = function(callback, data) {
      var _this = this;
      data = {
        username: this.sshUsername(),
        host: this.sshHost(),
        port: this.sshPort(),
        privateKey: data.sshKey,
        filePath: this.defaultSocketFile,
        isSocket: true
      };
      return serverApi.sendPost('/ssh/file-exists', data, function(err, resp) {
        if (err) {
          console.error(err);
          callback('An error occurred contacting the server');
          return;
        }
        switch (resp.status) {
          case 'found':
            return callback(true);
          case 'notFound':
            _this.requireSocketFilename = true;
            return callback(true);
          case 'connFailed':
            return callback('SSH authorization failed, please enter the correct credentials.');
        }
      });
    };

    FormStepSSH.prototype.extendFormData = function(data) {
      data.sshUsername = this.sshUsername();
      data.sshHost = this.sshHost();
      data.sshPort = this.sshPort();
      if (!this.requireSocketFilename) {
        return data.dbUnixSocket = this.defaultSocketFile;
      }
    };

    FormStepSSH.prototype.constructNextStep = function() {
      dsEvents.ssh.chain(dsEvents.dbtype);
      if (this.requireSocketFilename) {
        return new FormStepSocketFilename();
      } else {
        return new FormStepDatabaseAccount();
      }
    };

    return FormStepSSH;

  })(FormStep);

  FormStepSocketFilename = (function(_super) {
    __extends(FormStepSocketFilename, _super);

    function FormStepSocketFilename() {
      this.constructNextStep = __bind(this.constructNextStep, this);
      this.asyncFormValidate = __bind(this.asyncFormValidate, this);
      this.extendFormData = __bind(this.extendFormData, this);
      this.getFormErrorMessage = __bind(this.getFormErrorMessage, this);
      this.stepName = 'Enter Your Unix Socket File';
      this.expectedStepsLeft = 3;
      this.templateName = 'tmpl-nds-form-socket-filename';
      this.dbUnixSocket = ko.observable('');
    }

    FormStepSocketFilename.prototype.getFormErrorMessage = function() {
      if (_.isEmpty(this.dbUnixSocket())) {
        return "You must enter a Unix socket file location!";
      }
    };

    FormStepSocketFilename.prototype.extendFormData = function(data) {
      return data.dbUnixSocket = this.dbUnixSocket();
    };

    FormStepSocketFilename.prototype.asyncFormValidate = function(callback, data) {
      var _this = this;
      data = {
        username: data.sshUsername,
        host: data.sshHost,
        port: data.sshPort,
        privateKey: data.sshKey,
        filePath: this.dbUnixSocket(),
        isSocket: true
      };
      return serverApi.sendPost('/ssh/file-exists', data, function(err, resp) {
        if (err) {
          console.error(err);
          callback('An error occurred contacting the server');
          return;
        }
        switch (resp.status) {
          case 'found':
            return callback(true);
          case 'notFound':
            return callback('Could not find the UNIX socket file, please enter it again.');
          case 'connFailed':
            return callback('SSH authorization failed, please enter the correct credentials.');
        }
      });
    };

    FormStepSocketFilename.prototype.constructNextStep = function() {
      dsEvents.socket.chain(dsEvents.dbtype);
      return new FormStepDatabaseAccount();
    };

    return FormStepSocketFilename;

  })(FormStep);

  FormStepDirectConnection = (function(_super) {
    __extends(FormStepDirectConnection, _super);

    function FormStepDirectConnection() {
      this.constructNextStep = __bind(this.constructNextStep, this);
      this.extendFormData = __bind(this.extendFormData, this);
      this.getFormErrorMessage = __bind(this.getFormErrorMessage, this);
      this.initDOM = __bind(this.initDOM, this);
      this.stepName = 'Enter the Location of Your Database';
      this.templateName = 'tmpl-nds-form-direct-connection';
      this.expectedStepsLeft = 3;
      this.dbHost = ko.observable('');
      this.dbPort = ko.observable('');
    }

    FormStepDirectConnection.prototype.initDOM = function(dom, data) {
      if (!_.isEmpty(this.dbPort())) {
        return;
      }
      switch (data.type) {
        case 'mysql':
          return this.dbPort('3306');
        case 'infobright':
          return this.dbPort('5029');
        case 'postgresql':
          return this.dbPort('5432');
      }
    };

    FormStepDirectConnection.prototype.getFormErrorMessage = function() {
      if (_.isEmpty(this.dbHost())) {
        return "You must enter a database host!";
      }
      if (_.isEmpty(this.dbPort())) {
        return "You must enter a database port!";
      }
    };

    FormStepDirectConnection.prototype.extendFormData = function(data) {
      data.dbHost = this.dbHost();
      return data.dbPort = this.dbPort();
    };

    FormStepDirectConnection.prototype.constructNextStep = function() {
      dsEvents.direct.chain(dsEvents.dbtype);
      return new FormStepDatabaseAccount();
    };

    return FormStepDirectConnection;

  })(FormStep);

  FormStepDatabaseAccount = (function(_super) {
    __extends(FormStepDatabaseAccount, _super);

    function FormStepDatabaseAccount() {
      this.constructNextStep = __bind(this.constructNextStep, this);
      this.extendFormData = __bind(this.extendFormData, this);
      this.getFormErrorMessage = __bind(this.getFormErrorMessage, this);
      this.stepName = 'Set Up a Database User';
      this.templateName = 'tmpl-nds-form-database-account';
      this.expectedStepsLeft = 2;
      this.dbUsername = ko.observable('');
      this.dbPassword = ko.observable('');
      this.dbName = ko.observable('');
    }

    FormStepDatabaseAccount.prototype.getFormErrorMessage = function() {
      if (_.isEmpty(this.dbUsername())) {
        return "You must enter a database username!";
      }
      if (_.isEmpty(this.dbPassword())) {
        return "You must enter a database password!";
      }
      if (_.isEmpty(this.dbName())) {
        return "You must enter a database name!";
      }
    };

    FormStepDatabaseAccount.prototype.extendFormData = function(data) {
      data.dbUsername = this.dbUsername();
      data.dbPassword = this.dbPassword();
      return data.dbName = this.dbName();
    };

    FormStepDatabaseAccount.prototype.constructNextStep = function() {
      dsEvents.dbacc.chain(dsEvents.dbtype);
      return new FormStepDataSourceName();
    };

    return FormStepDatabaseAccount;

  })(FormStep);

  FormStepCsvChoose = (function(_super) {
    __extends(FormStepCsvChoose, _super);

    function FormStepCsvChoose() {
      this.constructNextStep = __bind(this.constructNextStep, this);
      this.getFormErrorMessage = __bind(this.getFormErrorMessage, this);
      this.stepName = 'Select CSV files';
      this.templateName = 'tmpl-nds-form-csv-choose';
      this.expectedStepsLeft = 3;
      this.csvFile = ko.observable(null);
    }

    FormStepCsvChoose.prototype.getFormErrorMessage = function() {
      if (!this.csvFile()) {
        return 'You must select a file to upload!';
      }
    };

    FormStepCsvChoose.prototype.extendFormData = function() {};

    FormStepCsvChoose.prototype.constructNextStep = function() {
      dsEvents.csvchoose.chain(dsEvents.dbtype);
      return new FormStepCsvUpload(this.csvFile());
    };

    return FormStepCsvChoose;

  })(FormStep);

  FormStepCsvUpload = (function(_super) {
    __extends(FormStepCsvUpload, _super);

    function FormStepCsvUpload(fileList) {
      var _this = this;
      this.fileList = fileList;
      this.constructNextStep = __bind(this.constructNextStep, this);
      this.plural = this.fileList.length > 1 ? 's' : '';
      this.stepName = "Uploading your file" + this.plural + "...";
      this.templateName = 'tmpl-nds-form-csv-upload';
      this.expectedStepsLeft = 2;
      this.error = ko.observable('');
      this.currentFile = ko.observable(0);
      this.progress = ko.observable(0);
      this.size = ko.observable(-1);
      this.complete = ko.computed(function() {
        return _this.progress() === _this.size();
      });
      _.each([this.progress, this.size], function(x) {
        x.disp = ko.computed(function() {
          var _x;
          _x = x();
          while (_x >= 1000) {
            _x /= 1000;
          }
          return _x.toPrecision(3);
        });
        return x.units = ko.computed(function() {
          var _x;
          _x = x();
          if (_x > 1000000) {
            if (_x > 1000000000) {
              return 'GB';
            } else {
              return 'MB';
            }
          } else if (_x > 1000) {
            return 'KB';
          } else {
            return 'B';
          }
        });
      });
      this.progressText = ko.computed(function() {
        var progUnits, sizeUnits;
        progUnits = _this.progress.units();
        sizeUnits = _this.size.units();
        if (progUnits === sizeUnits) {
          progUnits = '';
        }
        return _this.error() || (_this.size() > 0 ? "File " + (_this.currentFile() + 1) + " of " + _this.fileList.length + ": " + (_this.progress.disp()) + progUnits + " / " + (_this.size.disp()) + sizeUnits : 'Calculating upload size');
      });
      this.progressWidth = ko.computed(function() {
        return ((100 * _this.progress() / _this.size()) + _this.currentFile()) / _this.fileList.length;
      });
      this.startUpload();
    }

    FormStepCsvUpload.prototype.prevStep = function() {
      return this.stopUpload();
    };

    FormStepCsvUpload.prototype.returnToStep = function() {
      return this.startUpload();
    };

    FormStepCsvUpload.prototype.uploadFileByNumber = function(num, cb) {
      var doRequest, file,
        _this = this;
      file = this.fileList[num];
      this.progress(0);
      this.size(file.size);
      if (this.size() > 1 * 1024 * 1024) {
        return this.error('Your file is too large. The current maximum file size is 1MB.');
      }
      doRequest = function() {
        return _this.uploadRequest = serverApi.sendFile("/upload/upload-file/" + _this.key + "/" + num, file, function(err, resp) {
          if (err) {
            console.error(err);
            return _this.error("An error occurred while uploading your file" + _this.plural + ".");
          }
          switch (resp.status) {
            case 'success':
              return cb();
            case 'error':
              console.error(resp.error);
              return _this.error("An error occurred while uploading your file" + _this.plural + ".");
          }
        }, function(sent, total) {
          _this.progress(sent);
          if (total >= 0) {
            return _this.size(total);
          }
        });
      };
      if (this.key) {
        return doRequest();
      } else {
        return serverApi.sendPost('/upload/get-key', this.data, function(err, resp) {
          if (err) {
            console.error(err);
            return _this.error('An error occurred contacting the server.');
          }
          if ((_this.key = resp != null ? resp.key : void 0) == null) {
            return _this.error('Unable to upload dataset.');
          }
          return doRequest();
        });
      }
    };

    FormStepCsvUpload.prototype.startUpload = function() {
      var doUpload,
        _this = this;
      this.currentFile(0);
      doUpload = function() {
        return _this.uploadFileByNumber(_this.currentFile(), function() {
          _this.currentFile(_this.currentFile() + 1);
          if (_this.currentFile() < _this.fileList.length) {
            return doUpload();
          } else {
            return dsEvents.nextstep.trigger();
          }
        });
      };
      return doUpload();
    };

    FormStepCsvUpload.prototype.stopUpload = function() {
      var err;
      if (this.uploadRequest) {
        try {
          return this.uploadRequest.abort();
        } catch (_error) {
          err = _error;
          return console.error(err);
        }
      }
    };

    FormStepCsvUpload.prototype.backBtnText = 'Cancel Upload';

    FormStepCsvUpload.prototype.nextBtnText = '';

    FormStepCsvUpload.prototype.extendFormData = function(data) {
      return data.key = this.key;
    };

    FormStepCsvUpload.prototype.constructNextStep = function() {
      return new FormStepCsvClean(this.key, this.fileList.length);
    };

    return FormStepCsvUpload;

  })(FormStep);

  FormStepCsvClean = (function(_super) {
    __extends(FormStepCsvClean, _super);

    function FormStepCsvClean(key, numTables) {
      var i,
        _this = this;
      this.key = key;
      this.numTables = numTables;
      this.constructNextStep = __bind(this.constructNextStep, this);
      this.asyncFormValidate = __bind(this.asyncFormValidate, this);
      this.prevTable = __bind(this.prevTable, this);
      this.nextTable = __bind(this.nextTable, this);
      this.stepName = 'Verify your data';
      this.templateName = 'tmpl-nds-form-csv-clean';
      this.expectedStepsLeft = 1;
      this.tblIndex = ko.observable(0);
      this.isNextTableEnabled = ko.computed(function() {
        return _this.tblIndex() < (_this.numTables - 1);
      });
      this.isPrevTableEnabled = ko.computed(function() {
        return _this.tblIndex() > 0;
      });
      this.tableSettings = (function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = 0, _ref = this.numTables; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          _results.push(new CsvCleanTable(this.key, i));
        }
        return _results;
      }).call(this);
      this.curTable = ko.computed(function() {
        return _this.tableSettings[_this.tblIndex()];
      });
      this.slickRows = ko.computed(function() {
        return _this.curTable().slickRows();
      });
      this.slickColumns = ko.computed(function() {
        return _this.curTable().slickColumns();
      });
    }

    FormStepCsvClean.prototype.nextTable = function() {
      if (this.isNextTableEnabled()) {
        return this.tblIndex(this.tblIndex() + 1);
      }
    };

    FormStepCsvClean.prototype.prevTable = function() {
      if (this.isPrevTableEnabled()) {
        return this.tblIndex(this.tblIndex() - 1);
      }
    };

    FormStepCsvClean.prototype.extendFormData = function(data) {
      return data.validated = true;
    };

    FormStepCsvClean.prototype.asyncFormValidate = function(callback) {
      var data, tbl,
        _this = this;
      data = {
        tables: (function() {
          var _i, _len, _ref, _results;
          _ref = this.tableSettings;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            tbl = _ref[_i];
            _results.push({
              hasHeader: tbl.hasHeader.value(),
              delimiter: tbl.delimiter.value(),
              rowsToKeep: tbl.rowsToKeep(),
              types: tbl.overriddenTypes,
              columnNames: tbl.overriddenNames,
              tableName: tbl.tableName()
            });
          }
          return _results;
        }).call(this)
      };
      return serverApi.sendPost("/upload/clean/csv/" + this.key, data, function(err, resp) {
        if (err) {
          console.error(err);
          callback('An error occurred contacting the server');
          return;
        }
        switch (resp.status) {
          case 'success':
            return callback(true);
          case 'error':
            return callback(resp.error);
        }
      });
    };

    FormStepCsvClean.prototype.constructNextStep = function() {
      return new FormStepDataSourceName();
    };

    return FormStepCsvClean;

  })(FormStep);

  impute = function(values) {
    var date, length, m, num, value, _i, _len;
    date = 0;
    num = 0;
    length = 0;
    for (_i = 0, _len = values.length; _i < _len; _i++) {
      value = values[_i];
      if ((value == null) || value === void 0 || value === null) {
        continue;
      }
      length++;
      if (!isNaN(value) || !isNaN(value.replace(/\$|\,/g, ''))) {
        num++;
      }
      m = moment(value);
      if ((m != null) && m.isValid()) {
        date++;
      }
    }
    if (num > 0.95 * length) {
      return 'num';
    }
    if (date > 0.95 * length) {
      return 'date';
    }
    return 'cat';
  };

  CsvCleanTable = (function() {
    function CsvCleanTable(key, index) {
      var _this = this;
      this.key = key;
      this.index = index;
      this.tableName = ko.observable("Table " + (this.index + 1));
      this.hasHeader = new Selector('has-header', true, [true, false], ['Yes', 'No']);
      this.delimiter = new Selector('delimiter', ',', ['\t', ';', ','], ['Tab', 'Semicolon', 'Comma']);
      this.rowsToKeep = ko.observable('');
      this.slickRows = ko.observable([]);
      this.header = ko.observable([]);
      this.imputedTypes = ko.computed(function() {
        var col, rows, _i, _len, _ref, _results;
        rows = _this.slickRows();
        _ref = _this.header();
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          col = _ref[_i];
          _results.push(impute(_.pluck(rows, col)));
        }
        return _results;
      });
      this.overriddenNames = [];
      this.overriddenTypes = [];
      this.displayNames = ko.computed(function() {
        var header, i, _i, _ref, _results;
        header = _this.header();
        _results = [];
        for (i = _i = 0, _ref = header.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          _results.push(_this.overriddenNames[i] || header[i]);
        }
        return _results;
      });
      this.dataTypes = ko.computed(function() {
        var i, imputed, _i, _ref, _results;
        imputed = _this.imputedTypes();
        _results = [];
        for (i = _i = 0, _ref = imputed.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          _results.push(_this.overriddenTypes[i] || imputed[i]);
        }
        return _results;
      });
      this.slickColumns = ko.computed(function() {
        var i, name, type, _i, _len, _ref, _ref1, _results;
        _ref = _.zip(_this.displayNames(), _this.dataTypes());
        _results = [];
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          _ref1 = _ref[i], name = _ref1[0], type = _ref1[1];
          _results.push((function(idx) {
            return new SlickColumn(name, type, function(newName) {
              return _this.overriddenNames[idx] = newName;
            }, function(newType) {
              return _this.overriddenTypes[idx] = newType;
            });
          })(i));
        }
        return _results;
      });
      ko.computed(function() {
        var data;
        data = {
          hasHeader: _this.hasHeader.value(),
          delimiter: _this.delimiter.value(),
          rowsToKeep: _this.rowsToKeep(),
          types: _this.overriddenTypes,
          columnNames: _this.overriddenNames,
          tableName: _this.tableName.peek()
        };
        return serverApi.sendPost("/upload/preview/csv/" + _this.key + "/" + _this.index, data, function(err, resp) {
          if (err) {
            console.error(err);
            TOAST.raise('An error occurred contacting the server');
            return;
          }
          switch (resp.status) {
            case 'success':
              _this.slickRows(resp.rows);
              return _this.header(resp.header);
            case 'error':
              console.error(resp.error);
              return TOAST.raise('An error occurred while processing your file');
          }
        });
      });
    }

    return CsvCleanTable;

  })();

  SlickColumn = (function() {
    function SlickColumn(name, type, nameFn, typeFn) {
      this.name = ko.observable(name);
      this.field = name;
      this.dataType = ko.observable(type);
      this.name.subscribe(nameFn);
      this.dataType.subscribe(typeFn);
    }

    SlickColumn.prototype.changeDataType = function() {
      return this.dataType({
        cat: 'num',
        num: 'date',
        date: 'cat'
      }[this.dataType()]);
    };

    return SlickColumn;

  })();

  FormStepGAProfileId = (function(_super) {
    __extends(FormStepGAProfileId, _super);

    function FormStepGAProfileId() {
      this.constructNextStep = __bind(this.constructNextStep, this);
      this.extendFormData = __bind(this.extendFormData, this);
      this.getFormErrorMessage = __bind(this.getFormErrorMessage, this);
      this.stepName = 'Choose a Google Analytics Profile';
      this.templateName = 'tmpl-nds-form-gaprof';
      this.expectedStepsLeft = 2;
      this.gaId = ko.observable('');
    }

    FormStepGAProfileId.prototype.getFormErrorMessage = function() {
      if (!_.isEmpty(this.gaId() && /^\s*\d+\s*$/.exec(this.gaId() === null))) {
        return "The profile ID you have entered is invalid.";
      }
    };

    FormStepGAProfileId.prototype.extendFormData = function(data) {
      var match;
      if (_.isEmpty(this.gaId())) {
        this.gaId('0');
      }
      match = /^\s*(\d+)\s*$/.exec(this.gaId());
      if (match != null) {
        return data.gaId = match[1];
      } else {
        return this.getFormErrorMessage();
      }
    };

    FormStepGAProfileId.prototype.constructNextStep = function() {
      return new FormStepDataSourceName();
    };

    return FormStepGAProfileId;

  })(FormStep);

  FormStepDataSourceName = (function(_super) {
    __extends(FormStepDataSourceName, _super);

    function FormStepDataSourceName() {
      this.constructNextStep = __bind(this.constructNextStep, this);
      this.extendFormData = __bind(this.extendFormData, this);
      this.getFormErrorMessage = __bind(this.getFormErrorMessage, this);
      this.stepName = 'Set a Display Name';
      this.templateName = 'tmpl-nds-form-name-ds';
      this.expectedStepsLeft = 1;
      this.name = ko.observable('');
    }

    FormStepDataSourceName.prototype.getFormErrorMessage = function() {
      if (_.isEmpty(this.name())) {
        return 'You must enter a data source display name!';
      }
    };

    FormStepDataSourceName.prototype.extendFormData = function(data) {
      return data.name = this.name();
    };

    FormStepDataSourceName.prototype.constructNextStep = function() {
      dsEvents.name.chain(dsEvents.dbtype);
      return new FormStepComplete();
    };

    return FormStepDataSourceName;

  })(FormStep);

  FormStepComplete = (function(_super) {
    __extends(FormStepComplete, _super);

    function FormStepComplete() {
      this.initDOM = __bind(this.initDOM, this);
      this.stepName = 'Adding Your Data Source...';
      this.templateName = 'tmpl-nds-form-complete';
      this.expectedStepsLeft = 0;
      this.state = ko.observable('connecting');
      this.errorMessage = ko.observable(null);
    }

    FormStepComplete.prototype.initDOM = function(dom, data) {
      var _this = this;
      return serverApi.sendPost('/data-source/create', data, function(err, resp) {
        if (err) {
          console.error(err);
          if (err.message) {
            _this.errorMessage(err.message);
            return _this.state('knownError');
          } else {
            _this.errorMessage("An error occurred.");
            return _this.state('unknownError');
          }
        } else {
          if (resp.key) {
            return window.location = "/home?newDataSourceKey=" + (encodeURIComponent(resp.key));
          } else if (resp.redirect) {
            return window.location = resp.redirect;
          }
        }
      });
    };

    return FormStepComplete;

  })(FormStep);

  Selector = (function() {
    function Selector(name, def, opts, labels) {
      var i, l, _ref,
        _this = this;
      this.name = name;
      this._value = ko.observable((_ref = opts.indexOf(def)) != null ? _ref : def);
      this.value = ko.computed({
        read: function() {
          return opts[_this._value()];
        },
        write: function(val) {
          var _ref1;
          return _this._value((_ref1 = opts.indexOf(def)) != null ? _ref1 : val);
        }
      });
      this.options = (function() {
        var _i, _len, _results;
        _results = [];
        for (i = _i = 0, _len = labels.length; _i < _len; i = ++_i) {
          l = labels[i];
          _results.push({
            label: l,
            value: i
          });
        }
        return _results;
      })();
    }

    return Selector;

  })();

  module.exports = DataSourceFormView;

}).call(this);
}, "poly/home": function(exports, require, module) {(function() {
  var DataSourceFormView, Events, HomeView, NUX_STEPS, NuxView, TOAST, serverApi,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    _this = this;

  require('poly/main/init');

  Events = require('poly/main/events');

  TOAST = require('poly/main/error/toast');

  DataSourceFormView = require('poly/dsform');

  NuxView = require('poly/nux');

  serverApi = require('poly/common/serverApi');

  NUX_STEPS = [
    {
      cover: 'HEADER, .data-panel',
      title: 'Welcome to Polychart!',
      msgs: ["Polychart lets you easily create dashboards and charts from your existing database.", "We've created a sample dashboard to help you get started."],
      template: 'tmpl-nux-dash-of-dashes',
      instructions: [
        {
          text: 'Click the demo dashboard'
        }
      ],
      skippable: true,
      ref: '.data-panel',
      top: 110,
      left: 15,
      arrowDir: 'right'
    }
  ];

  HomeView = (function() {
    function HomeView(_arg) {
      var availableDataSourceTypes, dsCount, tutorialCompleted;
      availableDataSourceTypes = _arg.availableDataSourceTypes;
      this.btnLogout = __bind(this.btnLogout, this);
      this.toggleDataSourceForm = __bind(this.toggleDataSourceForm, this);
      this.deleteDash = __bind(this.deleteDash, this);
      this.createDash = __bind(this.createDash, this);
      this.dashboardMouseLeave = __bind(this.dashboardMouseLeave, this);
      this.dashboardMouseEnter = __bind(this.dashboardMouseEnter, this);
      this.btnConfirmDeleteDs = __bind(this.btnConfirmDeleteDs, this);
      this.hideDeleteDsDialog = __bind(this.hideDeleteDsDialog, this);
      this.showDeleteDsDialog = __bind(this.showDeleteDsDialog, this);
      this.btnDeleteDash = __bind(this.btnDeleteDash, this);
      this.btnCreateDash = __bind(this.btnCreateDash, this);
      this.btnKeyPress = __bind(this.btnKeyPress, this);
      this.showNux = __bind(this.showNux, this);
      this._availableDataSourceTypes = availableDataSourceTypes;
      this.deletingDs = ko.observable(false);
      this.delDialogTop = ko.observable(0);
      this.delDialogLeft = ko.observable(0);
      this.newDsView = ko.observable(false);
      this.nuxView = null;
      dsCount = $(".dash-btns").length;
      tutorialCompleted = $('#nux-container').data('tutorialCompleted');
      if (dsCount === 0 && !tutorialCompleted) {
        this.showNux();
      }
    }

    HomeView.prototype.showNux = function() {
      var _this = this;
      if ($("#demo").length) {
        return this.nuxView = new NuxView({
          steps: NUX_STEPS,
          onSkip: function() {
            Events.ui.nux.skip.trigger();
            return serverApi.sendPost('/tutorial/mark-complete', {
              type: 'nux'
            }, function(err) {
              if (err) {
                return console.error(err);
              }
            });
          }
        });
      }
    };

    HomeView.prototype.btnKeyPress = function(view, event) {
      if (event.which === 13) {
        $(event.target).click();
        return false;
      }
      return true;
    };

    HomeView.prototype.btnCreateDash = function(view, evt) {
      var ds, key, name;
      ds = $(evt.target).parents('.dash-btns');
      key = ds.data('key');
      name = ds.data('name');
      if (!key || !name) {
        throw "Invalid attributes on create-dash button";
      }
      return this.createDash(key, name);
    };

    HomeView.prototype.btnDeleteDash = function(view, evt) {
      var e, key, node;
      try {
        node = evt.target;
        while ($(node).attr('class') !== 'btn-flat delete-dash') {
          node = node.parentNode;
        }
      } catch (_error) {
        e = _error;
        throw "Invalid click target";
      }
      key = $(node).attr("data-key");
      if (!key) {
        throw "Invalid attributes on delete-dash button";
      }
      return this.deleteDash(key);
    };

    HomeView.prototype.showDeleteDsDialog = function(view, evt) {
      var dsKey;
      dsKey = $(evt.target).closest('.dash-btns').data('key');
      this.deletingDs(dsKey);
      this.delDialogTop($(evt.target).offset().top);
      return this.delDialogLeft($(evt.target).offset().left);
    };

    HomeView.prototype.hideDeleteDsDialog = function() {
      return this.deletingDs(false);
    };

    HomeView.prototype.btnConfirmDeleteDs = function(view, evt) {
      var dsKey;
      Events.ui.datasource.remove.trigger();
      dsKey = this.deletingDs();
      return serverApi.sendPost('/data-source/' + dsKey + '/delete', {}, function(err) {
        if (err) {
          console.error(err);
          return TOAST.raise('Error deleting data source');
        } else {
          return window.location = '/home';
        }
      });
    };

    HomeView.prototype.dashboardMouseEnter = function(view, evt) {
      var $dom;
      $dom = $(evt.target).closest(".dashboard-preview");
      $(".dashboard-info", $dom).css({
        height: $dom.height(),
        bottom: $dom.height()
      });
      $(".dashboard-options", $dom).stop(true, true).fadeIn();
      return $(".dashboard-title", $dom).stop(true, true).fadeOut("fast");
    };

    HomeView.prototype.dashboardMouseLeave = function(view, evt) {
      var $dom;
      $dom = $(evt.target).closest(".dashboard-preview");
      $(".dashboard-info", $dom).css({
        height: "35px",
        bottom: "35px"
      });
      $(".dashboard-options", $dom).stop(true, true).fadeOut();
      return $(".dashboard-title", $dom).stop(true, true).fadeIn();
    };

    HomeView.prototype.createDash = function(dsKey, name) {
      var callback, data;
      callback = function(err, response) {
        var dom;
        if (err) {
          console.error(err);
          return TOAST.raise('Error creating dashboard');
        } else {
          dom = $("#dashboard-item-template").clone();
          dom.removeClass("template");
          $(".dashboard-name", dom).html(name);
          $(".dashboard-name", dom).attr("href", "dashboard/" + response.key + "/edit");
          $(".dashboards").append(dom);
          return window.location = "/home?newDashboardKey=" + (encodeURIComponent(response.key));
        }
      };
      data = {
        name: name,
        spec: {},
        dataCollection: [
          {
            dataSourceKey: dsKey,
            tableNames: ['nothing']
          }
        ]
      };
      return serverApi.sendPost('/dashboard/create', data, callback);
    };

    HomeView.prototype.deleteDash = function(dsKey) {
      return serverApi.sendPost('/dashboard/' + dsKey + '/delete', {}, function(err, response) {
        if (err) {
          console.error(err);
          return TOAST.raise('Error deleting dashboard');
        } else {
          return window.location = '/home';
        }
      });
    };

    HomeView.prototype.toggleDataSourceForm = function(view, evt) {
      if (!$('#new-data-source').is(":visible")) {
        Events.nav.dscreate.start.trigger();
        this.newDsView(new DataSourceFormView(this._availableDataSourceTypes));
        $('#dashboard-shade').fadeIn('fast');
        return $(evt.target).closest('.btn-large').addClass('active');
      } else {
        this.newDsView(false);
        $('#dashboard-shade').fadeOut();
        return $('.btn-large').removeClass('active');
      }
    };

    HomeView.prototype.btnLogout = function() {
      return window.location = '/logout';
    };

    return HomeView;

  })();

  module.exports.main = function(params) {
    var homeView;
    homeView = new HomeView(params);
    return ko.applyBindings(homeView);
  };

}).call(this);
}, "poly/main/anim": function(exports, require, module) {/*
# Define a basic animations library; useful for loading and transitions.
*/


(function() {
  var ANIMATIONS, Animation,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  ANIMATIONS = {
    loading: {
      interval: 200,
      frames: ['anim_loading_0.svg', 'anim_loading_1.svg', 'anim_loading_2.svg']
    }
  };

  Animation = (function() {
    function Animation(animName, container) {
      this.stopOnImage = __bind(this.stopOnImage, this);
      this.remove = __bind(this.remove, this);
      var advFrame, anim, curFrame, div, images,
        _this = this;
      anim = ANIMATIONS[animName];
      if (!anim) {
        throw "Animation " + animName + " does not exist!";
      }
      this.div = div = $("<DIV>");
      div.addClass("anim");
      div.addClass(animName);
      $(container).append(div);
      _.defer(function() {
        return div.css({
          width: div.height(),
          marginLeft: -div.height() / 2,
          marginTop: -div.height() / 2
        });
      });
      images = _.map(anim.frames, function(src) {
        var img;
        img = new Image();
        img.src = '/static/main/images/' + src;
        return img;
      });
      curFrame = 0;
      advFrame = function() {
        div.css('background-image', 'url(' + images[curFrame].src + ')');
        return curFrame = (curFrame + 1) % images.length;
      };
      this.interval = setInterval(advFrame, anim.interval);
    }

    Animation.prototype.remove = function() {
      this.div.remove();
      return clearInterval(this.interval);
    };

    Animation.prototype.stopOnImage = function(imgSrc) {
      this.div.css('background-image', 'url(' + imgSrc + ')');
      return clearInterval(this.interval);
    };

    return Animation;

  })();

  module.exports = Animation;

}).call(this);
}, "poly/main/bindings": function(exports, require, module) {/*
custom KO bindings.
Refer to [Custom Bindings](http://knockoutjs.com/documentation/custom-bindings.html)
for the instructions.
*/


(function() {
  var CONST, Dropdown, DropdownMulti, DropdownSingle, Events, SlickgridData, dnd, init, peek, pui_contentEditable, pui_dndContainer, pui_jqDraggableResizeable, register, unwrap, wrap, _registeredBindings,
    _this = this;

  dnd = require('poly/main/dnd');

  CONST = require('poly/main/const');

  Events = require('poly/main/events');

  unwrap = ko.utils.unwrapObservable;

  wrap = function(x) {
    if (ko.isObservable(x)) {
      return x;
    } else {
      return ko.observable(x);
    }
  };

  peek = function(x) {
    if (ko.isObservable(x)) {
      return x.peek();
    } else {
      return x;
    }
  };

  /*
  pui_dndContainer
  ----------------
  This binding is used to make an element accept dragged elements using jQueryUI's
  draggable/droppable functionality. It relies largely on the `initDroppable`
  function implemented in `dnd.coffee` to apply the actual classes and invoke the
  jQueryUI methods, and most options are passed through to this function. However,
  this method does add the additional feature that, if a droppable object is
  clicked, all draggables that would be accepted are highlighted. Clicking on one
  of these highlighted draggables will behave as if the user had dragged it to
  this droppable.
  
  This should be bound to a configuration object containing the following options:
    * `datatype`: `string`
      The type of draggable this element should accept. This allows preliminary
      filtering to permit several sets of draggables and droppables to coexist.
      This option is passed to `dnd.initDroppable` and is not used directly.
    * `paneltype`: `string` *(optional)*
      This option is passed to `dnd.initDroppable` and is not used directly. The
      documenter does not understand what this option does, and it is not
      currently used.
    * `itementer`: `function(event, {element, data})`
      This function will be called when a draggable is dropped on this element (or
      clicked as described above). It is also passed to `dnd.initDroppable`.
    * `itemdiscard`: `function(event, {element, data})`
      This function will be called when a draggable that has previously been
      dropped on this element is discarded by dragging away. It is not used
      directly.
    * `dropfilter`: `function(element) -> bool`
      This function will be called to determine whether or not a specific
      draggable element should be accepted by this droppable. It is used to
      prevent triggering the `itementer` function and to avoid highlighting
      unacceptable draggables.
    * `name`: `string`
      A human-readable name describing this specific droppable. This is only for
      analytics purposes, and has no effect if analytics/event tracking is not
      enabled.
    * `rerender`: `ko.observable` *(optional)*
      A Knockout observable that can be subscribed to. When this observable is
      changed, the droppable code will be triggered again. This is used to
      re-attach events when the DOM will inevitably be updated by Knockout.
  */


  pui_dndContainer = {
    init: function(element, valueAccessor) {
      var datatype, dropfilter, initDroppableClick, itemdiscard, itementer, name, options, paneltype, rerender, view,
        _this = this;
      view = valueAccessor();
      datatype = view.datatype, paneltype = view.paneltype, itementer = view.itementer, itemdiscard = view.itemdiscard, dropfilter = view.dropfilter, name = view.name, rerender = view.rerender;
      dropfilter || (dropfilter = function() {
        return true;
      });
      options = {
        datatype: datatype,
        paneltype: paneltype,
        itementer: itementer,
        itemdiscard: itemdiscard,
        dropfilter: dropfilter,
        name: name
      };
      dnd.initDroppable($(element), options);
      initDroppableClick = function() {
        return $('.droppable', element).click(function() {
          Events.ui.dnd.selectdroppable.trigger({
            info: {
              target: name
            }
          });
          $('.table-metric-list.selected .metric').filter(function() {
            return dropfilter(this);
          }).addClass('highlight');
          return Events.ui.highlight.begin.trigger({
            selector: '.highlight:visible:not(.disabled)',
            click: function(event, $target) {
              if (dropfilter($target)) {
                Events.ui.dnd.selectdraggable.trigger({
                  info: {
                    name: $target.data('dnd-data').name
                  }
                });
                return itementer(event, {
                  dom: $target,
                  data: $target.data('dnd-data')
                });
              }
            }
          });
        });
      };
      _.defer(initDroppableClick);
      if (rerender) {
        return rerender.subscribe(function() {
          return _.defer(initDroppableClick);
        });
      }
    }
  };

  /*
  Dropdown
  --------
  A basic object containing Knockout.js binding code for custom dropdown menus.
  
  See DropdownSingle and DropdownMulti for example of use.
  */


  Dropdown = {
    update: function(dropdownType, element, valueAccessor) {
      var hasIcons, options, optionsText, selected, _ref;
      _ref = Dropdown.unwrap(valueAccessor), selected = _ref.selected, options = _ref.options, optionsText = _ref.optionsText, hasIcons = _ref.hasIcons;
      dropdownType.setData(element, selected, options, hasIcons, optionsText);
    },
    initElement: function(element, isDropdownVisible, templateName, childTemplate, name) {
      var $element, clickHandler;
      $element = $(element);
      Events.ui.dropdown.shown.onElem($element, function() {
        isDropdownVisible(true);
        $element.addClass('dropdown-active');
        return $element.removeClass('dropdown-inactive');
      });
      Events.ui.dropdown.hidden.onElem($element, function() {
        isDropdownVisible(false);
        $element.removeClass('dropdown-active');
        return $element.addClass('dropdown-inactive');
      });
      clickHandler = function() {
        var optionsData;
        if (isDropdownVisible()) {
          return Events.ui.dropdown.hide.trigger({
            targetDom: $element
          });
        } else {
          optionsData = $element.data("optionsData");
          return Events.ui.dropdown.show.trigger({
            targetDom: $element,
            data: {
              options: optionsData
            },
            templateName: templateName,
            info: {
              name: name
            }
          });
        }
      };
      $element.click(_.throttle(clickHandler));
      $element.addClass('dropdown-inactive');
      ko.applyBindingsToNode(element, childTemplate);
    },
    unwrap: function(valueAccessor) {
      var hasIcons, name, options, optionsText, selected, value;
      value = ko.utils.unwrapObservable(valueAccessor());
      selected = value.selected, options = value.options, optionsText = value.optionsText, hasIcons = value.hasIcons, name = value.name;
      if (ko.isObservable(options)) {
        options = options();
      }
      return {
        selected: selected,
        options: options,
        optionsText: optionsText,
        hasIcons: hasIcons,
        name: name
      };
    }
  };

  /*
  DropdownSingle
  --------------
  This is a variant of the Dropdown object which permits a single entry to be
  selected. The options parameter is to be given as an array of arrays. The inner
  arrays represent name-value pairs:
  
        options = [ ["Name 1", "Value 1"]
                    ["Name 2", "Value 2"]
                    ...
                  ]
  
  For convenience, if one passes in a flat array like
  
        options = [ "Value 1", "Value 2", ... ]
  
  then this will be internally converted to the above form, where both name and
  value take on the value given.
  
  One option that may be specified for DropdownSingle is whether or not each
  option has an icon. This is specified via the option 'hasIcon' whilst declaring
  the template bit. By default, the icon is found via the CSS class
  'img-icon-#{value}'. In the case that a custom name is needed for the icon, a
  third element may be put in the array and that will be used in place of value.
  */


  DropdownSingle = {
    template: 'tmpl-dropdown-single-menu',
    init: function(element, valueAccessor) {
      var childTemplate, hasIcons, isDropdownVisible, name, options, optionsText, selected, _ref;
      _ref = Dropdown.unwrap(valueAccessor), selected = _ref.selected, options = _ref.options, optionsText = _ref.optionsText, hasIcons = _ref.hasIcons, name = _ref.name;
      isDropdownVisible = ko.observable(false);
      childTemplate = {
        template: {
          name: hasIcons ? 'tmpl-dropdown' : 'tmpl-dropdown-no-icon'
        }
      };
      Dropdown.initElement(element, isDropdownVisible, DropdownSingle.template, childTemplate, name);
      selected.subscribe(function() {
        return DropdownSingle.handleDropdownChange(element, selected(), name);
      });
      DropdownSingle.setData(element, selected, options, hasIcons);
      DropdownSingle.handleDropdownChange(element, selected(), name);
    },
    update: function(element, valueAccessor) {
      Dropdown.update(DropdownSingle, element, valueAccessor);
    },
    handleDropdownChange: function(element, selected, name) {
      $('.select-icon', element).attr('class', "select-icon img-icon-" + selected[selected.length - 1]);
      $('.name', element).html(selected[0]);
      Events.ui.dropdown.hide.trigger({
        targetDom: $(element)
      });
      Events.ui.dropdown.choose.trigger({
        info: {
          name: name,
          value: selected[1]
        }
      });
    },
    setData: function(element, selected, options, hasIcons, optionsText) {
      var optionsData,
        _this = this;
      if (optionsText == null) {
        optionsText = function(v) {
          return v;
        };
      }
      if ((options != null) && !_.isArray(options[0])) {
        options = _.zip(options, options);
      }
      optionsData = _.map(options, function(o) {
        if (o.length > 3 || !_.isString(o[0])) {
          throw "DropdownSingle options must be an array of the form [[\"Name 1\", value], [\"Name 2\", value]]";
        }
        return {
          iconClass: hasIcons ? "select-icon img-icon-" + o[o.length - 1] : null,
          text: optionsText(o[0]),
          value: o[1],
          selected: selected,
          handler: function() {
            return selected(o);
          }
        };
      });
      $(element).data("optionsData", optionsData);
    }
  };

  /*
  DropdownMulti
  -------------
  This is a variant of the Dropdown class which allows for easy mutliselect.
  The expected data format for the options is an array of objects with the fields
  'field' and 'value':
  
      options = [ { field: "Name 1", value: "Value 1"}
                  { field: "Name 2", value: "Value 2"}
                  ...
                ]
  For convenience, if the options array is passed in as a flat array of values,
  
      options = ["Value 1", "Value 2", ... ]
  
  then this will be converted to the required for, with both field and value
  taking on the array item.
  */


  DropdownMulti = {
    template: 'tmpl-dropdown-multi-menu',
    init: function(element, valueAccessor) {
      var childTemplate, isDropdownVisible, name, options, optionsText, selected, _ref;
      _ref = Dropdown.unwrap(valueAccessor), selected = _ref.selected, options = _ref.options, optionsText = _ref.optionsText, name = _ref.name;
      isDropdownVisible = ko.observable(false);
      childTemplate = {
        template: {
          name: 'tmpl-dropdown-no-icon'
        }
      };
      Dropdown.initElement(element, isDropdownVisible, DropdownMulti.template, childTemplate, name);
      selected.subscribe(function() {
        return DropdownMulti.handleDropdownChange(element, selected());
      });
      DropdownMulti.setData(element, selected, options, optionsText);
      DropdownMulti.handleDropdownChange(element, selected());
    },
    update: function(element, valueAccessor) {
      Dropdown.update(DropdownMulti, element, valueAccessor);
    },
    handleDropdownChange: function(element, selected) {
      $('.name', element).html(("" + selected.length + " item") + (selected.length === 1 ? " " : "s ") + "selected");
    },
    setData: function(element, selected, options, hasIcon, optionsText) {
      var optionsData;
      if (optionsText == null) {
        optionsText = function(v) {
          return v;
        };
      }
      if ((options[0] != null) && !_.isObject(options[0])) {
        options = _.map(options, function(v) {
          return {
            field: v,
            value: v
          };
        });
      }
      optionsData = _.map(options, function(o) {
        if (!('field' in o) || !('value' in o)) {
          throw "DropdownMulti options must be an array with elements of the form {field: 'Name 1', value: 'Value 1'}";
        }
        return {
          text: optionsText(o.field),
          selected: selected().indexOf(o.value) !== -1,
          handler: function(ele, evt) {
            var idx, _selected;
            _selected = selected();
            idx = _selected.indexOf(o.value);
            if (idx === -1) {
              $(evt.target).closest('.option').addClass('checked');
              _selected.push(o.value);
            } else {
              $(evt.target).closest('.option').removeClass('checked');
              _selected.splice(idx, 1);
            }
            return selected(_selected);
          }
        };
      });
      $(element).data("optionsData", optionsData);
    }
  };

  /*
  pui_contentEditable
  -------------------
  Binding to enable contenteditable elements that play nicely with Knockout. This
  should be bound to an observable containing the text content of the element. The
  user's changes are reflected in the observable, and vice versa. It also has some
  mildly insane logic to play nicely with `pui_jqDraggableResizeable`.
  
  Adapted from
  [a StackOverflow response](http://stackoverflow.com/questions/7904522/knockout-content-editable-custom-binding).
  
  The following "helper" bindings also exist:
    * `pui_placeholder`: `string` *(optional)*
      This binding, if present, defines the placeholder text to be used when the
      element is unselected and has no content.
    * `pui_placeholder_class`: `string` *(optional)*
      This binding, if present, defines a class to be added to the element when
      the placeholder is shown.
    * `pui_draggableSelector`: `string` *(optional)*
      If present, this binding defines a selector that can be used to find an
      ancestor element that is draggable. This is used to make contenteditable
      elements work even when inside a draggable container. The selected container
      is expected to be using the `pui_jqDraggableResizeable` binding.
  */


  pui_contentEditable = {
    init: function(element, valueAccessor, allBindingsAccessor) {
      var $elem, allBindings, draggableSelector, placeholder, placeholderClass, showPlaceholder, value, _onkeyup;
      value = wrap(valueAccessor());
      $elem = $(element);
      $elem.on('keydown', function(evt) {
        var _ref;
        if ((_ref = evt.keyCode) === 13 || _ref === 27) {
          $elem.blur();
          return evt.preventDefault();
        }
      });
      _onkeyup = function() {
        var allBindings, elementValue, modelValue;
        modelValue = valueAccessor();
        elementValue = $elem.text();
        if (ko.isWriteableObservable(modelValue)) {
          return modelValue(elementValue);
        } else {
          allBindings = allBindingsAccessor();
          if (allBindings['_ko_property_writers'] && allBindings['_ko_property_writers'].htmlValue) {
            return allBindings['_ko_property_writers'].htmlValue(elementValue);
          }
        }
      };
      $elem.on('keyup', _.debounce(_onkeyup, 600));
      allBindings = allBindingsAccessor();
      placeholder = wrap(allBindings['pui_placeholder']);
      placeholderClass = wrap(allBindings['pui_placeholder_class']);
      showPlaceholder = ko.observable(!value());
      setTimeout(function() {
        showPlaceholder(!value());
        return ko.computed(function() {
          var phClass;
          phClass = placeholderClass();
          if (phClass) {
            if (showPlaceholder()) {
              $elem.addClass(phClass);
              return $elem.html(placeholder());
            } else {
              $elem.removeClass(phClass);
              return $elem.html(value());
            }
          }
        });
      }, 1);
      draggableSelector = wrap(allBindings['pui_draggableSelector']);
      $elem.on('mouseover', function() {
        return $elem.addClass('hover');
      });
      $elem.on('mouseout', function() {
        return $elem.removeClass('hover');
      });
      $elem.on('click', function(evt) {
        if (draggableSelector() != null) {
          if ($elem.closest(draggableSelector()).data('pui-was-dragged')) {
            $elem.closest(draggableSelector()).data('pui-was-dragged', false);
            return;
          }
        }
        showPlaceholder(false);
        if (!value()) {
          setTimeout(function() {
            $elem.setCaret(0);
            return $elem.trigger('focus');
          }, 1);
        } else if (!$elem.data('pui-has-focus')) {
          $elem.trigger('focus');
          $elem.setCaretFromPoint(evt.pageX, evt.pageY);
          $elem.data('pui-has-focus', true);
        }
        if (draggableSelector() != null) {
          return $elem.closest(draggableSelector()).draggable({
            cancel: '*'
          });
        }
      });
      return $elem.on('blur', function() {
        value($elem.html());
        $elem.data('pui-has-focus', false);
        if (!value()) {
          showPlaceholder(true);
        }
        if (draggableSelector() != null) {
          return $elem.closest(draggableSelector()).draggable({
            cancel: null
          });
        }
      });
    },
    update: function(element, valueAccessor, allBindingsAccessor) {
      var allBindings, value;
      value = unwrap(valueAccessor()) || '';
      if (element.innerHTML !== value) {
        element.innerHTML = value;
        return allBindings = allBindingsAccessor();
      }
    }
  };

  /*
  SlickgridData
  -------------
  This binding is used to create and automatically update a SlickGrid table using
  observable values. Two other "helper" bindings are also used:
  `SlickgridColumns`, and `SlickgridHeaderTmpl`. Each of these bindings may be
  given either a raw value or a Knockout observable.
  
  The `SlickgridColumns` binding should be an array of objects representing some
  properties of each column in the grid. These objects should contain two
  fields: a `name` property, and a `field` property. Their values should be
  strings, and may be wrapped in Knockout observables. `name` typically provides
  the displayed column name, while `field` is used to index the column internally.
  The column's `field` should be unique among all columns in this grid. Note that
  while updating an observable `field` will cause the relevant sections of the
  grid to re-render, `name` is explicitly not subscribed to and will not trigger a
  re-render when changed. This permits custom headers to make the column name
  editable without causing racy behaviour.
  
  The `SlickgridHeaderTmpl` binding is optional. If provided, it should be a
  string giving the name of a Knockout template to be rendered in each header cell
  instead of the default SlickGrid header. The model object for each cell will be
  the column object for that column (as given by the `SlickgridColumns` binding).
  There are no restrictions on the fields and methods that a column object may
  provide, apart from the required `name` and `field` properties.
  
  The `SlickgridData` binding should be an array of objects. Each object
  represents one row in the grid, and should contain one property for each column
  (corresponding to the `field` property of that column).
  
  Caveats of working with this binding:
    * The `SlickgridColumns` binding, if provided from a template, must be
      directly observable. It cannot be implicitly computed, as in the form
      `SlickgridColumns: myObservable().columns`, because it is not evaluated in
      a computed wrapper. Instead, the computed should be explicitly defined in
      the column model.
    * The `SlickgridHeaderTmpl` binding is not currently subscribed to, if it is
      an observable (explicit or implicit).
  */


  SlickgridData = {
    init: function(element, valueAccessor, allBindingsAccessor) {
      var allBindings, columnData, columns, data, headerTmpl, slickGrid;
      data = unwrap(valueAccessor());
      allBindings = allBindingsAccessor();
      columns = allBindings.SlickgridColumns;
      columnData = ko.computed(function() {
        var col, idx, _i, _len, _ref, _results;
        _ref = unwrap(columns);
        _results = [];
        for (idx = _i = 0, _len = _ref.length; _i < _len; idx = ++_i) {
          col = _ref[idx];
          _results.push({
            name: peek(col.name),
            field: unwrap(col.field),
            id: idx
          });
        }
        return _results;
      });
      headerTmpl = unwrap(allBindings.SlickgridHeaderTmpl);
      slickGrid = new Slick.Grid(element, data, columnData(), {
        enableCellNavigation: true,
        enableColumnReorder: false
      });
      if (headerTmpl != null) {
        slickGrid.onHeaderCellRendered.subscribe(function(e, _arg) {
          var headerDiv, id, node, _ref;
          node = _arg.node, (_ref = _arg.column, id = _ref.id);
          headerDiv = $("<div>");
          ko.applyBindingsToNode(headerDiv[0], {
            template: {
              name: headerTmpl
            }
          }, (unwrap(columns))[id]);
          return $(node).empty().append(headerDiv);
        });
      }
      columnData.subscribe(function(val) {
        slickGrid.setColumns(val);
        return slickGrid.invalidate();
      });
      return $(element).data('grid', slickGrid);
    },
    update: function(element, valueAccessor, allBindingsAccessor) {
      var data, slickGrid;
      data = unwrap(valueAccessor());
      slickGrid = $(element).data('grid');
      slickGrid.setData(data, true);
      return slickGrid.invalidate();
    }
  };

  /*
  pui_jqDraggableResizeable
  -------------------------
  This binding uses jQueryUI's draggable and resizeable bindings to make charts
  and other dashboard items interactive. It also contains some logic to work
  better with `pui_contentEditable` items. The combined behaviour is a reasonable
  combination: if the user clicks and drags, the item is dragged around. If he or
  she clicks without dragging, the cursor is placed in the editable area as
  normal. The logic to do this is... somewhat less reasonable.
  
  This binding should be bound to a configuration object, optionally wrapped in a
  Knockout observable. The configuration options are as follows:
    * `gridSize`: `number`
      The size of one square on the drag/resize grid, in pixels. Defaults to `1`.
    * `minWidth`, `minHeight`: `number` *(optional)*
      The minimum width and height, in grid units, of this element. Both default
      to `1`.
    * `gridTop`, `gridLeft`, `gridWidth`, `gridHeight`: `ko.observable(number)`
      Observables describing the position of this object in grid units. The values
      will be updated automatically as the user drags the element around. They
      will not be watched for changes after initialization.
    * `isDragging`, `isResizing`: `ko.observable(bool)` *(optional)*
      Observable flags for whether or not the current element is being dragged or
      resized. The flags are automatically set and unset as the user interacts.
      They will not be watched for changes after initialization.
    * `dragEnabled`, `resizeEnabled`: `ko.observable(bool)` *(optional)*
      Observable flags for whether or not the user may drag or resize this item.
  */


  pui_jqDraggableResizeable = {
    init: function(element, valueAccessor) {
      var $dom, dragEnabled, gridHeight, gridLeft, gridSize, gridTop, gridWidth, isDragging, isResizing, minHeight, minWidth, params, resizeEnabled, _ref, _ref1, _ref2,
        _this = this;
      params = unwrap(valueAccessor());
      gridSize = params.gridSize, minWidth = params.minWidth, minHeight = params.minHeight, gridTop = params.gridTop, gridLeft = params.gridLeft, gridWidth = params.gridWidth, gridHeight = params.gridHeight, isDragging = params.isDragging, isResizing = params.isResizing, dragEnabled = params.dragEnabled, resizeEnabled = params.resizeEnabled;
      gridSize = (_ref = unwrap(gridSize)) != null ? _ref : 1;
      minWidth = (_ref1 = unwrap(minWidth)) != null ? _ref1 : 1;
      minHeight = (_ref2 = unwrap(minHeight)) != null ? _ref2 : 1;
      isDragging || (isDragging = function() {});
      isResizing || (isResizing = function() {});
      $dom = $(element);
      $dom.css({
        top: gridSize * gridTop(),
        left: gridSize * gridLeft()
      });
      $dom.width(gridSize * gridWidth());
      $dom.height(gridSize * gridHeight());
      $dom.draggable({
        disabled: !(typeof dragEnabled === "function" ? dragEnabled() : void 0),
        grid: [gridSize, gridSize],
        start: function() {
          return isDragging(true);
        },
        stop: function() {
          var domLeft, domTop, gLeft, gTop, _ref3,
            _this = this;
          isDragging(false);
          _ref3 = $dom.position(), domTop = _ref3.top, domLeft = _ref3.left;
          gTop = Math.max(Math.ceil(domTop / gridSize), 0);
          gLeft = Math.max(Math.ceil(domLeft / gridSize), 0);
          $dom.css({
            top: gridSize * gTop,
            left: gridSize * gLeft
          });
          gridTop(gTop);
          gridLeft(gLeft);
          $dom.data('pui-was-dragged', true);
          return setTimeout(function() {
            $dom.blur();
            if (window.getSelection) {
              window.getSelection().removeAllRanges();
            } else if (document.selection) {
              document.selection.empty();
            }
            return $dom.data('pui-was-dragged', false);
          }, 1);
        }
      });
      $dom.resizable({
        disabled: !(typeof resizeEnabled === "function" ? resizeEnabled() : void 0),
        grid: gridSize,
        minWidth: minWidth * gridSize,
        minHeight: minHeight * gridSize,
        start: function() {
          return isResizing(true);
        },
        stop: function() {
          var gHeight, gWidth;
          isResizing(false);
          gWidth = Math.max(Math.ceil($dom.width() / gridSize), minWidth);
          gHeight = Math.max(Math.ceil($dom.height() / gridSize), minHeight);
          $dom.width(gWidth * gridSize);
          $dom.height(gHeight * gridSize);
          if (typeof gridWidth === "function") {
            gridWidth(gWidth);
          }
          return typeof gridHeight === "function" ? gridHeight(gHeight) : void 0;
        }
      });
      if (dragEnabled != null) {
        if (typeof dragEnabled.subscribe === "function") {
          dragEnabled.subscribe(function() {
            return $dom.draggable('option', 'disabled', !dragEnabled());
          });
        }
      }
      return resizeEnabled != null ? typeof resizeEnabled.subscribe === "function" ? resizeEnabled.subscribe(function() {
        return $dom.resizable('option', 'disabled', !resizeEnabled());
      }) : void 0 : void 0;
    }
  };

  _registeredBindings = {};

  register = function(bindings) {
    return _.extend(_registeredBindings, bindings);
  };

  init = function() {
    return _.extend(ko.bindingHandlers, _registeredBindings);
  };

  register({
    pui_dndContainer: pui_dndContainer,
    pui_contentEditable: pui_contentEditable,
    pui_jqDraggableResizeable: pui_jqDraggableResizeable,
    SlickgridData: SlickgridData,
    DropdownSingle: DropdownSingle,
    DropdownMulti: DropdownMulti
  });

  module.exports = {
    init: init,
    register: register
  };

}).call(this);
}, "poly/main/builder": function(exports, require, module) {/*
# Class defining the qualities shared by the Chartbuilder, Tablebuilder, and
# Numeralbuilder.
*/


(function() {
  var Builder, EDIT_BOX_PADDING, Events, TOAST,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Events = require('poly/main/events');

  TOAST = require('poly/main/error/toast');

  EDIT_BOX_PADDING = 3;

  Builder = (function() {
    function Builder(tableMetaData) {
      this.tableMetaData = tableMetaData;
      this._addEventListener = __bind(this._addEventListener, this);
      this.initDom = __bind(this.initDom, this);
      this.loaded = __bind(this.loaded, this);
      this.serialize = __bind(this.serialize, this);
      this.backToDashboard = __bind(this.backToDashboard, this);
      this.backButtonVisible = ko.observable(true);
      this.render = _.debounce(this._render, 300);
      Events.ui.chart.render.on(this.render);
    }

    Builder.prototype.backToDashboard = function(event) {
      return Events.ui.backtodbb.click.trigger({
        from: this.item
      });
    };

    Builder.prototype.serialize = function() {
      var spec;
      spec = $.extend(true, {}, this.spec);
      delete spec.dom;
      delete spec.data;
      return spec;
    };

    Builder.prototype.loaded = function(err) {
      if (err) {
        console.error(err);
        TOAST.raise(err.message);
        return this.loadingAnim.stopOnImage('/static/main/images/broken_chart.svg');
      } else {
        return this.loadingAnim.remove();
      }
    };

    Builder.prototype.initDom = function(dom) {
      this.dom = $(dom)[0];
      this._addListeners();
      return this.render();
    };

    Builder.prototype._addEventListener = function(type, handler) {
      return this.dom.addEventListener(type, handler, false);
    };

    Builder.prototype._editTitle = function(e, title, rotated) {
      var domOffset, editBox, key, obj, titleBBox, val, _ref;
      if (rotated == null) {
        rotated = false;
      }
      obj = e.detail.data;
      editBox = $("<div contenteditable='true'>" + obj.node.textContent + "</div>");
      $(this.dom).append(editBox);
      obj.hide();
      _ref = obj.attrs;
      for (key in _ref) {
        val = _ref[key];
        editBox.css(key, val);
      }
      titleBBox = e.detail.data.getBBox();
      domOffset = $(this.dom).offset();
      editBox.css({
        left: domOffset.left + titleBBox.x - EDIT_BOX_PADDING,
        top: domOffset.top + titleBBox.y - EDIT_BOX_PADDING,
        position: 'fixed',
        'z-index': 9999999,
        padding: "" + EDIT_BOX_PADDING + "px"
      });
      if (rotated) {
        editBox.addClass("rotated");
        editBox.css({
          top: domOffset.top + titleBBox.y + editBox.width() + EDIT_BOX_PADDING
        });
      }
      editBox.on('keydown', function(evt) {
        var _ref1;
        if ((_ref1 = evt.keyCode) === 13 || _ref1 === 27) {
          editBox.blur();
          return evt.preventDefault();
        }
      });
      editBox.on('focus', function() {
        var range, sel;
        range = document.createRange();
        range.selectNodeContents(editBox[0]);
        sel = window.getSelection();
        sel.removeAllRanges();
        return sel.addRange(range);
      });
      editBox.on('blur', function(evt) {
        var brIndex, newTitle;
        newTitle = editBox.html();
        brIndex = newTitle.indexOf("<br>");
        if (brIndex !== -1) {
          newTitle = newTitle.slice(0, brIndex);
        }
        if (newTitle === "") {
          newTitle = null;
        }
        title(newTitle);
        if (newTitle !== null) {
          Events.ui.title.add.trigger();
          obj.attr({
            text: newTitle
          });
          obj.show();
        }
        return editBox.remove();
      });
      editBox.focus();
    };

    Builder.prototype._addTitleGlow = function(jsObj) {
      if (jsObj == null) {
        return;
      }
      jsObj.addHandler(function(type, obj, evt, graph) {
        if (type === 'tover' || type === 'gover' && obj.type === 'text' && (obj.evtData != null)) {
          obj.shadow = obj.clone().attr({
            fill: 'steelblue',
            opacity: 0.7
          }).insertBefore(obj);
          obj.shadow.blur(1);
          return obj.attr({
            cursor: 'transform' in obj.attrs ? 'vertical-text' : 'text'
          });
        } else if (type === 'tout' || type === 'gout' && obj.type === 'text' && (obj.evtData != null)) {
          return obj.shadow.remove();
        }
      });
    };

    Builder.prototype._addListeners = function() {};

    return Builder;

  })();

  module.exports = Builder;

}).call(this);
}, "poly/main/chart/advancedPanel": function(exports, require, module) {(function() {
  var AdvancedPanelView, CONST, CoordView, DND, Events, FacetMetricView, FacetView, Parser,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Events = require('poly/main/events');

  FacetMetricView = require('poly/main/data/metric/facet');

  Parser = require('poly/main/parser');

  DND = require('poly/main/dnd');

  CONST = require('poly/main/const');

  AdvancedPanelView = (function() {
    function AdvancedPanelView(tableMetaData) {
      this.tableMetaData = tableMetaData;
      this.expanded = ko.observable(false);
      this.facetView = new FacetView(this.tableMetaData);
      this.coordView = new CoordView();
    }

    return AdvancedPanelView;

  })();

  FacetView = (function() {
    function FacetView(tableMetaData) {
      this.tableMetaData = tableMetaData;
      this.reset = __bind(this.reset, this);
      this.initMetricItem = __bind(this.initMetricItem, this);
      this.generateMeta = __bind(this.generateMeta, this);
      this.generateSpec = __bind(this.generateSpec, this);
      this.onMetricDiscard = __bind(this.onMetricDiscard, this);
      this.onMetricEnter = __bind(this.onMetricEnter, this);
      this.metric = ko.observable();
    }

    FacetView.prototype.metricTemplate = 'tmpl-metric-attached';

    FacetView.prototype.onMetricEnter = function(event, item) {
      var m;
      if (this.metric()) {
        this.metric().close();
      }
      m = new FacetMetricView(item.data);
      this.metric(m);
      return Events.ui.chart.render.trigger();
    };

    FacetView.prototype.onMetricDiscard = function() {
      this.metric().close();
      this.metric(null);
      return Events.ui.chart.render.trigger();
    };

    FacetView.prototype.generateSpec = function() {
      if (this.metric()) {
        return {
          type: 'wrap',
          "var": this.metric().generateSpec(),
          tableName: this.metric().tableName
        };
      } else {
        return {};
      }
    };

    FacetView.prototype.generateMeta = function() {
      var m, meta;
      meta = {};
      if (m = this.metric()) {
        meta[m.fullFormula(this.tableMetaData, true)] = _.extend(m.fullMeta(), {
          dsKey: this.tableMetaData.dsKey
        });
      }
      return meta;
    };

    FacetView.prototype.initMetricItem = function(dom, view) {
      DND.makeDraggable(dom, view);
      return view.attachDropdown(dom);
    };

    FacetView.prototype.reset = function(spec) {
      var columnInfo, m, name, params;
      if (spec["var"] && spec.tableName) {
        name = Parser.getName(spec["var"]);
        params = {
          name: name,
          tableName: spec.tableName
        };
        columnInfo = this.tableMetaData.getColumnInfo(params);
        m = new FacetMetricView(columnInfo);
        return this.metric(m);
      } else {
        if (this.metric()) {
          this.metric().close();
        }
        return this.metric(null);
      }
    };

    return FacetView;

  })();

  CoordView = (function() {
    function CoordView() {
      this.flipClick = __bind(this.flipClick, this);
      this.generateSpec = __bind(this.generateSpec, this);
      this.reset = __bind(this.reset, this);
      var _this = this;
      this.flip = ko.observable(false);
      this.flip.subscribe(function() {
        return Events.ui.chart.render.trigger('flip');
      });
    }

    CoordView.prototype.reset = function(spec) {
      return this.flip(!!spec.flip);
    };

    CoordView.prototype.generateSpec = function() {
      return {
        flip: this.flip()
      };
    };

    CoordView.prototype.flipClick = function() {
      return this.flip(!this.flip());
    };

    return CoordView;

  })();

  module.exports = AdvancedPanelView;

}).call(this);
}, "poly/main/chart/aes/base": function(exports, require, module) {(function() {
  var Aesthetic, CONST, DND, Events, LayerMetricView, Parser, TOAST,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Events = require('poly/main/events');

  LayerMetricView = require('poly/main/data/metric/layer');

  Parser = require('poly/main/parser');

  CONST = require('poly/main/const');

  DND = require('poly/main/dnd');

  TOAST = require('poly/main/error/toast');

  Aesthetic = (function() {
    Aesthetic.prototype.template = 'tmpl-aesthetic';

    Aesthetic.prototype.metricTemplate = 'tmpl-metric-attached';

    function Aesthetic(aes, name, layer) {
      var _this = this;
      this.aes = aes;
      this.name = name;
      this.layer = layer;
      this.enable = __bind(this.enable, this);
      this.disable = __bind(this.disable, this);
      this.render = __bind(this.render, this);
      this.layerTypeUpdated = __bind(this.layerTypeUpdated, this);
      this.initMetricItem = __bind(this.initMetricItem, this);
      this.onMetricDiscard = __bind(this.onMetricDiscard, this);
      this._actualMetricEnter = __bind(this._actualMetricEnter, this);
      this.onMetricEnter = __bind(this.onMetricEnter, this);
      this._getConstant = __bind(this._getConstant, this);
      this._setConstant = __bind(this._setConstant, this);
      this.generateSpec = __bind(this.generateSpec, this);
      this.init = __bind(this.init, this);
      this.metric = ko.observable(null);
      this.metric.subscribe(function(m) {
        return Events.ui.metric.remove.onElem(m, _this.onMetricDiscard);
      });
      this.options = ko.computed(function() {
        return _this.layer.layerRestrictions()[_this.aes];
      });
      this.options.subscribe(this.layerTypeUpdated);
      this.enabled = ko.observable(true);
    }

    Aesthetic.prototype.init = function(spec, tableName) {
      var columnInfo, defaults, metric, name;
      if (spec == null) {
        spec = {};
      }
      if (spec["var"] && tableName) {
        name = Parser.getName(spec);
        defaults = {
          sort: spec.sort,
          asc: spec.asc,
          bin: Parser.getBinwidth(spec),
          stats: CONST.stats.statToName[Parser.getStats(spec)]
        };
        columnInfo = this.layer.tableMetaData.getColumnInfo({
          name: name,
          tableName: tableName
        });
        metric = new LayerMetricView(columnInfo, this.options, this.layer, this.name(), defaults);
        return this.metric(metric);
      } else if (spec["const"]) {
        return this._setConstant(spec);
      }
    };

    Aesthetic.prototype.generateSpec = function() {
      if (this.metric()) {
        return this.metric().generateSpec(this.layer.tableMetaData);
      } else {
        return this._getConstant();
      }
    };

    Aesthetic.prototype._setConstant = function(spec) {};

    Aesthetic.prototype._getConstant = function() {
      return null;
    };

    Aesthetic.prototype.onMetricEnter = function(event, item) {
      var acceptableTypes, _ref,
        _this = this;
      acceptableTypes = this.options().type;
      if (!(_ref = item.data.meta.type, __indexOf.call(acceptableTypes, _ref) >= 0)) {
        TOAST.raise("Data type is not one of the acceptable types!");
        return;
      }
      return this.layer.checkNewMetric(event, item, function() {
        return _this._actualMetricEnter(event, item);
      });
    };

    Aesthetic.prototype._actualMetricEnter = function(event, item) {
      var m;
      if (this.metric()) {
        this.metric().close();
      }
      m = new LayerMetricView(item.data, this.options, this.layer, this.name());
      this.metric(m);
      Events.ui.metric.add.trigger();
      return this.render();
    };

    Aesthetic.prototype.onMetricDiscard = function(event, metricItem) {
      this.metric().close();
      this.metric(null);
      this.layer.checkRemoveMetric(event, metricItem);
      return this.render();
    };

    Aesthetic.prototype.initMetricItem = function(dom, view) {
      DND.makeDraggable(dom, view);
      return view.attachDropdown(dom);
    };

    Aesthetic.prototype.layerTypeUpdated = function() {
      var acceptableTypes, _ref;
      if (!this.metric()) {
        return;
      }
      acceptableTypes = this.options().type;
      if (!(_ref = this.metric().type, __indexOf.call(acceptableTypes, _ref) >= 0)) {
        return this.metric(null);
      }
    };

    Aesthetic.prototype.render = function() {
      return Events.ui.chart.render.trigger();
    };

    Aesthetic.prototype.afterRender = function(dom) {};

    Aesthetic.prototype.disable = function() {
      return this.enabled(false);
    };

    Aesthetic.prototype.enable = function() {
      return this.enabled(true);
    };

    Aesthetic.prototype.dropFilter = function() {
      return true;
    };

    return Aesthetic;

  })();

  module.exports = Aesthetic;

}).call(this);
}, "poly/main/chart/aes/color": function(exports, require, module) {(function() {
  var Aesthetic, ColorAesthetic,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Aesthetic = require('poly/main/chart/aes/base');

  ColorAesthetic = (function(_super) {
    __extends(ColorAesthetic, _super);

    ColorAesthetic.prototype.template = 'tmpl-aesthetic-color';

    function ColorAesthetic(aes, name, parent) {
      this.aes = aes;
      this.name = name;
      this.parent = parent;
      this._getConstant = __bind(this._getConstant, this);
      this._setConstant = __bind(this._setConstant, this);
      this.afterRender = __bind(this.afterRender, this);
      this.onMetricDiscard = __bind(this.onMetricDiscard, this);
      ColorAesthetic.__super__.constructor.call(this, this.aes, this.name, this.parent);
      this.selected = 'steelblue';
      this.defaultValue = 'steelblue';
      this.value = ko.observable(this.defaultValue);
      this.value.subscribe(this.render);
    }

    ColorAesthetic.prototype.onMetricDiscard = function(event, metricItem) {
      this.metric(null);
      this.render();
      return this.afterRender(this.dom);
    };

    ColorAesthetic.prototype.afterRender = function(dom) {
      var simpleColor,
        _this = this;
      this.dom = dom;
      simpleColor = $('.selector', dom);
      simpleColor.attr('value', this.value());
      simpleColor.simpleColor({
        cellWidth: 15,
        cellHeight: 15,
        boxWidth: 50,
        boxHeight: 15,
        border: 0,
        columns: 9
      });
      simpleColor.bind('change', function(evt) {
        return _this.value(evt.target.value);
      });
      return $(".simpleColorContainer", dom).click(function() {
        return false;
      });
    };

    ColorAesthetic.prototype._setConstant = function(spec) {
      if (spec["const"]) {
        return this.value(spec["const"]);
      }
    };

    ColorAesthetic.prototype._getConstant = function() {
      return {
        "const": this.value()
      };
    };

    return ColorAesthetic;

  })(Aesthetic);

  module.exports = ColorAesthetic;

}).call(this);
}, "poly/main/chart/aes/size": function(exports, require, module) {(function() {
  var Aesthetic, SizeAesthetic,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Aesthetic = require('poly/main/chart/aes/base');

  SizeAesthetic = (function(_super) {
    __extends(SizeAesthetic, _super);

    SizeAesthetic.prototype.template = 'tmpl-aesthetic-size';

    function SizeAesthetic(aes, name, parent) {
      this.aes = aes;
      this.name = name;
      this.parent = parent;
      this._getConstant = __bind(this._getConstant, this);
      this._setConstant = __bind(this._setConstant, this);
      this.afterRender = __bind(this.afterRender, this);
      this.onMetricDiscard = __bind(this.onMetricDiscard, this);
      SizeAesthetic.__super__.constructor.call(this, this.aes, this.name, this.parent);
      this.selected = 1;
      this.defaultValue = 2;
      this.value = ko.observable(this.defaultValue);
      this.value.subscribe(this.render);
    }

    SizeAesthetic.prototype.onMetricDiscard = function(event, metricItem) {
      this.metric(null);
      this.render();
      return this.afterRender(this.dom);
    };

    SizeAesthetic.prototype.afterRender = function(dom) {
      var slider,
        _this = this;
      this.dom = dom;
      slider = $('.selector', dom);
      slider.slider({
        max: 10,
        min: 1,
        step: 1,
        value: this.value()
      });
      return slider.bind('slidechange', function(evt, ui) {
        return _this.value(ui.value);
      });
    };

    SizeAesthetic.prototype._setConstant = function(spec) {
      if (spec["const"]) {
        return this.value(spec["const"]);
      }
    };

    SizeAesthetic.prototype._getConstant = function() {
      return {
        "const": this.value()
      };
    };

    return SizeAesthetic;

  })(Aesthetic);

  module.exports = SizeAesthetic;

}).call(this);
}, "poly/main/chart/chartbuilder": function(exports, require, module) {/*
# Construciton of the Chart Builder.
*/


(function() {
  var AdvancedPanelView, Animation, Builder, ChartbuilderView, Events, LayerView, Parser, TOAST,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  AdvancedPanelView = require('poly/main/chart/advancedPanel');

  Animation = require('poly/main/anim');

  Builder = require('poly/main/builder');

  Events = require('poly/main/events');

  LayerView = require('poly/main/chart/layer');

  Parser = require('poly/main/parser');

  TOAST = require('poly/main/error/toast');

  ChartbuilderView = (function(_super) {
    __extends(ChartbuilderView, _super);

    ChartbuilderView.prototype.item = 'chart';

    function ChartbuilderView(tableMetaData) {
      var _chartRender,
        _this = this;
      this.tableMetaData = tableMetaData;
      this._addListeners = __bind(this._addListeners, this);
      this._render = __bind(this._render, this);
      this.disableLayerDraggables = __bind(this.disableLayerDraggables, this);
      this.enableLayerDraggables = __bind(this.enableLayerDraggables, this);
      this.removeLayer = __bind(this.removeLayer, this);
      this.addLayer = __bind(this.addLayer, this);
      ChartbuilderView.__super__.constructor.call(this, this.tableMetaData);
      this.advancedPanel = new AdvancedPanelView(this.tableMetaData);
      this.layers = ko.observableArray();
      this.polar = ko.observable(false);
      this.title = ko.observable("Untitled Chart");
      this.vLabel = ko.observable();
      this.hLabel = ko.observable();
      this.guides = ko.observable({});
      _chartRender = function() {
        return Events.ui.chart.render.trigger();
      };
      this.title.subscribe(_chartRender);
      this.hLabel.subscribe(_chartRender);
      this.vLabel.subscribe(_chartRender);
      this.backButtonVisible = ko.observable(true);
      Events.ui.quickadd.expand.onElem(this.advancedPanel, this.disableLayerDraggables);
      Events.ui.quickadd.collapse.onElem(this.advancedPanel, this.enableLayerDraggables);
      this.addLayer();
    }

    ChartbuilderView.prototype.reset = function(params) {
      var coord, facet, layerspec, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7;
      this.params = params != null ? params : {};
      this.spec = (_ref = this.params.spec) != null ? _ref : {};
      coord = (_ref1 = this.spec.coord) != null ? _ref1 : {};
      this.polar(coord.type === 'polar');
      this.advancedPanel.coordView.reset(coord);
      layerspec = (this.spec.layers != null) && _.isArray(this.spec.layers) ? this.spec.layers : this.spec.layer != null ? [this.spec.layer] : [];
      this.layers.removeAll();
      if (_.isArray(layerspec) && layerspec.length > 0) {
        _.each(layerspec, this.addLayer);
      } else {
        this.addLayer();
      }
      facet = (_ref2 = this.spec.facet) != null ? _ref2 : {};
      this.advancedPanel.facetView.reset(facet);
      this.title(this.spec.title);
      if (this.spec.guides != null) {
        this.guides((_ref3 = this.spec.guides) != null ? _ref3 : {});
        if (coord.flip) {
          this.vLabel((_ref4 = this.spec.guides.x) != null ? _ref4.title : void 0);
          return this.hLabel((_ref5 = this.spec.guides.y) != null ? _ref5.title : void 0);
        } else {
          this.vLabel((_ref6 = this.spec.guides.y) != null ? _ref6.title : void 0);
          return this.hLabel((_ref7 = this.spec.guides.x) != null ? _ref7.title : void 0);
        }
      } else {
        this.vLabel(null);
        return this.hLabel(null);
      }
    };

    ChartbuilderView.prototype.addLayer = function(spec) {
      var newLayer, tmp,
        _this = this;
      if (spec == null) {
        spec = {};
      }
      tmp = _.clone(spec);
      tmp._added = this.layers().length;
      tmp._depth = ko.computed((function(tmp) {
        return function() {
          var i, layer, _i, _len, _ref;
          _ref = _this.layers();
          for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
            layer = _ref[i];
            if (_.isEqual(tmp._added, layer.layerspec()._added)) {
              return i;
            }
          }
          return -1;
        };
      })(tmp));
      newLayer = new LayerView(this.tableMetaData, tmp, this.polar);
      this.layers.push(newLayer);
      return Events.ui.layer.remove.onElem(newLayer, function(event, params) {
        var layer;
        layer = params.layer;
        return _this.removeLayer(layer);
      });
    };

    ChartbuilderView.prototype.removeLayer = function(layer) {
      this.layers.remove(layer);
      return this.render();
    };

    ChartbuilderView.prototype.enableLayerDraggables = function() {
      var _this = this;
      _.each(this.layers(), function(layer) {
        return layer.enable();
      });
    };

    ChartbuilderView.prototype.disableLayerDraggables = function() {
      var _this = this;
      _.each(this.layers(), function(layer) {
        return layer.disable();
      });
    };

    ChartbuilderView.prototype.serialize = function() {
      var layers, spec, _i, _len, _ref;
      spec = $.extend(true, {}, this.spec);
      delete spec.dom;
      delete spec.data;
      if (spec.layer) {
        delete spec.layer.data;
      }
      if (spec.layers) {
        _ref = spec.layers;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          layers = _ref[_i];
          delete layers.data;
          delete layers._added;
          delete layers._depth;
        }
      }
      return spec;
    };

    ChartbuilderView.prototype._render = function(event, params) {
      var $dom, c, coord, error, facet, getName, guides, h, key, l, layer, layers, spec, tmp, val, w, x, y, _i, _len, _ref, _ref1, _ref2;
      $dom = $(this.dom);
      w = $dom.parent().width();
      h = $dom.parent().height();
      $dom.empty();
      layers = [];
      _ref = this.layers();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        layer = _ref[_i];
        tmp = layer.generateSpec();
        if (!_.isEmpty(tmp)) {
          tmp.meta = _.extend(tmp.meta, this.advancedPanel.facetView.generateMeta());
          layers.push(tmp);
        }
      }
      coord = _.extend(this.advancedPanel.coordView.generateSpec(), {
        type: (this.polar() ? 'polar' : 'cartesian')
      });
      facet = this.advancedPanel.facetView.generateSpec();
      if (params === 'flip') {
        tmp = this.hLabel();
        this.hLabel(this.vLabel());
        this.vLabel(tmp);
      }
      guides = this.guides();
      if ((params != null ? params.guides : void 0) && params.guides !== {}) {
        this.guides(_.extend(guides, params.guides));
      } else if (coord.type === 'polar') {
        x = {
          position: 'none',
          padding: 0
        };
        y = {
          position: 'none',
          padding: 0
        };
        if (coord.flip) {
          _ref1 = [this.vLabel(), this.hLabel()], x.title = _ref1[0], y.title = _ref1[1];
        } else {
          _ref2 = [this.hLabel(), this.vLabel()], x.title = _ref2[0], y.title = _ref2[1];
        }
        guides = _.extend(guides, {
          x: x,
          y: y
        });
        this.guides(guides);
      } else if (coord.flip) {
        guides = _.extend(guides, {
          x: {
            title: this.vLabel()
          },
          y: {
            title: this.hLabel()
          }
        });
        this.guides(guides);
      } else {
        guides = _.extend(guides, {
          x: {
            title: this.hLabel()
          },
          y: {
            title: this.vLabel()
          }
        });
        this.guides(guides);
      }
      guides = this.guides();
      for (key in guides) {
        val = guides[key];
        if (val.title == null) {
          delete guides[key].title;
        }
      }
      this.guides(guides);
      if (layers.length > 0) {
        this.spec = {
          layers: layers,
          coord: coord,
          guides: this.guides(),
          facet: facet,
          dom: this.dom,
          width: w,
          height: h,
          title: this.title(),
          zoom: false
        };
        spec = $.extend(true, {}, this.spec);
        if (spec.title == null) {
          getName = function(v) {
            if (v != null) {
              return "" + (Parser.getName(v));
            } else {
              return "";
            }
          };
          l = layers[0];
          if ((coord != null ? coord.type : void 0) === 'polar' && (l.color != null)) {
            spec.title = "" + (getName(l.y)) + " by " + (getName(l.color));
          } else {
            spec.title = "" + (getName(l.y)) + " by " + (getName(l.x));
          }
        }
        if (this.loadingAnim) {
          this.loadingAnim.remove();
        }
        this.loadingAnim = new Animation('loading', $dom.parent());
        try {
          c = polyjs.chart(spec, this.loaded);
          return this._addTitleGlow(c);
        } catch (_error) {
          error = _error;
          return TOAST.raise(error.message);
        }
      }
    };

    ChartbuilderView.prototype._addListeners = function(dom) {
      var _this = this;
      this._addEventListener('title-click', function(e) {
        var rotated, titleHolder, _ref;
        _ref = (function() {
          switch (e.detail.type) {
            case 'guide-title':
              return [this.title, false];
            case 'guide-titleH':
              return [this.hLabel, false];
            case 'guide-titleV':
              return [this.vLabel, true];
          }
        }).call(_this), titleHolder = _ref[0], rotated = _ref[1];
        return _this._editTitle(e, titleHolder, rotated);
      });
      return this._addEventListener('legend-click', function(e) {
        var legendHolder;
        legendHolder = ko.observable();
        legendHolder.subscribe(function(newName) {
          var data, guides, key, obj, _name, _name1, _ref;
          guides = _this.guides();
          obj = e.detail.data;
          if (e.detail.type === 'legend-label') {
            _ref = obj.evtData;
            for (key in _ref) {
              data = _ref[key];
              if (guides[_name = data.aes] == null) {
                guides[_name] = {
                  labels: {}
                };
              }
              guides[data.aes].labels[data.value] = newName;
            }
          } else if (e.detail.type === 'legend-title') {
            if (guides[_name1 = obj.evtData.aes] == null) {
              guides[_name1] = {
                labels: {}
              };
            }
            guides[obj.evtData.aes].title = newName;
          }
          _this.guides(guides);
          return _this.render();
        });
        return _this._editTitle(e, legendHolder, false);
      });
    };

    return ChartbuilderView;

  })(Builder);

  module.exports = ChartbuilderView;

}).call(this);
}, "poly/main/chart/filters": function(exports, require, module) {(function() {
  var CONST, DATE_FUNCTIONS, DND, DropdownMetricView, Events, Filter, FiltersView, MIL_PER_SEC, MINIMUM_MIL, Parser, SEC_PER_DAY, SLIDER_DOM_SELECTOR, TOAST, range, timeDelta, _i, _len, _ref, _ref1,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  DropdownMetricView = require('poly/main/data/metric/dropdown');

  Events = require('poly/main/events');

  Parser = require('poly/main/parser');

  CONST = require('poly/main/const');

  DND = require('poly/main/dnd');

  TOAST = require('poly/main/error/toast');

  MIL_PER_SEC = 1000;

  SEC_PER_DAY = 60 * 60 * 24;

  DATE_FUNCTIONS = {};

  _ref = [['Past Day', SEC_PER_DAY], ['Past Week', SEC_PER_DAY * 7], ['Past Month', SEC_PER_DAY * 30], ['Past Year', SEC_PER_DAY * 365]];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    _ref1 = _ref[_i], range = _ref1[0], timeDelta = _ref1[1];
    DATE_FUNCTIONS[range] = (function(timeDelta) {
      return function() {
        return moment().unix() - timeDelta;
      };
    })(timeDelta);
  }

  MINIMUM_MIL = Math.pow(10, 10);

  SLIDER_DOM_SELECTOR = '.slider';

  FiltersView = (function() {
    function FiltersView(tableMetaData, parent) {
      this.tableMetaData = tableMetaData;
      this.parent = parent;
      this.enable = __bind(this.enable, this);
      this.disable = __bind(this.disable, this);
      this.dropFilter = __bind(this.dropFilter, this);
      this._actualMetricEnter = __bind(this._actualMetricEnter, this);
      this.onMetricEnter = __bind(this.onMetricEnter, this);
      this.generateMeta = __bind(this.generateMeta, this);
      this.generateSpec = __bind(this.generateSpec, this);
      this.reset = __bind(this.reset, this);
      this.filters = ko.observableArray();
      this.enabled = ko.observable(true);
    }

    FiltersView.prototype.reset = function(spec, tableMeta) {
      var column, columnInfo, defaults, key, name, tableName, val, value, _ref2, _results;
      this.filters = ko.observableArray();
      _results = [];
      for (column in spec) {
        defaults = spec[column];
        if (defaults.tableName && column.indexOf(defaults.tableName) !== -1) {
          tableName = defaults.tableName;
        } else {
          tableName = Parser.getTableName(column);
        }
        name = (_ref2 = defaults.name) != null ? _ref2 : Parser.getName({
          "var": column
        });
        if (!tableName) {
          value = _.find(tableMeta, function(val, key) {
            return Parser.getName(key) === column;
          });
          if ((value != null) && (value.tableName != null)) {
            tableName = value.tableName;
          } else {
            for (key in tableMeta) {
              val = tableMeta[key];
              if (val.tableName != null) {
                tableName = val.tableName;
                break;
              }
            }
          }
        }
        columnInfo = this.tableMetaData.getColumnInfo({
          tableName: tableName,
          name: name
        });
        _results.push(this._actualMetricEnter(null, {
          data: columnInfo
        }, defaults));
      }
      return _results;
    };

    FiltersView.prototype.generateSpec = function() {
      var filter, filterSpec, filters, m, spec, _j, _len1;
      spec = {};
      filters = this.filters();
      for (_j = 0, _len1 = filters.length; _j < _len1; _j++) {
        filter = filters[_j];
        filterSpec = filter.generateSpec();
        if (!_.isEmpty(filterSpec)) {
          m = filter.metric();
          spec[m.fullFormula(this.tableMetaData)] = filterSpec;
        }
      }
      return spec;
    };

    FiltersView.prototype.generateMeta = function() {
      var filter, filters, m, meta, _j, _len1;
      meta = {};
      filters = this.filters();
      for (_j = 0, _len1 = filters.length; _j < _len1; _j++) {
        filter = filters[_j];
        m = filter.metric();
        if (m) {
          meta[m.fullFormula(this.tableMetaData, true)] = _.extend(m.fullMeta(), {
            dsKey: this.tableMetaData.dsKey
          });
        }
      }
      return meta;
    };

    FiltersView.prototype.onMetricEnter = function(event, item, defaults) {
      var _this = this;
      if (_.reduce(this.filters(), (function(acc, f) {
        return acc || item.data.tableName === f.metric().tableName && item.data.name === f.metric().name;
      }), false)) {
        TOAST.raise("You may not filter twice on the same metric!");
        return;
      }
      if (item.data.name === 'count(*)') {
        TOAST.raise("You can't filter on that item.");
        return;
      }
      return this.parent.checkNewMetric(event, item, function() {
        return _this._actualMetricEnter(event, item, defaults);
      });
    };

    FiltersView.prototype._actualMetricEnter = function(event, item, defaults) {
      var f, filters, index,
        _this = this;
      if (defaults == null) {
        defaults = {};
      }
      if (_.isNumber(defaults)) {
        index = defaults;
        f = new Filter(this.tableMetaData, index + 1, {});
        f.onMetricEnter(event, item);
        filters = this.filters.slice(0, index);
        filters.push(f);
        this.filters(filters.concat(this.filters.slice(index + 1)));
      } else {
        f = new Filter(this.tableMetaData, this.filters().length + 1, defaults);
        f.onMetricEnter(event, item);
        this.filters.push(f);
      }
      return Events.ui.filter.remove.onElem(f, function(evt, params) {
        if (params != null) {
          index = _this.filters.indexOf(f);
          return _this.onMetricEnter(null, params, index);
        } else {
          return _this.filters.remove(f);
        }
      });
    };

    FiltersView.prototype.dropFilter = function(dom) {
      var _ref2;
      return (_ref2 = $(dom).data('dnd-data').meta.type) === 'date' || _ref2 === 'num' || _ref2 === 'cat';
    };

    FiltersView.prototype.disable = function() {
      return this.enabled(false);
    };

    FiltersView.prototype.enable = function() {
      return this.enabled(true);
    };

    return FiltersView;

  })();

  Filter = (function() {
    function Filter(tableMetaData, id, _defaults) {
      var _ref2, _ref3,
        _this = this;
      this.tableMetaData = tableMetaData;
      this._defaults = _defaults != null ? _defaults : {};
      this._render = __bind(this._render, this);
      this._setDefaults = __bind(this._setDefaults, this);
      this._makeSlider = __bind(this._makeSlider, this);
      this.initCatFilter = __bind(this.initCatFilter, this);
      this.initSliderFilter = __bind(this.initSliderFilter, this);
      this.dropFilter = __bind(this.dropFilter, this);
      this.onMetricDiscard = __bind(this.onMetricDiscard, this);
      this.onMetricEnter = __bind(this.onMetricEnter, this);
      this.initMetricItem = __bind(this.initMetricItem, this);
      this.generateSpec = __bind(this.generateSpec, this);
      this.render = _.debounce(this._render, 600);
      this.label = "Filter " + id;
      this.metric = ko.observable(false);
      this.metaDone = ko.observable(false);
      this.showNotNull = (_ref2 = this.tableMetaData.dsType) === 'mysql' || _ref2 === 'postgresql' || _ref2 === 'infobright';
      this.notNull = ko.observable((_ref3 = this._defaults.notnull) != null ? _ref3 : true);
      this.sliderMin = ko.observable(+this._defaults.min);
      this.sliderMax = ko.observable(+this._defaults.max);
      this.filterMin = ko.observable(this.sliderMin());
      this.filterMax = ko.observable(this.sliderMax());
      this.filterRange = ko.computed({
        read: function() {
          return [this.filterMin(), this.filterMax()];
        },
        write: function(newVal) {
          this.filterMin(newVal[0]);
          return this.filterMax(newVal[1]);
        },
        owner: this
      });
      this.filterDisplay = ko.computed(function() {
        var max, min;
        min = _this.filterMin();
        max = _this.filterMax();
        if (_this.metric().type === "date") {
          return moment.unix(min).format("D MMM YYYY") + ' - ' + moment.unix(max).format("D MMM YYYY");
        } else {
          return min + ' - ' + max;
        }
      });
      this.filterCatOptions = ko.observableArray();
      this.filterCatValue = ko.observableArray();
      this.filterCatOptionsText = function(v) {
        if (v) {
          return v;
        } else {
          return "(NULL)";
        }
      };
      this.dateOptions = ko.computed(function() {
        var opts;
        if (_this.metric().type !== 'date') {
          return null;
        }
        opts = _.reject(_.pairs(DATE_FUNCTIONS), function(v) {
          return v[1]() >= _this.sliderMax();
        });
        opts.push(['Custom', null]);
        return opts;
      });
      this.dateOptionSelected = ko.observable(['Custom', null]);
      this.dateOptionSelected.subscribe(function(newVal) {
        if (newVal[1] != null) {
          return _this.filterMin(newVal[1]());
        }
      });
      this.sliderVisible = ko.computed(function() {
        if ((_this.sliderMin() == null) || (_this.sliderMax() == null)) {
          return false;
        } else if (_this.metric().type === 'date') {
          return _this.dateOptionSelected()[0] === 'Custom';
        } else {
          return true;
        }
      });
      this.sliderVisible.subscribe(this.render);
      this.sliderMin.subscribe(function(val) {
        try {
          $(SLIDER_DOM_SELECTOR, _this.dom).slider("min", _this.sliderMax());
          if (_this.filterMin() < val) {
            return _this.filterMin(val);
          }
        } catch (_error) {}
      });
      this.sliderMax.subscribe(function(val) {
        try {
          $(SLIDER_DOM_SELECTOR, _this.dom).slider("max", _this.sliderMax());
          if (_this.filterMax() > val) {
            return _this.filterMax(val);
          }
        } catch (_error) {}
      });
      this.filterRange.subscribe(function(val) {
        try {
          return $(SLIDER_DOM_SELECTOR, _this.dom).slider("values", val);
        } catch (_error) {}
      });
    }

    Filter.prototype.generateSpec = function() {
      var spec, values, _ref2;
      if (!this.metaDone()) {
        return null;
      }
      spec = {};
      if ((_ref2 = this.metric().type) === 'date' || _ref2 === 'num') {
        values = $(SLIDER_DOM_SELECTOR, this.dom).slider('values');
        if (_.isNumber(values[0]) && values[0] !== this.sliderMin()) {
          spec.ge = values[0];
        }
        if (_.isNumber(values[1]) && values[1] !== this.sliderMax()) {
          spec.le = values[1];
        }
        if (this.metric().type === 'date' && (this.dateOptionSelected() != null)) {
          spec.dateOptions = this.dateOptionSelected()[0];
        }
        if (this.notNull()) {
          spec.notnull = true;
        } else {
          if (!_.isEmpty(spec)) {
            spec.notnull = false;
          }
        }
      } else if (this.metric().type === "cat") {
        if (this.filterCatValue().length > 0) {
          spec["in"] = this.filterCatValue();
        } else if (this.notNull()) {
          spec.notnull = true;
        }
      }
      if (!_.isEmpty(spec)) {
        spec.name = this.metric().name;
        spec.tableName = this.metric().tableName;
      }
      return spec;
    };

    Filter.prototype.initMetricItem = function(metricDom, view) {
      DND.makeDraggable(metricDom, view);
      this.metric().attachDropdown(metricDom);
      return this.render();
    };

    Filter.prototype.onMetricEnter = function(event_, item) {
      var m,
        _this = this;
      if (this.metaDone()) {
        this.onMetricDiscard(false, item);
        return;
      }
      m = new DropdownMetricView(item.data, this.label, 'tmpl-filter-dropdown', this);
      this.metric(m);
      return this.tableMetaData.extendedMetaAsync(m.columnInfo, function(err, res) {
        var vals;
        if (err) {
          console.error(err);
          TOAST.raise("Error loading extended meta for table '" + m.tableName + "'");
          return;
        }
        if (_this.metric().type === 'cat') {
          vals = _.map(res.range.values, function(v) {
            return v.toString();
          });
          _this.filterCatOptions(vals);
        } else {
          _this.sliderMin(res.range.min);
          _this.filterMin(res.range.min);
          _this.sliderMax(res.range.max);
          _this.filterMax(res.range.max);
        }
        _this._defaults = _.extend(_this._defaults, res);
        return _this.metaDone(true);
      });
    };

    Filter.prototype.onMetricDiscard = function(event, metricDom) {
      this.metric().close();
      Events.ui.filter.remove.triggerElem(this, (!event ? metricDom : void 0));
      return this.render();
    };

    Filter.prototype.dropFilter = function(dom) {
      var _ref2;
      return (_ref2 = $(dom).data('dnd-data').meta.type) === 'date' || _ref2 === 'num' || _ref2 === 'cat';
    };

    Filter.prototype.initSliderFilter = function(dom) {
      var slider,
        _this = this;
      this.dom = dom;
      slider = $(SLIDER_DOM_SELECTOR, this.dom);
      if (this.metaDone()) {
        this._makeSlider(slider);
      } else {
        this.metaDone.subscribe(function() {
          return _this._makeSlider(slider);
        });
      }
      return this.notNull.subscribe(function() {
        return _this.render();
      });
    };

    Filter.prototype.initCatFilter = function(dom) {
      var _this = this;
      this.dom = dom;
      this._setDefaults();
      this.filterCatValue.subscribe(function() {
        return _this.render();
      });
      return this.notNull.subscribe(function() {
        return _this.render();
      });
    };

    Filter.prototype._makeSlider = function(slider) {
      var _this = this;
      slider.slider({
        range: true,
        max: this.sliderMax(),
        min: this.sliderMin(),
        values: this.filterRange(),
        slide: function(evt, ui) {
          _this.filterRange(ui.values);
          return _this.render();
        },
        change: function(evt, ui) {
          _this.filterRange(ui.values);
          return _this.render();
        }
      });
      return this._setDefaults();
    };

    Filter.prototype._setDefaults = function() {
      var opt;
      this.filterMin(this.sliderMin());
      this.filterMax(this.sliderMax());
      if (this._defaults.dateOptions) {
        opt = this._defaults.dateOptions;
        if (_.isArray(opt)) {
          opt = opt[0];
        }
        if (opt in DATE_FUNCTIONS && opt !== "Custom") {
          this.dateOptionSelected([opt, DATE_FUNCTIONS[opt]]);
        } else if (opt === "Custom") {
          if (this._defaults.le != null) {
            this.filterMax(+this._defaults.le);
          }
          if (this._defaults.ge != null) {
            this.filterMin(+this._defaults.ge);
          }
        }
      }
      if (_.isArray(this._defaults["in"])) {
        this.filterCatValue(this._defaults["in"]);
      }
      if (this._defaults.le != null) {
        this.filterMax(+this._defaults.le);
      }
      if (this._defaults.ge != null) {
        this.filterMin(+this._defaults.ge);
      }
      return this.render();
    };

    Filter.prototype._render = function() {
      var _this = this;
      if (this.metaDone()) {
        return Events.ui.chart.render.trigger();
      } else {
        return this.metaDone.subscribe(function() {
          return _this._render();
        });
      }
    };

    return Filter;

  })();

  module.exports = FiltersView;

}).call(this);
}, "poly/main/chart/joins": function(exports, require, module) {(function() {
  var Events, Join, JoinsEditorView, JoinsView, JoinsViewer, TOAST, Table,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Events = require('poly/main/events');

  TOAST = require('poly/main/error/toast');

  JoinsView = (function() {
    function JoinsView(tableMetaData, spec, parent) {
      var _this = this;
      this.tableMetaData = tableMetaData;
      if (spec == null) {
        spec = {};
      }
      this.parent = parent;
      this.generateSpec = __bind(this.generateSpec, this);
      this.checkRemoveJoins = __bind(this.checkRemoveJoins, this);
      this.editorAddJoin = __bind(this.editorAddJoin, this);
      this.wrappedCallback = __bind(this.wrappedCallback, this);
      this.checkAddJoins = __bind(this.checkAddJoins, this);
      this.initialize = __bind(this.initialize, this);
      this.openViewer = __bind(this.openViewer, this);
      this.viewer = new JoinsViewer(this.tableMetaData);
      this.editor = new JoinsEditorView(this.tableMetaData);
      this.tables = ko.observable({});
      this.renderable = ko.observable(false);
      this.hasJoins = ko.computed(function() {
        return _.size(_this.tables()) >= 2;
      });
      this.joins = ko.computed(function() {
        var allJoins, name_, table, tables;
        tables = _this.tables();
        allJoins = _.flatten((function() {
          var _results;
          _results = [];
          for (name_ in tables) {
            table = tables[name_];
            _results.push(_.values(table.joins));
          }
          return _results;
        })());
        return _.filter(allJoins, function(join, i) {
          return _.every(allJoins.slice(i + 1), function(item) {
            return !join.equal(item);
          });
        });
      });
      this.initialize(spec);
      this.renderable(true);
    }

    JoinsView.prototype.reset = function(spec) {
      if (spec == null) {
        spec = {};
      }
      this.tables({});
      return this.initialize(spec);
    };

    JoinsView.prototype.openViewer = function() {
      return this.viewer.open(this.joins);
    };

    JoinsView.prototype.initialize = function(spec) {
      var column1, column2, join, m, name, table1, table2, tableNames, tables, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3;
      if (!_.isEmpty(spec)) {
        tables = this.tables();
        _ref1 = (_ref = spec.tables) != null ? _ref : [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          name = _ref1[_i];
          tables[name] = new Table(name);
        }
        _ref3 = (_ref2 = spec.joins) != null ? _ref2 : [];
        for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
          join = _ref3[_j];
          table1 = join.table1, table2 = join.table2, column1 = join.column1, column2 = join.column2;
          new Join(tables[table1], column1, tables[table2], column2);
        }
        this.tables(tables);
        return;
      }
      if (this.parent.attachedMetrics != null) {
        tableNames = _.uniq((function() {
          var _k, _len2, _ref4, _results;
          _ref4 = this.parent.attachedMetrics();
          _results = [];
          for (_k = 0, _len2 = _ref4.length; _k < _len2; _k++) {
            m = _ref4[_k];
            _results.push(m.tableName);
          }
          return _results;
        }).call(this));
        if (_.size(tableNames) >= 2) {
          this.renderable(false);
          TOAST.raise("Information about table joins is missing! Cannot render.");
          return;
        }
        if (_.size(tableNames) === 1) {
          tables = this.tables();
          name = tableNames[0];
          tables[name] = new Table(name);
          return this.tables(tables);
        }
      }
    };

    JoinsView.prototype.checkAddJoins = function(event, item, callback) {
      var tableName, tables, _ref;
      tableName = item.data.tableName;
      tables = this.tables();
      if (_.isEmpty(tables) || tableName in tables) {
        if (_.isEmpty(tables)) {
          tables[tableName] = new Table(tableName);
        }
        this.tables(tables);
        callback();
        return;
      }
      if (this.tableMetaData.dsType === 'googleAnalytics') {
        callback();
        return;
      }
      if ((_ref = this.tableMetaData.dsType) !== 'mysql' && _ref !== 'postgresql' && _ref !== 'infobright') {
        TOAST.raise("You cannot use two different data tables/sources.");
        return;
      }
      this.renderable(false);
      if (!(tableName in tables)) {
        return this.editor.open(tables, tableName, this.wrappedCallback(callback));
      }
    };

    JoinsView.prototype.wrappedCallback = function(realCallback) {
      var _this = this;
      return function(success, newJoinParams) {
        _this.renderable(true);
        if (!success) {
          TOAST.raise("Oops. Adding that column failed.");
          return;
        }
        _this.editorAddJoin(newJoinParams);
        return realCallback();
      };
    };

    JoinsView.prototype.editorAddJoin = function(params) {
      var column1, column2, table1, table2, tables;
      table1 = params.table1, table2 = params.table2, column1 = params.column1, column2 = params.column2;
      tables = this.tables();
      tables[table2] = new Table(table2);
      new Join(tables[table1], column1, tables[table2], column2);
      return this.tables(tables);
    };

    JoinsView.prototype.checkRemoveJoins = function() {
      var m, table, tableNames, tables, unattachedTables, _i, _len;
      if (this.tableMetaData.dsType === 'googleAnalytics') {
        return;
      }
      tableNames = _.uniq((function() {
        var _i, _len, _ref, _results;
        _ref = this.parent.attachedMetrics();
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          m = _ref[_i];
          _results.push(m.tableName);
        }
        return _results;
      }).call(this));
      tables = this.tables();
      unattachedTables = _.difference(_.keys(tables), tableNames);
      for (_i = 0, _len = unattachedTables.length; _i < _len; _i++) {
        table = unattachedTables[_i];
        if (tables[table].canDelete()) {
          tables[table]["delete"]();
          delete tables[table];
        }
      }
      return this.tables(tables);
    };

    JoinsView.prototype.generateSpec = function() {
      var j, joinObjs, name, t;
      joinObjs = _.unique(_.flatten((function() {
        var _ref, _results;
        _ref = this.tables();
        _results = [];
        for (name in _ref) {
          t = _ref[name];
          _results.push(_.values(t.joins));
        }
        return _results;
      }).call(this)));
      return {
        tables: _.keys(this.tables()),
        joins: (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = joinObjs.length; _i < _len; _i++) {
            j = joinObjs[_i];
            _results.push(j.generateSpec());
          }
          return _results;
        })()
      };
    };

    return JoinsView;

  })();

  JoinsViewer = (function() {
    JoinsViewer.prototype.template = 'tmpl-joins-viewer';

    function JoinsViewer(tableMetaData) {
      this.tableMetaData = tableMetaData;
      this.close = __bind(this.close, this);
    }

    JoinsViewer.prototype.open = function(joins) {
      this.joins = joins;
      return Events.ui.dialog.show.trigger({
        template: this.template,
        type: 'joins-viewer',
        view: this
      });
    };

    JoinsViewer.prototype.close = function(elem) {
      return Events.ui.dialog.hide.trigger();
    };

    return JoinsViewer;

  })();

  JoinsEditorView = (function() {
    JoinsEditorView.prototype.template = 'tmpl-joins-editor-basic';

    function JoinsEditorView(tableMetaData) {
      this.tableMetaData = tableMetaData;
      this.close = __bind(this.close, this);
      this.confirmJoin = __bind(this.confirmJoin, this);
      this.cancelJoin = __bind(this.cancelJoin, this);
    }

    JoinsEditorView.prototype.open = function(tables, newTable, callback) {
      var _pair,
        _this = this;
      this.tables = tables;
      this.newTable = newTable;
      this.callback = callback;
      _pair = function(obj) {
        return [obj, obj];
      };
      this.newTableDummy = [newTable];
      this.newTableSelDummy = ko.observable(_pair(newTable));
      this.newVars = this.tableMetaData.getColumnsInTable(this.newTable);
      this.newVarSel = ko.observable(_pair(this.newVars[0]));
      this.existingTables = _.without(_.keys(this.tables), this.newTable);
      this.existingTableSel = ko.observable(_pair(this.existingTables[0]));
      this.existingVars = ko.computed(function() {
        return _this.tableMetaData.getColumnsInTable(_this.existingTableSel()[0]);
      });
      this.existingVarSel = ko.observable(_pair(this.existingVars()[0]));
      this.existingVars.subscribe(function(val) {
        var _ref;
        if (_ref = _this.existingVarSel()[0], __indexOf.call(val, _ref) < 0) {
          return _this.existingVarSel(_pair(_this.existingVars()[0]));
        }
      });
      this.joinTypes = [['Inner Join', 'inner']];
      this.joinTypeSel = ko.observable(this.joinTypes[0]);
      return Events.ui.dialog.show.trigger({
        template: this.template,
        type: 'joins-editor-basic',
        view: this
      });
    };

    JoinsEditorView.prototype.cancelJoin = function() {
      this.close();
      return this.callback(false);
    };

    JoinsEditorView.prototype.confirmJoin = function() {
      this.close();
      return this.callback(true, {
        type: 'inner',
        table1: this.existingTableSel()[1],
        table2: this.newTable,
        column1: this.existingVarSel()[1],
        column2: this.newVarSel()[1]
      });
    };

    JoinsEditorView.prototype.close = function() {
      return Events.ui.dialog.hide.trigger();
    };

    return JoinsEditorView;

  })();

  Table = (function() {
    function Table(name) {
      this.name = name;
      this.removeJoin = __bind(this.removeJoin, this);
      this.addJoin = __bind(this.addJoin, this);
      this["delete"] = __bind(this["delete"], this);
      this.canDelete = __bind(this.canDelete, this);
      this.joins = {};
    }

    Table.prototype.canDelete = function() {
      return _.size(this.joins) <= 1;
    };

    Table.prototype["delete"] = function() {
      var join, key, _ref, _results;
      _ref = this.joins;
      _results = [];
      for (key in _ref) {
        join = _ref[key];
        _results.push(join.remove());
      }
      return _results;
    };

    Table.prototype.addJoin = function(withTable, join) {
      return this.joins[withTable] = join;
    };

    Table.prototype.removeJoin = function(withTable) {
      return delete this.joins[withTable];
    };

    return Table;

  })();

  Join = (function() {
    function Join(table1, column1, table2, column2) {
      this.table1 = table1;
      this.column1 = column1;
      this.table2 = table2;
      this.column2 = column2;
      this.equal = __bind(this.equal, this);
      this.generateSpec = __bind(this.generateSpec, this);
      this.remove = __bind(this.remove, this);
      this.table1.addJoin(this.table2.name, this);
      this.table2.addJoin(this.table1.name, this);
      this.type = 'inner';
    }

    Join.prototype.remove = function() {
      this.table1.removeJoin(this.table2.name);
      return this.table2.removeJoin(this.table1.name);
    };

    Join.prototype.generateSpec = function() {
      return {
        type: this.type,
        table1: this.table1.name,
        table2: this.table2.name,
        column1: this.column1,
        column2: this.column2
      };
    };

    Join.prototype.equal = function(other) {
      var specOne, specTwo;
      specOne = this.generateSpec();
      specTwo = other.generateSpec();
      if (_.isEqual(specOne, specTwo)) {
        return true;
      } else {
        return _.every([specOne.type === specTwo.type, specOne.column1 === specTwo.column2, specOne.column2 === specTwo.column1, specOne.table1 === specTwo.table2, specOne.table2 === specTwo.table1]);
      }
    };

    return Join;

  })();

  module.exports = {
    JoinsView: JoinsView
  };

}).call(this);
}, "poly/main/chart/layer": function(exports, require, module) {(function() {
  var Aesthetic, CONST, ColorAesthetic, Events, FiltersView, JoinsView, LayerView, SizeAesthetic, TOAST,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Aesthetic = require('poly/main/chart/aes/base');

  ColorAesthetic = require('poly/main/chart/aes/color');

  Events = require('poly/main/events');

  FiltersView = require('poly/main/chart/filters');

  SizeAesthetic = require('poly/main/chart/aes/size');

  JoinsView = require('poly/main/chart/joins').JoinsView;

  CONST = require('poly/main/const');

  TOAST = require('poly/main/error/toast');

  LayerView = (function() {
    function LayerView(tableMetaData, layerspec, polar) {
      var aes, colorName, initialType, joinSpec, sizeName, t, view, xName, yName, _capitalize, _makeOption, _rectNames, _ref, _ref1, _ref2, _ref3, _ref4, _ref5,
        _this = this;
      this.tableMetaData = tableMetaData;
      this.polar = polar;
      this.enable = __bind(this.enable, this);
      this.disable = __bind(this.disable, this);
      this.removeLayer = __bind(this.removeLayer, this);
      this.generateSpec = __bind(this.generateSpec, this);
      this.checkRemoveMetric = __bind(this.checkRemoveMetric, this);
      this.checkNewMetric = __bind(this.checkNewMetric, this);
      _capitalize = function(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
      };
      _makeOption = function(polar) {
        return function(alist) {
          var display, value;
          if (!((alist[0] != null) && ((alist[1] != null) || !polar))) {
            return;
          }
          value = alist[0];
          display = _capitalize(polar ? alist[1] : alist[0]);
          return [display, value].concat(polar ? [display.toLowerCase()] : []);
        };
      };
      _rectNames = _.map(CONST.layers.names, function(item) {
        return item[0];
      });
      t = layerspec.type === 'point' ? 'scatter' : layerspec.type;
      initialType = _makeOption(this.polar())(CONST.layers.names[(_ref = _rectNames.indexOf(t != null ? t : 'bar')) != null ? _ref : 0]);
      this.layerspec = ko.observable(layerspec);
      this.data = ko.observable(layerspec.data);
      this.meta = ko.observable(layerspec.meta);
      this.type = ko.observable(initialType);
      this.type.subscribe(function(newValue) {
        var sel;
        if (_this.layerspec()._depth() === 0) {
          sel = newValue[0].toLowerCase();
          if (__indexOf.call(_rectNames, sel) >= 0) {
            _this.polar(false);
          } else {
            _this.polar(true);
          }
        }
        return Events.ui.chart.render.trigger();
      });
      this.polar.subscribe(function(isPolar) {
        var polarType;
        if (_this.layerspec()._depth() !== 0) {
          polarType = CONST.layers.names[_rectNames.indexOf(_this.type()[1])];
          if (polarType[1] === null) {
            polarType = CONST.layers.names[0];
          }
          return _this.plotOptionSelected(_makeOption(isPolar)(polarType));
        }
      });
      this.plotOptionsItem = ko.computed(function() {
        var names;
        names = _.map(CONST.layers.names, _makeOption(_this.polar()));
        if (_this.layerspec()._depth() === 0) {
          names = names.concat(_.map(CONST.layers.names, _makeOption(!_this.polar())));
        }
        return _.filter(names, function(item) {
          return item != null;
        });
      });
      this.plotOptionSelected = ko.computed({
        read: function() {
          return this.type();
        },
        write: function(value) {
          return this.type(value);
        },
        owner: this
      });
      this.layerRestrictions = ko.computed(function() {
        return CONST.layers[_this.type()[0].toLowerCase()];
      });
      this.filtersView = new FiltersView(this.tableMetaData, this);
      this.filtersView.reset((_ref1 = this.layerspec().filter) != null ? _ref1 : {}, this.meta());
      xName = ko.computed(function() {
        if (_this.polar()) {
          return "Radius";
        } else {
          return "X Axis";
        }
      });
      yName = ko.computed(function() {
        if (_this.polar()) {
          return "Angle";
        } else {
          return "Y Axis";
        }
      });
      colorName = ko.computed(function() {
        if (_this.polar()) {
          return "Color";
        } else {
          return "Color";
        }
      });
      sizeName = ko.computed(function() {
        return "Size";
      });
      this.aesthetics = {
        x: new Aesthetic('x', xName, this),
        y: new Aesthetic('y', yName, this),
        color: new ColorAesthetic('color', colorName, this),
        size: new SizeAesthetic('size', sizeName, this)
      };
      this.visibleAesthetics = ko.computed(function() {
        var i, _i, _len, _ref2, _results;
        _ref2 = _this.layerRestrictions().visibleAes;
        _results = [];
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          i = _ref2[_i];
          _results.push(_this.aesthetics[i]);
        }
        return _results;
      });
      this.attachedMetrics = ko.computed(function() {
        var aes, aesView, f, filter;
        aes = _.compact((function() {
          var _i, _len, _ref2, _results;
          _ref2 = this.visibleAesthetics();
          _results = [];
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            aesView = _ref2[_i];
            _results.push(aesView.metric());
          }
          return _results;
        }).call(_this));
        filter = (function() {
          var _i, _len, _ref2, _results;
          _ref2 = this.filtersView.filters();
          _results = [];
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            f = _ref2[_i];
            _results.push(f.metric());
          }
          return _results;
        }).call(_this);
        return _.union(aes, filter);
      });
      _ref2 = this.aesthetics;
      for (aes in _ref2) {
        view = _ref2[aes];
        if ((layerspec[aes] != null) && !layerspec[aes].tableName && layerspec.tableName) {
          layerspec[aes].tableName = layerspec.tableName;
        }
        if (layerspec[aes] && !layerspec[aes].dsKey) {
          if ((_ref3 = layerspec[aes]) != null) {
            _ref3.dsKey = this.tableMetaData.dsKey;
          }
        }
        view.init(layerspec[aes], (_ref4 = layerspec[aes]) != null ? _ref4.tableName : void 0);
      }
      joinSpec = (_ref5 = layerspec.additionalInfo) != null ? _ref5.joins : void 0;
      this.joinsView = new JoinsView(this.tableMetaData, joinSpec, this);
      this.renderable = ko.computed(function() {
        if (!('ga' in _this.meta) && !_this.joinsView.renderable()) {
          return false;
        } else if (_this.attachedMetrics().length < 2) {
          return false;
        } else {
          Events.ui.chart.render.trigger();
          return true;
        }
      });
      return;
    }

    LayerView.prototype.checkNewMetric = function(event, item, callback) {
      return this.joinsView.checkAddJoins(event, item, callback);
    };

    LayerView.prototype.checkRemoveMetric = function(event, item) {
      return this.joinsView.checkRemoveJoins();
    };

    LayerView.prototype.generateSpec = function() {
      var aesView, layerspec, m, spec, _i, _len, _ref;
      layerspec = {
        additionalInfo: {
          joins: this.joinsView.generateSpec()
        },
        type: this.type()[1] === 'scatter' ? 'point' : this.type()[1],
        filter: this.filtersView.generateSpec(),
        meta: {}
      };
      _ref = this.visibleAesthetics();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        aesView = _ref[_i];
        spec = aesView.generateSpec();
        if (spec) {
          layerspec[aesView.aes] = spec;
          m = aesView.metric();
          if (m != null) {
            layerspec.meta[m.fullFormula(this.tableMetaData, true)] = _.extend(m.fullMeta(), {
              dsKey: this.tableMetaData.dsKey
            });
            layerspec.data = this.tableMetaData.polyJsObjectFor({
              tableName: spec.tableName
            });
          }
        }
      }
      layerspec.meta = _.extend(layerspec.meta, this.filtersView.generateMeta());
      if (layerspec.data && (layerspec.meta != null) && this.renderable()) {
        if (_.every(_.values(layerspec.meta), function(item) {
          return 'ga' in item;
        })) {
          if (__indexOf.call(_.map(layerspec.meta, function(val) {
            return val.ga;
          }), 'metric') < 0) {
            TOAST.raise("Google Analytics charts require at least one metric—orange—item!");
            return {};
          }
        }
        return layerspec;
      } else {
        return {};
      }
    };

    LayerView.prototype.removeLayer = function() {
      Events.ui.layer.remove.triggerElem(this, {
        layer: this
      });
    };

    LayerView.prototype.disable = function() {
      var _this = this;
      _.each(this.aesthetics, function(aes) {
        return aes.disable();
      });
      this.filtersView.disable();
    };

    LayerView.prototype.enable = function() {
      var _this = this;
      _.each(this.aesthetics, function(aes) {
        return aes.enable();
      });
      this.filtersView.enable();
    };

    return LayerView;

  })();

  module.exports = LayerView;

}).call(this);
}, "poly/main/const": function(exports, require, module) {/*
# Define constants that are used throughout the codebase here.
*/


(function() {
  var LAYERNAMES, createBasicAes, createBasicLayer, facets, layers, n, numeral, stats, table, ui, _i, _len;

  createBasicAes = function() {
    return {
      type: ['num', 'cat', 'date'],
      bin: false,
      stat: {
        cat: ['None', 'Count', 'Unique'],
        num: ['None', 'Sum', 'Average', 'Count', 'Unique'],
        date: ['None', 'Count', 'Unique', 'Mean']
      },
      defaultStat: {
        cat: 'None',
        num: 'None',
        date: 'None'
      }
    };
  };

  createBasicLayer = function(name) {
    return {
      visibleAes: ['x', 'y', 'color'],
      x: createBasicAes(),
      y: createBasicAes(),
      color: createBasicAes(),
      size: {
        type: ['num'],
        bin: false,
        stat: {
          num: ['None', 'Sum', 'Average', 'Count', 'Unique']
        },
        defaultStat: {
          cat: 'None',
          num: 'None',
          date: 'None'
        }
      }
    };
  };

  stats = {};

  stats.nameToStat = {
    'Count': 'count',
    'Unique': 'unique',
    'Sum': 'sum',
    'Average': 'mean'
  };

  stats.statToName = _.invert(stats.nameToStat);

  ui = {
    grid_width: 12,
    grid_size: 25
  };

  LAYERNAMES = ['scatter', 'area', 'line', 'bar', 'tile', 'spline', 'pie', 'star', 'spider', 'splider'];

  layers = {};

  for (_i = 0, _len = LAYERNAMES.length; _i < _len; _i++) {
    n = LAYERNAMES[_i];
    layers[n] = createBasicLayer();
  }

  layers.scatter.visibleAes = ['x', 'y', 'color', 'size'];

  layers.line.visibleAes = ['x', 'y', 'color', 'size'];

  layers.bar.x.stat.num = ['None'];

  layers.bar.x.bin = true;

  layers.bar.y.stat.num = ['None', 'Sum', 'Average', 'Count', 'Unique'];

  layers.bar.y.defaultStat.num = 'Sum';

  layers.bar.y.defaultStat.cat = 'Count';

  layers.bar.y.defaultStat.date = 'Count';

  layers.bar.color.bin = true;

  layers.tile.x.bin = true;

  layers.tile.y.bin = true;

  layers.pie.visibleAes = ['y', 'color'];

  layers.spider.visibleAes = ['x', 'y', 'color', 'size'];

  layers.splider.visibleAes = ['x', 'y', 'color', 'size'];

  layers.names = [['bar', 'pie'], ['scatter', null], ['line', 'spider'], ['spline', null], ['tile', null], ['area', null]];

  facets = {
    type: ['num', 'cat', 'date'],
    bin: true,
    stat: {
      cat: ['None'],
      num: ['None'],
      date: ['None']
    },
    defaultStat: {
      cat: 'None',
      num: 'None',
      date: 'None'
    }
  };

  numeral = {
    value: {
      type: ['num', 'cat'],
      bin: false,
      stat: {
        cat: ['Count', 'Unique'],
        num: ['Sum', 'Average', 'Count', 'Unique'],
        date: ['Count']
      },
      defaultStat: {
        cat: 'Unique',
        num: 'Sum',
        date: 'Count'
      }
    }
  };

  table = {
    quickadd: {
      type: ['num', 'cat', 'date'],
      bin: true,
      stat: {
        cat: ['None'],
        date: ['None'],
        num: ['Sum', 'Average', 'Count', 'Unique']
      },
      defaultStat: {
        cat: 'None',
        num: 'Sum',
        date: 'None'
      }
    },
    value: {
      type: ['num', 'cat', 'date'],
      bin: false,
      stat: {
        cat: ['Count', 'Unique'],
        date: ['Count', 'Unique'],
        num: ['Sum', 'Average', 'Count', 'Unique']
      },
      defaultStat: {
        cat: 'Count',
        num: 'Sum',
        date: 'Count'
      }
    },
    row: {
      type: ['num', 'cat', 'date'],
      bin: true,
      stat: {
        cat: ['None'],
        date: ['None'],
        num: ['None']
      },
      defaultStat: {
        cat: 'None',
        num: 'None',
        date: 'None'
      }
    },
    column: {
      type: ['num', 'cat', 'date'],
      bin: true,
      stat: {
        cat: ['None'],
        date: ['None'],
        num: ['None']
      },
      defaultStat: {
        cat: 'None',
        num: 'None',
        date: 'None'
      }
    }
  };

  module.exports = {
    layers: layers,
    facets: facets,
    stats: stats,
    numeral: numeral,
    table: table,
    ui: ui
  };

}).call(this);
}, "poly/main/dash/aes": function(exports, require, module) {(function() {
  var CONST, DND, Events, QuickAddAesthetic, QuickAddMetricView, TOAST,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Events = require('poly/main/events');

  QuickAddMetricView = require('poly/main/data/metric/quickadd');

  CONST = require('poly/main/const');

  DND = require('poly/main/dnd');

  TOAST = require('poly/main/error/toast');

  QuickAddAesthetic = (function() {
    function QuickAddAesthetic(parent, aes, options, tableMetaData) {
      this.parent = parent;
      this.aes = aes;
      this.options = options;
      this.tableMetaData = tableMetaData;
      this.enable = __bind(this.enable, this);
      this.disable = __bind(this.disable, this);
      this.initMetricItem = __bind(this.initMetricItem, this);
      this.onMetricDiscard = __bind(this.onMetricDiscard, this);
      this._actualMetricEnter = __bind(this._actualMetricEnter, this);
      this.onMetricEnter = __bind(this.onMetricEnter, this);
      this.clear = __bind(this.clear, this);
      this.metric = ko.observable();
      this.metric.subscribe(this.parent.addItem);
      this.enabled = ko.observable(false);
    }

    QuickAddAesthetic.prototype.clear = function() {
      this.metric(null);
      return this.enable();
    };

    QuickAddAesthetic.prototype.onMetricEnter = function(event, item) {
      var _this = this;
      if (!this.enabled()) {
        return;
      }
      return this.parent.checkNewMetric(event, item, function() {
        return _this._actualMetricEnter(event, item);
      });
    };

    QuickAddAesthetic.prototype._actualMetricEnter = function(event, item) {
      var columnInfo;
      if (this.metric()) {
        this.metric().close();
      }
      columnInfo = this.tableMetaData.getColumnInfo(item.data);
      this.metric(new QuickAddMetricView(columnInfo, this.options, this.aes));
      Events.ui.metric.add.trigger();
      Events.ui.metric.remove.onElem(this.metric(), this.onMetricDiscard);
      return this.parent._recalculateExpansion(event.target);
    };

    QuickAddAesthetic.prototype.onMetricDiscard = function(event, metricItem) {
      this.metric().close();
      this.clear();
      this.parent.checkRemoveMetric();
      return this.parent._recalculateExpansion(event.target);
    };

    QuickAddAesthetic.prototype.initMetricItem = function(dom, quickAddMetricView) {
      DND.makeDraggable(dom, quickAddMetricView);
      return quickAddMetricView.attachDropdown(dom);
    };

    QuickAddAesthetic.prototype.disable = function() {
      return this.enabled(false);
    };

    QuickAddAesthetic.prototype.enable = function() {
      return this.enabled(true);
    };

    QuickAddAesthetic.prototype.dropFilter = function() {
      return true;
    };

    return QuickAddAesthetic;

  })();

  module.exports = QuickAddAesthetic;

}).call(this);
}, "poly/main/dash/dashboard": function(exports, require, module) {(function() {
  var DashboardView, QuickAddView, WorkspaceView,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  QuickAddView = require('poly/main/dash/quickadd');

  WorkspaceView = require('poly/main/dash/workspace');

  DashboardView = (function() {
    function DashboardView(title, tableMetaData) {
      this.initialize = __bind(this.initialize, this);
      this.serialize = __bind(this.serialize, this);
      this.workspaceView = new WorkspaceView(title, tableMetaData);
      this.quickaddView = new QuickAddView(tableMetaData);
    }

    DashboardView.prototype.serialize = function() {
      return this.workspaceView.serialize();
    };

    DashboardView.prototype.initialize = function(initial) {
      return this.workspaceView.initialize(initial);
    };

    return DashboardView;

  })();

  module.exports = DashboardView;

}).call(this);
}, "poly/main/dash/item/base": function(exports, require, module) {(function() {
  var Animation, CONST, DashItem, Events, TOAST,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Animation = require('poly/main/anim');

  Events = require('poly/main/events');

  CONST = require('poly/main/const');

  TOAST = require('poly/main/error/toast');

  DashItem = (function() {
    function DashItem(pos) {
      this.deserialize = __bind(this.deserialize, this);
      this.serialize = __bind(this.serialize, this);
      this.deleteItem = __bind(this.deleteItem, this);
      this.onSelect = __bind(this.onSelect, this);
      this.loaded = __bind(this.loaded, this);
      this.init = __bind(this.init, this);
      var interactive,
        _this = this;
      if (!this.templateName) {
        throw "DashItem must have a template name before super constructor is called";
      }
      this.error = ko.observable(null);
      this.isViewer = ko.observable(false);
      this.zIndex = ko.observable(0);
      this.gridSize = CONST.ui.grid_size;
      this.minWidth || (this.minWidth = 2);
      this.minHeight || (this.minHeight = 2);
      this.gridTop = ko.observable(0);
      this.gridLeft = ko.observable(0);
      this.gridWidth = ko.observable(0);
      this.gridHeight = ko.observable(0);
      this.size = ko.computed({
        read: function() {
          return {
            width: _this.gridWidth(),
            height: _this.gridHeight()
          };
        },
        write: function(val) {
          var height, width;
          if (val == null) {
            val = {};
          }
          width = val.width, height = val.height;
          if (width != null) {
            _this.gridWidth(Math.max(width, _this.minWidth));
          }
          if (height != null) {
            return _this.gridHeight(Math.max(height, _this.minHeight));
          }
        }
      });
      this.position = ko.computed({
        read: function() {
          return _.extend(_this.size(), {
            top: _this.gridTop(),
            left: _this.gridLeft()
          });
        },
        write: function(val) {
          var left, top;
          if (val == null) {
            val = {};
          }
          _this.size(val);
          top = val.top, left = val.left;
          if (top != null) {
            _this.gridTop(Math.max(top, 0));
          }
          if (left != null) {
            return _this.gridLeft(Math.max(left, 0));
          }
        }
      });
      this.position(pos);
      this.size.subscribe(function(val) {
        return _this.onResize(val);
      });
      this._posSub = this.position.subscribe(function() {
        return Events.model.dashboarditem.update.trigger();
      });
      this.isDragging = ko.observable(false);
      this.isResizing = ko.observable(false);
      interactive = ko.computed(function() {
        return !_this.isViewer();
      });
      this.dragResizeParams = {
        gridSize: this.gridSize,
        minWidth: this.minWidth,
        minHeight: this.minHeight,
        gridTop: this.gridTop,
        gridLeft: this.gridLeft,
        gridWidth: this.gridWidth,
        gridHeight: this.gridHeight,
        isDragging: this.isDragging,
        isResizing: this.isResizing,
        dragEnabled: interactive,
        resizeEnabled: interactive
      };
    }

    DashItem.prototype.init = function(dom) {
      this.dom = dom;
      return this.loadingAnim = new Animation('loading', this.dom);
    };

    DashItem.prototype.loaded = function(err) {
      if (err) {
        console.error(err);
        this.error(err.message);
        return this.loadingAnim.stopOnImage("/static/main/images/broken_chart.svg");
      } else {
        this.loadingAnim.remove();
        return this.error(null);
      }
    };

    DashItem.prototype.onSelect = function(item, event) {
      Events.ui.dashboarditem.select.trigger({
        item: item
      });
      return true;
    };

    DashItem.prototype.onResize = function() {};

    DashItem.prototype.deleteItem = function() {
      return Events.ui.dashboarditem.remove.trigger({
        item: this
      });
    };

    DashItem.prototype.serialize = function(s) {
      if (!s.itemType) {
        throw new Error('DashItem subclass must specify itemType');
      }
      s.position = this.position();
      s.zIndex = this.zIndex();
      return s;
    };

    DashItem.prototype.deserialize = function(s) {
      if (s != null ? s.position : void 0) {
        this._posSub.dispose();
        this.position(s != null ? s.position : void 0);
        this._posSub = this.position.subscribe(function() {
          return Events.model.dashboarditem.update.trigger();
        });
      }
      return this.zIndex(s != null ? s.zIndex : void 0);
    };

    return DashItem;

  })();

  module.exports = DashItem;

}).call(this);
}, "poly/main/dash/item/chart": function(exports, require, module) {(function() {
  var CONST, ChartItem, Events, LayerView, Parser, PolyJSItem, TOAST,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Events = require('poly/main/events');

  PolyJSItem = require('poly/main/dash/item/polyjs');

  Parser = require('poly/main/parser');

  LayerView = require('poly/main/chart/layer');

  CONST = require('poly/main/const');

  TOAST = require('poly/main/error/toast');

  ChartItem = (function(_super) {
    __extends(ChartItem, _super);

    ChartItem.prototype.minWidth = 8;

    ChartItem.prototype.minHeight = 6;

    ChartItem.prototype.templateName = 'tmpl-chart-item';

    function ChartItem(spec, position) {
      this.spec = spec != null ? spec : null;
      if (position == null) {
        position = {};
      }
      this.editChart = __bind(this.editChart, this);
      this.serialize = __bind(this.serialize, this);
      this._renderPolyJSItem = __bind(this._renderPolyJSItem, this);
      this._initSpec = __bind(this._initSpec, this);
      position.width || (position.width = 12);
      position.height || (position.height = 8);
      ChartItem.__super__.constructor.call(this, this.spec, position);
    }

    ChartItem.prototype._initSpec = function() {
      var key, layer, name, newname, prop, tableName, val, value, _base, _base1, _base2, _base3, _i, _j, _len, _len1, _ref, _ref1, _ref2, _results;
      if ((_base = this.spec).paddingLeft == null) {
        _base.paddingLeft = 0;
      }
      if ((_base1 = this.spec).paddingRight == null) {
        _base1.paddingRight = 0;
      }
      if ((_base2 = this.spec).paddingTop == null) {
        _base2.paddingTop = 0;
      }
      if ((_base3 = this.spec).paddingBottom == null) {
        _base3.paddingBottom = 0;
      }
      if (this.spec.layer) {
        this.spec.layers = [this.spec.layer];
        delete this.spec.layer;
      }
      _ref = this.spec.layers;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        layer = _ref[_i];
        if (!layer.data) {
          tableName = layer.tableName;
          for (prop in layer) {
            val = layer[prop];
            if (tableName != null) {
              break;
            }
            if (_.isObject(val) && 'var' in val && 'tableName' in val) {
              tableName = val.tableName;
            }
          }
          layer.data = this.tableMetaData.polyJsObjectFor({
            tableName: tableName
          });
          _ref1 = layer.meta;
          for (key in _ref1) {
            val = _ref1[key];
            layer.meta[key].dsKey = this.tableMetaData.getDsKey;
          }
        }
      }
      _ref2 = this.spec.layers;
      _results = [];
      for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
        layer = _ref2[_j];
        _results.push((function() {
          var _ref3, _results1;
          _ref3 = layer.meta;
          _results1 = [];
          for (name in _ref3) {
            value = _ref3[name];
            try {
              newname = name === 'count(*)' ? 'count(1)' : polyjs.parser.unbracket(polyjs.parser.parse(name).pretty());
              if (!layer.meta[newname] && layer.meta[name]) {
                _results1.push(layer.meta[newname] = layer.meta[name]);
              } else {
                _results1.push(void 0);
              }
            } catch (_error) {

            }
          }
          return _results1;
        })());
      }
      return _results;
    };

    ChartItem.prototype._renderPolyJSItem = function(spec, loaded, callback) {
      var getName, l, _ref;
      spec = $.extend(true, {}, spec);
      if (spec.title == null) {
        getName = function(v) {
          if (v != null) {
            return "" + (Parser.getName(v));
          } else {
            return "";
          }
        };
        l = spec.layers[0];
        if (((_ref = spec.coord) != null ? _ref.type : void 0) === 'polar' && (l.color != null)) {
          spec.title = "" + (getName(l.y)) + " by " + (getName(l.color));
        } else {
          spec.title = "" + (getName(l.y)) + " by " + (getName(l.x));
        }
      }
      spec.zoom = this.isViewer();
      return polyjs.chart(spec, loaded, callback);
    };

    ChartItem.prototype.serialize = function(s) {
      var layers, spec, _i, _len, _ref;
      if (s == null) {
        s = {};
      }
      spec = $.extend(true, s, this.spec);
      delete spec.dom;
      delete spec.data;
      if (spec.layer) {
        delete spec.layer.data;
      }
      if (spec.layers) {
        _ref = spec.layers;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          layers = _ref[_i];
          delete layers.data;
        }
      }
      return ChartItem.__super__.serialize.call(this, {
        itemType: 'ChartItem',
        spec: spec
      });
    };

    ChartItem.prototype.editChart = function() {
      Events.ui.chart.edit.trigger();
      return Events.nav.chartbuilder.open.trigger({
        spec: this.spec,
        chartView: this
      });
    };

    return ChartItem;

  })(PolyJSItem);

  module.exports = ChartItem;

}).call(this);
}, "poly/main/dash/item/comment": function(exports, require, module) {(function() {
  var CONST, CommentItem, TextItem,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  TextItem = require('poly/main/dash/item/text');

  CONST = require('poly/main/const');

  CommentItem = (function(_super) {
    __extends(CommentItem, _super);

    function CommentItem(author, value, position) {
      var _ref,
        _this = this;
      this.author = author;
      if (position == null) {
        position = {};
      }
      this.deserialize = __bind(this.deserialize, this);
      this.serialize = __bind(this.serialize, this);
      this.author || (this.author = (_ref = typeof PAGE_VARIABLE !== "undefined" && PAGE_VARIABLE !== null ? PAGE_VARIABLE.USERNAME : void 0) != null ? _ref : '');
      position.width || (position.width = 5);
      position.height || (position.height = 7);
      this.minWidth = 5;
      this.minHeight = 5;
      if (!this.templateName) {
        this.templateName = 'tmpl-comment-item';
      }
      CommentItem.__super__.constructor.call(this, value, position, 'Write a comment here...');
      this.shiftedZIndex = ko.computed(function() {
        return 1000000 + _this.zIndex();
      });
    }

    CommentItem.prototype.serialize = function(s) {
      if (s == null) {
        s = {};
      }
      s.author = this.author;
      s.itemType = "CommentItem";
      return CommentItem.__super__.serialize.call(this, s);
    };

    CommentItem.prototype.deserialize = function(s) {
      if (s.author) {
        this.author = s.author;
      }
      return CommentItem.__super__.deserialize.call(this, s);
    };

    return CommentItem;

  })(TextItem);

  module.exports = CommentItem;

}).call(this);
}, "poly/main/dash/item/numeral": function(exports, require, module) {(function() {
  var CONST, DashItem, Events, NumeralItem, PolyJSItem, TOAST,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  DashItem = require('poly/main/dash/item/base');

  Events = require('poly/main/events');

  PolyJSItem = require('poly/main/dash/item/polyjs');

  CONST = require('poly/main/const');

  TOAST = require('poly/main/error/toast');

  NumeralItem = (function(_super) {
    __extends(NumeralItem, _super);

    NumeralItem.prototype.minWidth = 4;

    NumeralItem.prototype.minHeight = 2;

    NumeralItem.prototype.templateName = 'tmpl-numeral-item';

    function NumeralItem(spec, position) {
      this.spec = spec != null ? spec : null;
      if (position == null) {
        position = {};
      }
      this.editNumeral = __bind(this.editNumeral, this);
      this._renderPolyJSItem = __bind(this._renderPolyJSItem, this);
      this._initSpec = __bind(this._initSpec, this);
      position.width || (position.width = 12);
      position.height || (position.height = 8);
      NumeralItem.__super__.constructor.call(this, this.spec, position);
    }

    NumeralItem.prototype._initSpec = function() {
      var name, newname, prop, tableName, val, value, _ref, _ref1, _results;
      if (!this.spec.data) {
        tableName = this.spec.tableName;
        _ref = this.spec.meta;
        for (prop in _ref) {
          val = _ref[prop];
          if (tableName != null) {
            break;
          }
          if (_.isObject(val) && 'var' in val && 'tableName' in val) {
            tableName = val.tableName;
          }
        }
        this.spec.data = this.tableMetaData.polyJsObjectFor({
          tableName: tableName
        });
      }
      _ref1 = this.spec.meta;
      _results = [];
      for (name in _ref1) {
        value = _ref1[name];
        try {
          newname = name === 'count(*)' ? 'count(1)' : polyjs.parser.unbracket(polyjs.parser.parse(name).pretty());
          if (!this.spec.meta[newname] && this.spec.meta[name]) {
            _results.push(this.spec.meta[newname] = this.spec.meta[name]);
          } else {
            _results.push(void 0);
          }
        } catch (_error) {

        }
      }
      return _results;
    };

    NumeralItem.prototype._renderPolyJSItem = function(spec, loaded, callback) {
      spec = $.extend(true, {}, spec);
      if (spec.title == null) {
        spec.title = "" + spec.tableName + "." + spec.value["var"];
      }
      return polyjs.numeral(spec, loaded, callback);
    };

    NumeralItem.prototype.serialize = function(s) {
      var spec;
      if (s == null) {
        s = {};
      }
      spec = $.extend(true, s, this.spec);
      delete spec.dom;
      delete spec.data;
      return NumeralItem.__super__.serialize.call(this, {
        itemType: 'NumeralItem',
        spec: spec
      });
    };

    NumeralItem.prototype.editNumeral = function() {
      Events.ui.numeral.edit.trigger();
      return Events.nav.numeralbuilder.open.trigger({
        spec: this.spec,
        numeralView: this
      });
    };

    return NumeralItem;

  })(PolyJSItem);

  module.exports = NumeralItem;

}).call(this);
}, "poly/main/dash/item/pivottable": function(exports, require, module) {(function() {
  var CONST, Events, PivotTableItem, PolyJSItem, TOAST,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Events = require('poly/main/events');

  PolyJSItem = require('poly/main/dash/item/polyjs');

  CONST = require('poly/main/const');

  TOAST = require('poly/main/error/toast');

  PivotTableItem = (function(_super) {
    __extends(PivotTableItem, _super);

    PivotTableItem.prototype.minWidth = 6;

    PivotTableItem.prototype.minHeight = 4;

    PivotTableItem.prototype.templateName = 'tmpl-pivottable-item';

    function PivotTableItem(spec, position) {
      this.spec = spec != null ? spec : null;
      if (position == null) {
        position = {};
      }
      this.editPivot = __bind(this.editPivot, this);
      this._renderPolyJSItem = __bind(this._renderPolyJSItem, this);
      this._initSpec = __bind(this._initSpec, this);
      position.width || (position.width = 16);
      position.height || (position.height = 10);
      PivotTableItem.__super__.constructor.call(this, this.spec, position);
    }

    PivotTableItem.prototype._initSpec = function() {
      var name, newname, prop, tableName, val, value, _ref, _ref1, _results;
      if (!this.spec.data && this.spec.tableName) {
        tableName = this.spec.tableName;
        _ref = this.spec.meta;
        for (prop in _ref) {
          val = _ref[prop];
          if (tableName != null) {
            break;
          }
          if (_.isObject(val) && 'var' in val && 'tableName' in val) {
            tableName = val.tableName;
          }
        }
        this.spec.data = this.tableMetaData.polyJsObjectFor({
          tableName: tableName
        });
      }
      _ref1 = this.spec.meta;
      _results = [];
      for (name in _ref1) {
        value = _ref1[name];
        try {
          newname = name === 'count(*)' ? 'count(1)' : polyjs.parser.unbracket(polyjs.parser.parse(name).pretty());
          if (!this.spec.meta[newname] && this.spec.meta[name]) {
            _results.push(this.spec.meta[newname] = this.spec.meta[name]);
          } else {
            _results.push(void 0);
          }
        } catch (_error) {

        }
      }
      return _results;
    };

    PivotTableItem.prototype._renderPolyJSItem = function(spec, loaded, callback) {
      spec = $.extend(true, {}, spec);
      if (spec.title == null) {
        spec.title = spec.tableName;
      }
      return polyjs.pivot(spec, loaded, callback);
    };

    PivotTableItem.prototype.serialize = function(s) {
      var spec;
      if (s == null) {
        s = {};
      }
      spec = $.extend(true, s, this.spec);
      delete spec.dom;
      delete spec.data;
      return PivotTableItem.__super__.serialize.call(this, {
        itemType: 'PivotTableItem',
        spec: spec
      });
    };

    PivotTableItem.prototype.editPivot = function() {
      Events.ui.pivottable.edit.trigger();
      return Events.nav.tablebuilder.open.trigger({
        spec: this.spec,
        tableView: this
      });
    };

    return PivotTableItem;

  })(PolyJSItem);

  module.exports = PivotTableItem;

}).call(this);
}, "poly/main/dash/item/polyjs": function(exports, require, module) {(function() {
  var Animation, CONST, DashItem, Events, PADDING, PolyJSItem, TOAST,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Animation = require('poly/main/anim');

  DashItem = require('poly/main/dash/item/base');

  Events = require('poly/main/events');

  CONST = require('poly/main/const');

  TOAST = require('poly/main/error/toast');

  PADDING = 10;

  PolyJSItem = (function(_super) {
    __extends(PolyJSItem, _super);

    function PolyJSItem(spec, position) {
      this.spec = spec != null ? spec : null;
      this.deserialize = __bind(this.deserialize, this);
      this.setSpec = __bind(this.setSpec, this);
      this._redraw = __bind(this._redraw, this);
      this.onResize = __bind(this.onResize, this);
      this._initSpec = __bind(this._initSpec, this);
      this.init = __bind(this.init, this);
      this.redraw = _.debounce(this._redraw, 300, true);
      if (!this.templateName) {
        this.templateName = 'tmpl-chart-item';
      }
      PolyJSItem.__super__.constructor.call(this, position);
    }

    PolyJSItem.prototype.init = function(dom) {
      var _this = this;
      PolyJSItem.__super__.init.call(this, dom);
      this.itemdom = $('.chart-inner, .inner', dom);
      this.spec.dom = this.itemdom[0];
      this._initSpec();
      Events.error.polyjs.data.on(function(event) {
        return _this.loadingAnim.stopOnImage("/static/main/images/broken_chart.svg");
      });
      return this.onResize();
    };

    PolyJSItem.prototype._initSpec = function() {
      return Error("Not implemented");
    };

    PolyJSItem.prototype.onResize = function() {
      if (this.itemdom) {
        return this.redraw();
      }
    };

    PolyJSItem.prototype._redraw = function() {
      var prepare,
        _this = this;
      if (!this.itemdom) {
        throw "Can't make chart before init() is called!";
      }
      this.spec.width = this.itemdom.width() - PADDING;
      this.spec.height = this.itemdom.height() - PADDING;
      prepare = this.isViewer() ? function() {} : function() {
        return _this.itemdom.empty();
      };
      return this._renderPolyJSItem(this.spec, this.loaded, prepare);
    };

    PolyJSItem.prototype.setSpec = function(spec, isDeserializing) {
      this.spec = spec;
      if (isDeserializing == null) {
        isDeserializing = false;
      }
      if (!isDeserializing) {
        return Events.model.dashboarditem.update.trigger();
      }
    };

    PolyJSItem.prototype.deserialize = function(s) {
      this.setSpec(s.spec, true);
      return PolyJSItem.__super__.deserialize.call(this, s);
    };

    return PolyJSItem;

  })(DashItem);

  module.exports = PolyJSItem;

}).call(this);
}, "poly/main/dash/item/text": function(exports, require, module) {(function() {
  var CONST, DashItem, Events, TextItem,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  DashItem = require('poly/main/dash/item/base');

  Events = require('poly/main/events');

  CONST = require('poly/main/const');

  TextItem = (function(_super) {
    __extends(TextItem, _super);

    function TextItem(textContent, position, defaultText) {
      this.textContent = textContent;
      if (position == null) {
        position = {};
      }
      this.defaultText = defaultText != null ? defaultText : 'Type here...';
      this.deserialize = __bind(this.deserialize, this);
      this.serialize = __bind(this.serialize, this);
      this.init = __bind(this.init, this);
      if (!ko.isObservable(this.textContent)) {
        this.textContent = ko.observable(this.textContent);
      }
      if (!this.templateName) {
        this.templateName = 'tmpl-text-item';
      }
      TextItem.__super__.constructor.call(this, position);
    }

    TextItem.prototype.init = function(dom) {
      this.dom = dom;
      TextItem.__super__.init.call(this, dom);
      return this.loaded();
    };

    TextItem.prototype.onEditAreaBlur = function() {
      Events.model.dashboarditem.update.trigger();
      return true;
    };

    TextItem.prototype.serialize = function(s) {
      var _ref;
      if (s == null) {
        s = {};
      }
      s.itemType = (_ref = s.itemType) != null ? _ref : 'TextItem';
      s.textContent = this.textContent();
      return TextItem.__super__.serialize.call(this, s);
    };

    TextItem.prototype.deserialize = function(s) {
      if (s.textContent) {
        this.textContent(s.textContent);
      }
      return TextItem.__super__.deserialize.call(this, s);
    };

    return TextItem;

  })(DashItem);

  module.exports = TextItem;

}).call(this);
}, "poly/main/dash/quickadd": function(exports, require, module) {(function() {
  var AbstractExpandableQuickAdd, AbstractQuickAdd, CONST, DND, Events, JoinsView, QuickAddAesthetic, QuickAddBarItemView, QuickAddCommentView, QuickAddItemView, QuickAddLineItemView, QuickAddNumeralView, QuickAddPieItemView, QuickAddTableMetricView, QuickAddTableView, QuickAddView, TOAST, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Events = require('poly/main/events');

  QuickAddAesthetic = require('poly/main/dash/aes');

  QuickAddTableMetricView = require('poly/main/data/metric/quickaddtable');

  JoinsView = require('poly/main/chart/joins').JoinsView;

  CONST = require('poly/main/const');

  DND = require('poly/main/dnd');

  TOAST = require('poly/main/error/toast');

  QuickAddView = (function() {
    function QuickAddView(tableMetaData) {
      this.newCustomTable = __bind(this.newCustomTable, this);
      this.newCustomChart = __bind(this.newCustomChart, this);
      this.clearOther = __bind(this.clearOther, this);
      this.lineView = new QuickAddLineItemView({
        name: 'Line Chart',
        img: 'line',
        aes1: 'X Axis',
        aes2: 'Y Axis',
        tableMetaData: tableMetaData
      });
      Events.ui.quickadd.expand.onElem(this.lineView, this.clearOther);
      this.barView = new QuickAddBarItemView({
        name: 'Bar Chart',
        img: 'bar',
        aes1: 'X Axis',
        aes2: 'Y Axis',
        tableMetaData: tableMetaData
      });
      Events.ui.quickadd.expand.onElem(this.barView, this.clearOther);
      this.pieView = new QuickAddPieItemView({
        name: 'Pie Chart',
        img: 'pie',
        aes1: 'Categories',
        aes2: 'Values',
        tableMetaData: tableMetaData
      });
      Events.ui.quickadd.expand.onElem(this.pieView, this.clearOther);
      this.commentView = new QuickAddCommentView({
        name: 'Annotation',
        img: 'annotation'
      });
      this.numeralView = new QuickAddNumeralView({
        tableMetaData: tableMetaData
      });
      this.tableView = new QuickAddTableView({
        tableMetaData: tableMetaData
      });
    }

    QuickAddView.prototype.clearOther = function(event, params) {
      var elem, item, _i, _len, _ref, _results;
      elem = params.elem;
      _ref = [this.lineView, this.barView, this.pieView, this.numeralView];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        if (item !== elem) {
          _results.push(item.expanded(false));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    QuickAddView.prototype.initQuickAddItem = function(domElements, view) {
      return view.afterRender(domElements[0]);
    };

    QuickAddView.prototype.newCustomChart = function() {
      Events.ui.quickadd.click.trigger({
        info: {
          name: "Custom"
        }
      });
      return Events.nav.chartbuilder.open.trigger();
    };

    QuickAddView.prototype.newCustomTable = function() {
      Events.ui.quickadd.click.trigger({
        info: {
          name: "CustomTable"
        }
      });
      return Events.nav.tablebuilder.open.trigger();
    };

    return QuickAddView;

  })();

  AbstractQuickAdd = (function() {
    function AbstractQuickAdd() {
      this.addItem = __bind(this.addItem, this);
    }

    AbstractQuickAdd.prototype.addItem = function() {
      throw "Need to be defined";
    };

    return AbstractQuickAdd;

  })();

  AbstractExpandableQuickAdd = (function(_super) {
    __extends(AbstractExpandableQuickAdd, _super);

    function AbstractExpandableQuickAdd(params) {
      this._makeMeta = __bind(this._makeMeta, this);
      this.collapse = __bind(this.collapse, this);
      this.toggleExpand = __bind(this.toggleExpand, this);
      this.onCollapse = __bind(this.onCollapse, this);
      this.onExpand = __bind(this.onExpand, this);
      var _this = this;
      AbstractExpandableQuickAdd.__super__.constructor.call(this, params);
      this.tableMetaData = params.tableMetaData;
      this.successIndicatorVisible = ko.observable(false);
      this.expanded = ko.observable(false);
      this.expanded.subscribe(function(isExpanded) {
        if (isExpanded) {
          Events.ui.quickadd.expand.trigger({
            info: {
              name: _this.name
            }
          });
          _this.onExpand();
        }
        if (!isExpanded) {
          Events.ui.quickadd.collapse.trigger({
            info: {
              name: _this.name
            }
          });
          _this.onCollapse();
          return setTimeout(function() {
            return _this.successIndicatorVisible(false);
          }, 500);
        }
      });
      this.maxHeight = ko.observable(0);
      this.renderHeight = ko.computed(function() {
        if (_this.expanded()) {
          return _this.maxHeight();
        } else {
          return 0;
        }
      });
    }

    AbstractExpandableQuickAdd.prototype.onExpand = function() {
      throw "Need to be defined";
    };

    AbstractExpandableQuickAdd.prototype.onCollapse = function() {
      throw "Need to be defined";
    };

    AbstractExpandableQuickAdd.prototype.toggleExpand = function(view, event) {
      this.expanded(!this.expanded());
      Events.ui.quickadd.expand.triggerElem(this, {
        elem: this
      });
      return this._recalculateExpansion(event.target);
    };

    AbstractExpandableQuickAdd.prototype.collapse = function() {
      this.expanded(false);
      return Events.ui.dropdown.enable.trigger();
    };

    AbstractExpandableQuickAdd.prototype._recalculateExpansion = function(domElementInView) {
      var expansion;
      if ($(domElementInView).hasClass('quickadd-container')) {
        expansion = $(domElementInView).find('.expansion');
      } else {
        expansion = $(domElementInView).parents('.quickadd-container').find('.expansion');
      }
      return this.maxHeight(expansion.children().outerHeight());
    };

    AbstractExpandableQuickAdd.prototype._makeMeta = function(aeses) {
      var aes, meta, _i, _len;
      meta = {};
      for (_i = 0, _len = aeses.length; _i < _len; _i++) {
        aes = aeses[_i];
        meta[aes.fullFormula(this.tableMetaData, true)] = _.extend(aes.fullMeta(), {
          tableName: aes.tableName,
          dsKey: this.tableMetaData.dsKey
        });
      }
      return meta;
    };

    return AbstractExpandableQuickAdd;

  })(AbstractQuickAdd);

  QuickAddItemView = (function(_super) {
    __extends(QuickAddItemView, _super);

    function QuickAddItemView(params) {
      this._addItem = __bind(this._addItem, this);
      this.addItem = __bind(this.addItem, this);
      this.onCollapse = __bind(this.onCollapse, this);
      this.onExpand = __bind(this.onExpand, this);
      this.checkRemoveMetric = __bind(this.checkRemoveMetric, this);
      this.checkNewMetric = __bind(this.checkNewMetric, this);
      var _this = this;
      QuickAddItemView.__super__.constructor.call(this, params);
      this.name = params.name, this.img = params.img, this.aes1 = params.aes1, this.aes2 = params.aes2, this.tableMetaData = params.tableMetaData;
      this.imageClass = "large-icon img-icon-" + this.img;
      this.metricView1 = new QuickAddAesthetic(this, this.aes1, this.options1, this.tableMetaData);
      this.metricView2 = new QuickAddAesthetic(this, this.aes2, this.options2, this.tableMetaData);
      this.joinsView = new JoinsView(this.tableMetaData, {}, this);
      this.attachedMetrics = ko.computed(function() {
        return _.compact([_this.metricView1.metric(), _this.metricView2.metric()]);
      });
    }

    QuickAddItemView.prototype.checkNewMetric = function(event, item, callback) {
      return this.joinsView.checkAddJoins(event, item, callback);
    };

    QuickAddItemView.prototype.checkRemoveMetric = function(event, item) {
      return this.joinsView.checkRemoveJoins();
    };

    QuickAddItemView.prototype.onExpand = function() {
      this.metricView1.clear();
      this.metricView2.clear();
      return this.joinsView.reset();
    };

    QuickAddItemView.prototype.onCollapse = function() {
      this.metricView1.disable();
      return this.metricView2.disable();
    };

    QuickAddItemView.prototype.addItem = function() {
      var m1, m2, _ref,
        _this = this;
      if (this.metricView1.metric() && this.metricView2.metric()) {
        _ref = [this.metricView1.metric(), this.metricView2.metric()], m1 = _ref[0], m2 = _ref[1];
        if (m1.gaType !== 'none' && m2.gaType !== 'none' && ('ga-metric' !== m1.gaType && 'ga-metric' !== m2.gaType)) {
          return TOAST.raise("Google Analytics charts require at least one metric—orange—item!");
        } else {
          return this._addItem(function(success) {
            if (success) {
              _this.successIndicatorVisible(true);
              Events.ui.dropdown.disable.trigger();
              _this.metricView1.disable();
              _this.metricView2.disable();
              return setTimeout(_this.collapse, 2000);
            }
          });
        }
      }
    };

    QuickAddItemView.prototype._addItem = function() {
      return Events.ui.chart.add.trigger({
        spec: null
      });
    };

    return QuickAddItemView;

  })(AbstractExpandableQuickAdd);

  QuickAddLineItemView = (function(_super) {
    __extends(QuickAddLineItemView, _super);

    function QuickAddLineItemView() {
      this._addItem = __bind(this._addItem, this);
      this.options2 = __bind(this.options2, this);
      this.options1 = __bind(this.options1, this);
      _ref = QuickAddLineItemView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    QuickAddLineItemView.prototype.options1 = function() {
      return CONST.layers.line.x;
    };

    QuickAddLineItemView.prototype.options2 = function() {
      return CONST.layers.line.y;
    };

    QuickAddLineItemView.prototype._addItem = function(callback) {
      var layer, x, y;
      x = this.metricView1.metric();
      y = this.metricView2.metric();
      layer = {
        meta: this._makeMeta([x, y]),
        type: 'line',
        x: x.generateSpec(this.tableMetaData),
        y: y.generateSpec(this.tableMetaData),
        additionalInfo: {
          joins: this.joinsView.generateSpec()
        }
      };
      Events.ui.chart.add.trigger({
        spec: {
          layer: layer
        }
      });
      return callback(true);
    };

    return QuickAddLineItemView;

  })(QuickAddItemView);

  QuickAddBarItemView = (function(_super) {
    __extends(QuickAddBarItemView, _super);

    function QuickAddBarItemView(params) {
      this._addItem = __bind(this._addItem, this);
      this.options2 = __bind(this.options2, this);
      this.options1 = __bind(this.options1, this);
      QuickAddBarItemView.__super__.constructor.call(this, params);
      this.metricView2.dropFilter = function(dom) {
        var _ref1;
        return (_ref1 = $(dom).data('dnd-data').meta.type) === 'date' || _ref1 === 'num';
      };
    }

    QuickAddBarItemView.prototype.options1 = function() {
      return CONST.layers.bar.x;
    };

    QuickAddBarItemView.prototype.options2 = function() {
      return CONST.layers.bar.y;
    };

    QuickAddBarItemView.prototype._addItem = function(callback) {
      var layer, x, y;
      x = this.metricView1.metric();
      y = this.metricView2.metric();
      layer = {
        type: 'bar',
        meta: this._makeMeta([x, y]),
        x: x.generateSpec(this.tableMetaData),
        y: y.generateSpec(this.tableMetaData),
        additionalInfo: {
          joins: this.joinsView.generateSpec()
        }
      };
      Events.ui.chart.add.trigger({
        spec: {
          layer: layer
        }
      });
      return callback(true);
    };

    return QuickAddBarItemView;

  })(QuickAddItemView);

  QuickAddPieItemView = (function(_super) {
    __extends(QuickAddPieItemView, _super);

    function QuickAddPieItemView(params) {
      this._addItem = __bind(this._addItem, this);
      this.options2 = __bind(this.options2, this);
      this.options1 = __bind(this.options1, this);
      QuickAddPieItemView.__super__.constructor.call(this, params);
      this.metricView2.dropFilter = function(dom) {
        var _ref1;
        return (_ref1 = $(dom).data('dnd-data').meta.type) === 'date' || _ref1 === 'num';
      };
    }

    QuickAddPieItemView.prototype.options1 = function() {
      return CONST.layers.bar.color;
    };

    QuickAddPieItemView.prototype.options2 = function() {
      return CONST.layers.bar.y;
    };

    QuickAddPieItemView.prototype._addItem = function(callback) {
      var col, layer, y;
      col = this.metricView1.metric();
      y = this.metricView2.metric();
      layer = {
        type: 'bar',
        meta: this._makeMeta([col, y]),
        color: col.generateSpec(this.tableMetaData),
        y: y.generateSpec(this.tableMetaData),
        additionalInfo: {
          joins: this.joinsView.generateSpec()
        }
      };
      Events.ui.chart.add.trigger({
        spec: {
          layer: layer,
          coord: {
            type: 'polar'
          },
          guides: {
            x: {
              position: 'none',
              padding: 0
            },
            y: {
              position: 'none',
              padding: 0
            }
          }
        }
      });
      return callback(true);
    };

    return QuickAddPieItemView;

  })(QuickAddItemView);

  QuickAddCommentView = (function(_super) {
    __extends(QuickAddCommentView, _super);

    function QuickAddCommentView() {
      this.addItem = __bind(this.addItem, this);
      this.name = "Annotation";
      this.imageClass = "large-icon img-icon-annotation";
    }

    QuickAddCommentView.prototype.addItem = function() {
      return Events.ui.quickadd.add.trigger({
        itemType: "CommentItem"
      });
    };

    return QuickAddCommentView;

  })(AbstractQuickAdd);

  QuickAddNumeralView = (function(_super) {
    __extends(QuickAddNumeralView, _super);

    QuickAddNumeralView.prototype.options = function() {
      return CONST.numeral.value;
    };

    function QuickAddNumeralView(params) {
      this._addItem = __bind(this._addItem, this);
      this.addItem = __bind(this.addItem, this);
      this.onCollapse = __bind(this.onCollapse, this);
      this.onExpand = __bind(this.onExpand, this);
      this.options = __bind(this.options, this);
      var tableMetaData;
      QuickAddNumeralView.__super__.constructor.call(this, params);
      tableMetaData = params.tableMetaData;
      this.name = "Number";
      this.imageClass = "large-icon img-icon-numeral";
      this.metricView = new QuickAddAesthetic(this, 'Value', this.options, tableMetaData);
    }

    QuickAddNumeralView.prototype.onExpand = function() {
      return this.metricView.clear();
    };

    QuickAddNumeralView.prototype.onCollapse = function() {
      return this.metricView.disable();
    };

    QuickAddNumeralView.prototype.checkNewMetric = function(event, item, callback) {
      return callback();
    };

    QuickAddNumeralView.prototype.checkRemoveMetric = function() {};

    QuickAddNumeralView.prototype.addItem = function() {
      var x, _ref1;
      if (this.metricView.metric()) {
        x = this.metricView.metric();
        if ((_ref1 = x.gaType) !== 'none' && _ref1 !== 'ga-metric') {
          return TOAST.raise("Unable to create a Numeral without a number! Use a metric (orange) item!");
        } else {
          this._addItem();
          this.successIndicatorVisible(true);
          Events.ui.dropdown.disable.trigger();
          this.metricView.disable();
          return setTimeout(this.collapse, 2000);
        }
      }
    };

    QuickAddNumeralView.prototype._addItem = function() {
      var x;
      x = this.metricView.metric();
      return Events.ui.numeral.add.trigger({
        spec: {
          tableName: x.tableName,
          data: x.jsdata,
          value: x.generateSpec(this.tableMetaData),
          meta: this._makeMeta([x])
        }
      });
    };

    return QuickAddNumeralView;

  })(AbstractExpandableQuickAdd);

  QuickAddTableView = (function(_super) {
    __extends(QuickAddTableView, _super);

    QuickAddTableView.prototype.options = function() {
      return CONST.table.quickadd;
    };

    function QuickAddTableView(params) {
      this.initMetricItem = __bind(this.initMetricItem, this);
      this._addItem = __bind(this._addItem, this);
      this.addItem = __bind(this.addItem, this);
      this.discardMetric = __bind(this.discardMetric, this);
      this._addMetric = __bind(this._addMetric, this);
      this.addMetric = __bind(this.addMetric, this);
      this.attachedMetrics = __bind(this.attachedMetrics, this);
      this.onCollapse = __bind(this.onCollapse, this);
      this.onExpand = __bind(this.onExpand, this);
      this.options = __bind(this.options, this);
      var _this = this;
      QuickAddTableView.__super__.constructor.call(this, params);
      this.tableMetaData = params.tableMetaData;
      this.name = "Table";
      this.imageClass = "large-icon img-icon-table";
      this.rows = ko.observableArray();
      this.values = ko.observableArray();
      this.canAdd = ko.computed(function() {
        return _this.values().length && _this.rows().length;
      });
      this.joinsView = new JoinsView(this.tableMetaData, {}, this);
    }

    QuickAddTableView.prototype.onExpand = function() {};

    QuickAddTableView.prototype.onCollapse = function() {
      this.rows.removeAll();
      this.values.removeAll();
      if (this.joinsView != null) {
        return this.joinsView.reset({});
      }
    };

    QuickAddTableView.prototype.attachedMetrics = function() {
      return this.rows().concat(this.values());
    };

    QuickAddTableView.prototype.addMetric = function(event, item) {
      var _this = this;
      return this.joinsView.checkAddJoins(event, item, function() {
        return _this._addMetric(event, item);
      });
    };

    QuickAddTableView.prototype._addMetric = function(event, item) {
      var aes, columnInfo, metric;
      columnInfo = this.tableMetaData.getColumnInfo(item.data);
      aes = columnInfo.meta.type === 'num' ? 'values' : 'categories';
      metric = new QuickAddTableMetricView(columnInfo, this.options, aes, this.attachedMetrics);
      Events.ui.metric.add.trigger();
      Events.ui.metric.remove.onElem(metric, this.discardMetric);
      if (aes === 'categories') {
        this.rows.push(metric);
      } else {
        this.values.push(metric);
      }
      return this._recalculateExpansion(event.target);
    };

    QuickAddTableView.prototype.discardMetric = function(event, params) {
      var metric;
      metric = params.dom.data('dndMetricObj');
      if (metric.aes === 'categories') {
        this.rows.remove(metric);
      } else {
        this.values.remove(metric);
      }
      this.joinsView.checkRemoveJoins();
      return this._recalculateExpansion(event.target);
    };

    QuickAddTableView.prototype.enabled = function() {
      return this.expanded();
    };

    QuickAddTableView.prototype.dropFilter = function() {
      return true;
    };

    QuickAddTableView.prototype.addItem = function(event) {
      if (this.canAdd()) {
        this._addItem();
        this.rows.removeAll();
        this.values.removeAll();
        this.successIndicatorVisible(true);
        this._recalculateExpansion(event.target);
        Events.ui.dropdown.disable.trigger();
        return setTimeout(this.collapse, 2000);
      }
    };

    QuickAddTableView.prototype._addItem = function() {
      var metric, rowspec, valuespec;
      rowspec = (function() {
        var _i, _len, _ref1, _results;
        _ref1 = this.rows();
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          metric = _ref1[_i];
          _results.push(metric.generateSpec(this.tableMetaData));
        }
        return _results;
      }).call(this);
      valuespec = (function() {
        var _i, _len, _ref1, _results;
        _ref1 = this.values();
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          metric = _ref1[_i];
          _results.push(metric.generateSpec(this.tableMetaData));
        }
        return _results;
      }).call(this);
      return Events.ui.pivottable.add.trigger({
        spec: {
          tableName: metric.tableName,
          data: metric.jsdata,
          rows: rowspec,
          values: valuespec,
          meta: this._makeMeta(this.rows().concat(this.values())),
          additionalInfo: {
            joins: this.joinsView.generateSpec()
          }
        }
      });
    };

    QuickAddTableView.prototype.initMetricItem = function(metricDom, view) {
      DND.makeDraggable(metricDom, view);
      return view.attachDropdown(metricDom);
    };

    return QuickAddTableView;

  })(AbstractExpandableQuickAdd);

  module.exports = QuickAddView;

}).call(this);
}, "poly/main/dash/workspace": function(exports, require, module) {(function() {
  var CONST, ChartItem, CommentItem, Events, NumeralItem, PivotTableItem, TextItem, WorkspaceView,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  ChartItem = require('poly/main/dash/item/chart');

  CommentItem = require('poly/main/dash/item/comment');

  Events = require('poly/main/events');

  NumeralItem = require('poly/main/dash/item/numeral');

  PivotTableItem = require('poly/main/dash/item/pivottable');

  TextItem = require('poly/main/dash/item/text');

  CONST = require('poly/main/const');

  WorkspaceView = (function() {
    var ItemFactory, workspace;

    workspace = null;

    function WorkspaceView(title, tableMetaData, viewer) {
      var type, _i, _len, _ref,
        _this = this;
      this.title = title;
      this.tableMetaData = tableMetaData;
      if (viewer == null) {
        viewer = false;
      }
      this.removeItem = __bind(this.removeItem, this);
      this.addItem = __bind(this.addItem, this);
      this.serialize = __bind(this.serialize, this);
      this.init = __bind(this.init, this);
      this.getFreePosition = __bind(this.getFreePosition, this);
      this.shiftItems = __bind(this.shiftItems, this);
      this.getNextZIndex = __bind(this.getNextZIndex, this);
      this.initialize = __bind(this.initialize, this);
      workspace = this;
      if (!ko.isObservable(this.title)) {
        this.title = ko.observable(this.title);
      }
      this.items = ko.observableArray();
      this.gridSize = CONST.ui.grid_size;
      this.isViewer = ko.observable(viewer);
      this.maxItemZIndex = ko.computed(function() {
        var item, max, z, _i, _len, _ref, _ref1;
        max = 0;
        _ref = _this.items();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          z = (_ref1 = item.zIndex()) != null ? _ref1 : 0;
          if (z > max) {
            max = z;
          }
        }
        return max;
      });
      Events.ui.chart.add.on(function(event, params) {
        params.itemType = "ChartItem";
        return _.defer(function() {
          return _this.addItem(ItemFactory.makeItem(params, _this.tableMetaData));
        });
      });
      Events.ui.numeral.add.on(function(event, params) {
        params.itemType = "NumeralItem";
        return _.defer(function() {
          return _this.addItem(ItemFactory.makeItem(params, _this.tableMetaData));
        });
      });
      Events.ui.pivottable.add.on(function(event, params) {
        params.itemType = "PivotTableItem";
        return _.defer(function() {
          return _this.addItem(ItemFactory.makeItem(params, _this.tableMetaData));
        });
      });
      Events.ui.quickadd.add.on(function(event, params) {
        return _.defer(function() {
          return _this.addItem(ItemFactory.makeItem(params, _this.tableMetaData));
        });
      });
      Events.ui.dashboarditem.remove.on(function(event, params) {
        var item;
        item = params.item;
        return _this.removeItem(item);
      });
      Events.ui.dashboarditem.select.on(function(event, params) {
        var item, _ref;
        item = params.item;
        _this.shiftItems((_ref = item.zIndex()) != null ? _ref : 0);
        item.zIndex(_this.getNextZIndex());
        return Events.model.dashboarditem.update.trigger();
      });
      _ref = ['svg', 'pdf', 'png'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        type = _ref[_i];
        Events["export"][type].click.on(function(evt, params) {
          return params.callback(_this.serialize());
        });
      }
    }

    WorkspaceView.prototype.initialize = function(initial) {
      var _this = this;
      return _.defer(function() {
        return _.each(initial, function(itemSpec) {
          if (itemSpec.itemType !== 'TitleItem') {
            return _this.addItem(ItemFactory.makeItem(itemSpec, _this.tableMetaData), true);
          }
        });
      });
    };

    WorkspaceView.prototype.getNextZIndex = function() {
      return this.maxItemZIndex() + 1;
    };

    WorkspaceView.prototype.shiftItems = function(minZ) {
      var item, z, _i, _len, _ref, _ref1, _results;
      _ref = this.items();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        z = (_ref1 = item.zIndex()) != null ? _ref1 : 0;
        if (z >= minZ) {
          _results.push(item.zIndex(z - 1));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    WorkspaceView.prototype.getFreePosition = function() {
      var item, x, y, _i, _j;
      for (x = _i = 0; _i <= 11; x = ++_i) {
        for (y = _j = 0; _j <= 11; y = ++_j) {
          if (!_.some((function() {
            var _k, _len, _ref, _results;
            _ref = this.items();
            _results = [];
            for (_k = 0, _len = _ref.length; _k < _len; _k++) {
              item = _ref[_k];
              _results.push(item.gridLeft() === x && item.gridTop() === y);
            }
            return _results;
          }).call(this))) {
            return {
              left: x,
              top: y
            };
          }
        }
      }
    };

    WorkspaceView.prototype.init = function(dom) {
      this.dom = dom;
    };

    WorkspaceView.prototype.serialize = function() {
      var item, result, serial, _i, _len, _ref;
      result = [];
      _ref = this.items();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        serial = item.serialize();
        if (serial != null) {
          result.push(serial);
        }
      }
      return result;
    };

    WorkspaceView.prototype.addItem = function(item, isDeserializing) {
      if (isDeserializing == null) {
        isDeserializing = false;
      }
      if (!isDeserializing) {
        item.zIndex(this.getNextZIndex());
      }
      this.items.push(item);
      if (!isDeserializing) {
        return Events.model.dashboarditem.create.trigger();
      }
    };

    WorkspaceView.prototype.removeItem = function(item) {
      this.items.remove(item);
      return Events.model.dashboarditem["delete"].trigger();
    };

    ItemFactory = (function() {
      function ItemFactory() {}

      ItemFactory.ChartItem = function() {
        return new ChartItem(null, workspace.getFreePosition());
      };

      ItemFactory.NumeralItem = function() {
        return new NumeralItem(workspace.getFreePosition());
      };

      ItemFactory.PivotTableItem = function() {
        return new PivotTableItem(workspace.getFreePosition());
      };

      ItemFactory.TextItem = function() {
        return new TextItem(workspace.getFreePosition());
      };

      ItemFactory.CommentItem = function() {
        return new CommentItem(null, null, workspace.getFreePosition());
      };

      ItemFactory.makeItem = function(serial, tableMetaData) {
        var view;
        if (!serial.itemType) {
          throw "Need to specify item type!";
        }
        view = ItemFactory[serial.itemType]();
        view.deserialize(serial);
        view.tableMetaData = tableMetaData;
        view.isViewer(workspace.isViewer());
        return view;
      };

      return ItemFactory;

    }).call(this);

    return WorkspaceView;

  }).call(this);

  module.exports = WorkspaceView;

}).call(this);
}, "poly/main/data/autocomplete": function(exports, require, module) {/*
Lisa's Note:

This is mostly Jee's code that came from ggviz
It is an extension over JQuery UI Autocomplete that:
 - allows multiple items to be selected 
 - with other text between them
 - place square brackets around each selected item
Essentially, the selected items are column names, and the autocomplete is
used to assist users in typing in formulas to derive new columns based on
the existing ones.
*/


(function() {
  var autocompleteSelect, extractLast, findEnd, findLastBegin, _replace;

  _replace = function(string) {
    return string.replace(/\\\]/g, '@@').replace(/\\\[/g, '@@');
  };

  findLastBegin = function(string, _char, startIndex) {
    var index;
    string = _replace(string);
    index = startIndex;
    while (index > -1) {
      if (string.charAt(index) === _char) {
        return index;
      } else {
        index--;
      }
    }
    return -1;
  };

  findEnd = function(string, startIndex) {
    var index;
    index = startIndex;
    string = _replace(string);
    while (index < string.length) {
      if (string.charAt(index) === ']') {
        return index;
      } else {
        index++;
      }
    }
    return -1;
  };

  extractLast = function(string, selectionStart, selectionEnd) {
    var end, start, temp;
    if (selectionStart !== selectionEnd) {
      return null;
    }
    start = findLastBegin(string, '[', selectionStart);
    temp = findLastBegin(string, ']', selectionStart);
    if (temp > start && (temp !== selectionStart && temp !== string.length - 1)) {
      return null;
    }
    end = findEnd(string, start);
    if (start > -1) {
      if (end === -1) {
        return [start + 1, string.length];
      } else {
        return [start + 1, end];
      }
    }
    return null;
  };

  autocompleteSelect = function(event, ui) {
    var beginning, cursorLocation, end, newValue, oldValue, originalValue, range, replacedValue, selectionEnd, selectionStart, value;
    oldValue = this.value;
    selectionStart = this.selectionStart, selectionEnd = this.selectionEnd;
    range = extractLast(oldValue, selectionStart, selectionEnd);
    if (range === null) {
      return;
    }
    beginning = oldValue.substring(0, range[0]);
    end = oldValue.substring(range[1]);
    originalValue = ui.item.value;
    replacedValue = originalValue;
    value = replacedValue;
    if (!(end.length > 0 && end.charAt(0) === ']')) {
      value += ']';
    }
    newValue = beginning + value + end;
    this.value = newValue;
    cursorLocation = beginning.length + replacedValue.length + 1;
    return cursorLocation;
  };

  module.exports = {
    findLastBegin: findLastBegin,
    findEnd: findEnd,
    extractLast: extractLast,
    autocompleteSelect: autocompleteSelect,
    unescape: unescape
  };

}).call(this);
}, "poly/main/data/columnInfo": function(exports, require, module) {/*
This object should have all the metadata related to a metric.
Rather, this has all the objects that are true of a column, regarldess
of whether/how it is displayed
*/


(function() {
  var ColumnInfo,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  ColumnInfo = (function() {
    function ColumnInfo(dsInfo, params) {
      this.getFormula = __bind(this.getFormula, this);
      this.getParsedFormula = __bind(this.getParsedFormula, this);
      this.name = dsInfo.name, this.tableName = dsInfo.tableName;
      this.meta = params.meta, this.formula = params.formula;
      this.meta.tableName = this.tableName;
      this.gaType = this.meta.ga ? "ga-" + this.meta.ga : 'none';
    }

    ColumnInfo.prototype.getParsedFormula = function(tableMetaData, visited) {
      var expr, key, visit, visitor,
        _this = this;
      if (visited == null) {
        visited = [];
      }
      if (!this.formula) {
        if (this.name === 'count(*)') {
          return polyjs.parser.parse("count(1)");
        } else {
          key = polyjs.parser.bracket("" + this.tableName + "." + this.name);
          return polyjs.parser.parse(key);
        }
      }
      if (_.has(visited, this.name)) {
        throw Error("One of your formulas containing " + this.name + " is recursive!");
      }
      visited.push(this.name);
      expr = polyjs.parser.parse(this.formula);
      visit = function(name) {
        var ci;
        ci = tableMetaData.getColumnInfo({
          name: name,
          tableName: _this.tableName
        });
        return ci.getParsedFormula(tableMetaData, visited);
      };
      if (expr.name) {
        return visit(expr.name);
      }
      visitor = {
        ident: function(expr, name) {},
        "const": function(expr, val, type) {},
        call: function(expr, fname, targs) {
          var arg, i, _i, _len, _ref, _results;
          _ref = expr.args;
          _results = [];
          for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
            arg = _ref[i];
            if (arg.name) {
              _results.push(expr.args[i] = visit(arg.name));
            } else {
              _results.push(void 0);
            }
          }
          return _results;
        },
        infixop: function(expr, opname, tlhs, trhs) {
          var _i, _len, _ref, _results;
          _ref = ['lhs', 'rhs'];
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            key = _ref[_i];
            if (expr[key].name) {
              _results.push(expr[key] = visit(expr[key].name));
            } else {
              _results.push(void 0);
            }
          }
          return _results;
        },
        conditional: function(expr, tcond, tconseq, taltern) {
          var _i, _len, _ref, _results;
          _ref = ['condition', 'consequent', 'alternative'];
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            key = _ref[_i];
            if (expr[key].name) {
              _results.push(expr[key] = visit(expr[key].name));
            } else {
              _results.push(void 0);
            }
          }
          return _results;
        }
      };
      expr.visit(visitor);
      return expr;
    };

    ColumnInfo.prototype.getFormula = function(tableMetaData, unbracket) {
      var f;
      if (unbracket == null) {
        unbracket = false;
      }
      f = this.getParsedFormula(tableMetaData).pretty();
      if (unbracket) {
        return polyjs.parser.unbracket(f);
      } else {
        return f;
      }
    };

    return ColumnInfo;

  })();

  module.exports = ColumnInfo;

}).call(this);
}, "poly/main/data/dataSource": function(exports, require, module) {(function() {
  var DEFAULT_BACKEND, DataSource, Events, LocalDataSource, RemoteDataSource, TOAST, serverApi,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Events = require('poly/main/events');

  TOAST = require('poly/main/error/toast');

  serverApi = require('poly/common/serverApi');

  DataSource = (function() {
    DataSource.prototype.dsType = 'abstract';

    function DataSource() {
      throw new Error('DataSource is abstract');
    }

    DataSource.prototype.listTables = function(callback) {
      throw new Error('DataSource is abstract');
    };

    DataSource.prototype.createPolyJsData = function(meta) {
      throw new Error('DataSource is abstract');
    };

    DataSource.prototype.getRange = function(column, callback) {
      throw new Error('DataSource is abstract');
    };

    return DataSource;

  })();

  LocalDataSource = (function(_super) {
    __extends(LocalDataSource, _super);

    LocalDataSource.prototype.dsType = 'local';

    function LocalDataSource(tables) {
      this.createPolyJsData = __bind(this.createPolyJsData, this);
      this.listTables = __bind(this.listTables, this);
      var column, columnName, item, jsData, jsMeta, meta, newItem, table, _i, _j, _len, _len1, _ref, _ref1, _ref2;
      this._localData = tables;
      this._tableList = {};
      for (_i = 0, _len = tables.length; _i < _len; _i++) {
        table = tables[_i];
        if (_.isArray(table.data)) {
          jsData = [];
          _ref = table.data;
          for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
            item = _ref[_j];
            newItem = {};
            for (columnName in item) {
              column = item[columnName];
              newItem["" + table.name + "." + columnName] = column;
            }
            jsData.push(newItem);
          }
        } else if (_.isObject(table.data)) {
          jsData = {};
          _ref1 = table.data;
          for (columnName in _ref1) {
            column = _ref1[columnName];
            jsData["" + table.name + "." + columnName] = column;
          }
        }
        jsMeta = {};
        _ref2 = table.meta;
        for (columnName in _ref2) {
          meta = _ref2[columnName];
          jsMeta["" + table.name + "." + columnName] = meta;
        }
        this._tableList[table.name] = {
          name: table.name,
          meta: table.meta,
          jsdata: polyjs.data({
            data: jsData,
            meta: jsMeta
          }),
          rawdata: polyjs.data(table)
        };
      }
    }

    LocalDataSource.prototype.listTables = function(callback) {
      return callback(null, this._tableList);
    };

    LocalDataSource.prototype.createPolyJsData = function(meta) {
      var aes, submeta, tableName;
      tableName = meta.tableName;
      for (aes in meta) {
        submeta = meta[aes];
        if (tableName === null) {
          tableName = submeta.tableName;
        }
      }
      return this._tableList[tableName].rawdata;
    };

    LocalDataSource.prototype.getRange = function(_arg, callback) {
      var base, dataspec, derived, fullFormula, jsdata, max, meta, min, name, tableName, type, wrappedCallback,
        _this = this;
      tableName = _arg.tableName, name = _arg.name, derived = _arg.derived, fullFormula = _arg.fullFormula, type = _arg.type;
      if (callback == null) {
        callback = function() {};
      }
      jsdata = this._tableList[tableName].jsdata;
      if (type === 'cat') {
        base = polyjs.parser.getExpression(fullFormula).expr;
        meta = {};
        meta["" + (polyjs.parser.unbracket(fullFormula))] = {
          type: type
        };
        dataspec = {
          select: [base],
          stats: {
            stats: [],
            groups: []
          },
          trans: derived ? [base] : [],
          filter: [],
          limit: 100,
          meta: meta
        };
      } else {
        base = polyjs.parser.getExpression(fullFormula).expr;
        min = polyjs.parser.getExpression("min(" + fullFormula + ")").expr;
        max = polyjs.parser.getExpression("max(" + fullFormula + ")").expr;
        meta = {};
        meta["min(" + fullFormula + ")"] = {
          type: type
        };
        meta["max(" + fullFormula + ")"] = {
          type: type
        };
        dataspec = {
          select: [min, max],
          stats: {
            stats: [
              {
                name: "min",
                expr: min,
                args: [base]
              }, {
                name: "max",
                expr: max,
                args: [base]
              }
            ],
            groups: []
          },
          trans: derived ? [base] : [],
          filter: [],
          limit: 2,
          meta: meta
        };
      }
      wrappedCallback = function(err, jsdata) {
        var formula, values;
        if (err != null) {
          TOAST.raise(err.message);
          callback(err);
          return;
        }
        if (type === 'cat') {
          formula = polyjs.parser.unbracket(fullFormula);
          return callback(null, {
            values: _.uniq(_.pluck(jsdata.raw, formula))
          });
        } else {
          values = _.toArray(jsdata.raw[0]);
          return callback(null, {
            min: values[0],
            max: values[1]
          });
        }
      };
      return jsdata.getData(wrappedCallback, dataspec);
    };

    return LocalDataSource;

  })(DataSource);

  DEFAULT_BACKEND = function(request, callback) {
    var params, path;
    path = "/data-source/" + (encodeURIComponent(request.dataSourceKey));
    if (request.command === 'listTables') {
      path += '/tables/list';
      params = {};
    } else if (request.command === 'getColumnMetadata') {
      path += '/tables/meta';
      params = {
        tableName: request.tableName,
        columnExpr: request.columnExpr,
        type: request.dataType
      };
    } else if (request.command === 'queryTable') {
      path += '/tables/query';
      params = {
        spec: JSON.stringify(request.query)
      };
    }
    return serverApi.sendQueryPost(path, params, callback);
  };

  RemoteDataSource = (function(_super) {
    __extends(RemoteDataSource, _super);

    function RemoteDataSource(dataSourceKey, backend, dsType) {
      this.dataSourceKey = dataSourceKey;
      this.backend = backend != null ? backend : DEFAULT_BACKEND;
      this.dsType = dsType;
    }

    RemoteDataSource.prototype.listTables = function(callback) {
      var _this = this;
      return this.backend({
        command: 'listTables',
        dataSourceKey: this.dataSourceKey
      }, function(err, tables) {
        var col, result, table, _i, _len;
        if (err) {
          callback(err, null);
          return;
        }
        result = {};
        for (_i = 0, _len = tables.length; _i < _len; _i++) {
          table = tables[_i];
          result[table.name] = table;
          result[table.name].jsdata = _this.createPolyJsData(table.name);
          for (col in result[table.name].meta) {
            result[table.name].meta[col].dsKey = _this.dataSourceKey;
          }
        }
        if (_.values(_.values(result)[0].meta)[0].ga != null) {
          Events.ui.ga.notify.trigger();
        }
        return callback(null, result);
      });
    };

    RemoteDataSource.prototype.createPolyJsData = function(meta) {
      var aes, cache, submeta, tableName,
        _this = this;
      tableName = meta.tableName;
      for (aes in meta) {
        submeta = meta[aes];
        if (tableName != null) {
          break;
        }
        tableName = submeta.tableName;
      }
      cache = {};
      return polyjs.data.api(function(requestParams, callback) {
        var key, paramJson, val, _ref;
        _ref = requestParams.meta;
        for (key in _ref) {
          val = _ref[key];
          if (key !== '_additionalInfo') {
            if (tableName && !val.tableName) {
              val.tableName = tableName;
            }
            if (!('dsKey' in val)) {
              val.dsKey = _this.dataSourceKey;
            }
          }
          requestParams.meta[key] = _.extend(requestParams.meta[key], val);
        }
        paramJson = JSON.stringify(requestParams);
        if (paramJson in cache && _.size(cache[paramJson].data) > 0) {
          return callback(null, cache[paramJson]);
        } else {
          return _this.backend({
            command: 'queryTable',
            dataSourceKey: _this.dataSourceKey,
            query: requestParams
          }, function(err, res) {
            var _ref1;
            if (err) {
              callback(err, null);
            } else {
              if (res != null ? (_ref1 = res.data) != null ? _ref1.length : void 0 : void 0) {
                cache[paramJson] = res;
                callback(null, res);
              } else {
                callback({
                  message: "No data matching criteria"
                }, res);
              }
            }
            return null;
          });
        }
      });
    };

    RemoteDataSource.prototype.getRange = function(_arg, callback) {
      var derived, fullFormula, name, tableName, type;
      tableName = _arg.tableName, name = _arg.name, derived = _arg.derived, fullFormula = _arg.fullFormula, type = _arg.type;
      return this.backend({
        command: 'getColumnMetadata',
        dataSourceKey: this.dataSourceKey,
        tableName: tableName,
        columnExpr: JSON.stringify(polyjs.parser.getExpression(fullFormula).expr),
        dataType: type
      }, function(err, meta) {
        if (err) {
          callback(err, null);
          return;
        }
        return callback(null, meta);
      });
    };

    return RemoteDataSource;

  })(DataSource);

  module.exports = {
    LocalDataSource: LocalDataSource,
    RemoteDataSource: RemoteDataSource
  };

}).call(this);
}, "poly/main/data/dataView": function(exports, require, module) {(function() {
  var DataView, Events, TOAST, TableMetricListView,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Events = require('poly/main/events');

  TableMetricListView = require('poly/main/data/tableView');

  TOAST = require('poly/main/error/toast');

  DataView = (function() {
    function DataView(dataSource) {
      var _this = this;
      this.dataSource = dataSource;
      this.serialize = __bind(this.serialize, this);
      this.getExtendedMetaAsync = __bind(this.getExtendedMetaAsync, this);
      this.getPolyJsObject = __bind(this.getPolyJsObject, this);
      this.getTableMetaData = __bind(this.getTableMetaData, this);
      this.getColumnInfo = __bind(this.getColumnInfo, this);
      this.addInitialCols = __bind(this.addInitialCols, this);
      this._doInitialize = __bind(this._doInitialize, this);
      this.initialize = __bind(this.initialize, this);
      this.tables = ko.observable({});
      this.tableViews = ko.observableArray();
      Events.ui.table.focus.on(function(evt, info) {
        var name;
        name = info.name;
        if (name != null) {
          return _this.selectByName(name);
        }
      });
    }

    DataView.prototype.initialize = function(initialCols, callback) {
      var _this = this;
      this.initialCols = initialCols != null ? initialCols : [];
      return this.dataSource.listTables(function(err, result) {
        if (err) {
          console.error(err);
          TOAST.raise("An error occurred while listing tables");
          return;
        }
        _this._doInitialize(result);
        if (callback) {
          return callback();
        }
      });
    };

    DataView.prototype._doInitialize = function(newTables) {
      var first, tableData, tableName, tables;
      if (newTables == null) {
        newTables = [];
      }
      tables = this.tables();
      first = true;
      for (tableName in newTables) {
        tableData = newTables[tableName];
        tables[tableName] = new TableMetricListView(tableData, this);
        tables[tableName].selected(first);
        first = false;
      }
      this.tables(tables);
      this.tableViews(_.values(tables));
      return this.addInitialCols();
    };

    DataView.prototype.addInitialCols = function() {
      var item, tables, _i, _len, _ref;
      tables = this.tables();
      _ref = this.initialCols;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        tables[item.tableName].newDerivedMetric(null, item);
      }
      return this.initialCols = [];
    };

    DataView.prototype.clearSelection = function() {
      var t, _i, _len, _ref, _results;
      _ref = this.tableViews();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        t = _ref[_i];
        _results.push(t.selected(false));
      }
      return _results;
    };

    DataView.prototype.selectByName = function(name) {
      var t, _i, _len, _ref, _results;
      _ref = this.tableViews();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        t = _ref[_i];
        _results.push(t.selected(t.name === name));
      }
      return _results;
    };

    DataView.prototype.initTable = function(domElements, tableView) {
      return tableView.afterRender(domElements[0]);
    };

    DataView.prototype.getColumnInfo = function(dsInfo) {
      var tableName, tables;
      tables = this.tables();
      tableName = dsInfo.tableName;
      if (tableName === 'Vistor' && this.dataSource.dsType === "googleAnalytics") {
        tableName = 'Visitor';
      }
      if (!(tableName && (tables[tableName] != null))) {
        TOAST.raise("Table does not exist: " + tableName);
        return;
      }
      return tables[tableName].getColumnInfo(dsInfo);
    };

    DataView.prototype.getTableMetaData = function() {
      var _this = this;
      return {
        dsType: this.dataSource.dsType,
        getDsKey: this.dataSource.dataSourceKey,
        getTables: function() {
          return _.keys(_this.tables());
        },
        getColumnsInTable: function(tableName) {
          return _.without(_.keys(_this.tables()[tableName].columnInfo), 'count(*)');
        },
        getColumnInfo: this.getColumnInfo,
        polyJsObjectFor: this.getPolyJsObject,
        extendedMetaAsync: this.getExtendedMetaAsync
      };
    };

    DataView.prototype.getPolyJsObject = function(dsInfo) {
      var tableName;
      tableName = dsInfo.tableName;
      if (tableName === 'Vistor' && this.dataSource.dsType === "googleAnalytics") {
        tableName = 'Visitor';
      }
      return this.tables()[tableName].jsdata;
    };

    DataView.prototype.getExtendedMetaAsync = function(columnInfo, callback) {
      var column, gaMatch, meta, name, tableName,
        _this = this;
      tableName = columnInfo.tableName, name = columnInfo.name, meta = columnInfo.meta;
      if (tableName === 'Vistor' && this.dataSource.dsType === "googleAnalytics") {
        tableName = 'Visitor';
      }
      gaMatch = /ga-(?:metric|dimension)-(.*)/.exec(tableName);
      if (gaMatch) {
        tableName = gaMatch[1];
      }
      if (meta.range) {
        return callback(null, meta);
      } else {
        column = {
          tableName: tableName,
          name: name,
          fullFormula: columnInfo.getFormula(this.getTableMetaData(), false),
          derived: columnInfo.formula != null,
          type: meta.type
        };
        return this.dataSource.getRange(column, function(err, result) {
          var sortfn;
          if (err) {
            return callback(err, null);
          } else {
            meta.range = result;
            if (meta.type === 'cat') {
              sortfn = polyjs.debug.type.compare('cat');
              meta.range.values = meta.range.values.sort(sortfn);
            }
            return callback(null, meta);
          }
        });
      }
    };

    DataView.prototype.serialize = function() {
      var t;
      return _.flatten((function() {
        var _i, _len, _ref, _results;
        _ref = this.tableViews();
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          t = _ref[_i];
          _results.push(t.serialize());
        }
        return _results;
      }).call(this));
    };

    return DataView;

  })();

  module.exports = DataView;

}).call(this);
}, "poly/main/data/datatableView": function(exports, require, module) {(function() {
  var AUTOCOMPLETE, AutocompleteView, CONST, DataTableView, EditMetric, EditView, Events, TOAST, autocompleteSelect, extractLast, getType, normalize,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Events = require('poly/main/events');

  CONST = require('poly/main/const');

  TOAST = require('poly/main/error/toast');

  AUTOCOMPLETE = require('poly/main/data/autocomplete');

  extractLast = AUTOCOMPLETE.extractLast, autocompleteSelect = AUTOCOMPLETE.autocompleteSelect;

  normalize = function(str) {
    return polyjs.parser.parse(str).pretty();
  };

  getType = function(str, typeEnv) {
    return polyjs.debug.parser.getType(str, typeEnv, false);
  };

  DataTableView = (function() {
    function DataTableView(tableMetaData) {
      var _ref,
        _this = this;
      this.tableMetaData = tableMetaData;
      this.initAutocomplete = __bind(this.initAutocomplete, this);
      this.initSlickgridDom = __bind(this.initSlickgridDom, this);
      this.processData = __bind(this.processData, this);
      this.render = __bind(this.render, this);
      this.reset = __bind(this.reset, this);
      this.navigateBack = __bind(this.navigateBack, this);
      this.visible = ko.observable(false);
      this.errorMessage = ko.observable(false);
      this.autocompleteView = new AutocompleteView();
      this.editView = new EditView();
      this.canAddVar = (_ref = this.tableMetaData.dsType) === 'local' || _ref === 'mysql' || _ref === 'postgresql' || _ref === 'infobright';
      Events.data.column.update.on(function() {
        if (_this.visible()) {
          return _this.render();
        }
      });
    }

    DataTableView.prototype.navigateBack = function(event) {
      Events.nav.datatableviewer.close.trigger({
        previous: this.previous
      });
      return this.visible(false);
    };

    DataTableView.prototype.reset = function(params) {
      this.visible(true);
      if (params.previous != null) {
        this.previous = params.previous;
      }
      this.tableView = params.table;
      this.editView.reset(this.tableView);
      return this.render();
    };

    DataTableView.prototype.render = function() {
      var col, colName, dataSpec, expr, jsdata, key, meta, select, trans, _ref, _ref1;
      _ref = this.tableView, this.name = _ref.name, jsdata = _ref.jsdata, this.columnInfo = _ref.columnInfo;
      trans = [];
      select = [];
      meta = {};
      _ref1 = this.columnInfo;
      for (colName in _ref1) {
        col = _ref1[colName];
        if (colName !== 'count(*)') {
          key = col.getFormula(this.tableMetaData);
          meta[polyjs.parser.unbracket(key)] = col.meta;
          expr = polyjs.parser.getExpression(key).expr;
          select.push(expr);
          if (col.formula) {
            trans.push(expr);
          }
        }
      }
      this.autocompleteView.reset(this.tableView);
      dataSpec = {
        select: select,
        stats: {
          stats: [],
          groups: []
        },
        trans: trans,
        filter: [],
        limit: 200,
        meta: meta
      };
      return jsdata.getData(this.processData, dataSpec);
    };

    DataTableView.prototype._getFormatter = function(type) {
      if (type === 'date') {
        return function(row, cell, value, columnDef, dataContext) {
          return moment.unix(value).format();
        };
      } else {
        return function(row, cell, value, columnDef, dataContext) {
          return value;
        };
      }
    };

    DataTableView.prototype.processData = function(err, jsdata) {
      var col, colName, slickcolumns, _ref,
        _this = this;
      if (this.visible()) {
        if (err) {
          return this.errorMessage(err.message);
        } else {
          this.errorMessage(false);
          slickcolumns = [];
          _ref = this.columnInfo;
          for (colName in _ref) {
            col = _ref[colName];
            if (colName !== 'count(*)') {
              slickcolumns.push({
                id: col.name,
                name: col.name,
                field: polyjs.parser.unbracket(col.getFormula(this.tableMetaData)),
                formatter: this._getFormatter(col.meta.type),
                sortable: true
              });
            }
          }
          this.slickgrid.setColumns(slickcolumns);
          this.slickgrid.setData(jsdata.raw, true);
          this.slickgrid.render();
          return this.slickgrid.onSort.subscribe(function(e, args) {
            var cols;
            cols = args.sortCols;
            jsdata.raw.sort(function(r1, r2) {
              var result, sign, type, v1, v2, _i, _len;
              for (_i = 0, _len = cols.length; _i < _len; _i++) {
                col = cols[_i];
                type = _this.columnInfo[col.sortCol.name].type;
                sign = col.sortAsc ? 1 : -1;
                v1 = r1[col.sortCol.field];
                v2 = r2[col.sortCol.field];
                result = polyjs.debug.type.compare(type)(v1, v2) * sign;
                if (result !== 0) {
                  return result;
                }
              }
              return 0;
            });
            _this.slickgrid.setData(jsdata.raw, true);
            _this.slickgrid.invalidate();
            return _this.slickgrid.render();
          });
        }
      }
    };

    DataTableView.prototype.initSlickgridDom = function(dom) {
      this.dom = dom;
      return this.slickgrid = new Slick.Grid($(this.dom), [], [], {
        multiColumnSort: true
      });
    };

    DataTableView.prototype.initAutocomplete = function(dom) {
      return this.autocompleteView.init(dom);
    };

    return DataTableView;

  })();

  EditView = (function() {
    function EditView() {
      this.reset = __bind(this.reset, this);
      var _this = this;
      this.tableView = ko.observable();
      this.metricViews = ko.computed(function() {
        var m, tableView, _i, _len, _ref, _results;
        tableView = _this.tableView();
        if (tableView) {
          _ref = tableView.derivedMetrics();
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            m = _ref[_i];
            _results.push(new EditMetric(tableView, m));
          }
          return _results;
        } else {
          return [];
        }
      });
    }

    EditView.prototype.reset = function(tableView) {
      return this.tableView(tableView);
    };

    return EditView;

  })();

  EditMetric = (function() {
    function EditMetric(tableView, metric) {
      this.tableView = tableView;
      this.metric = metric;
      this.deleteMetric = __bind(this.deleteMetric, this);
    }

    EditMetric.prototype.deleteMetric = function() {
      return Events.data.column["delete"].triggerElem(this.tableView, {
        metric: this.metric
      });
    };

    return EditMetric;

  })();

  AutocompleteView = (function() {
    function AutocompleteView() {
      this.init = __bind(this.init, this);
      this.addItem = __bind(this.addItem, this);
      this.checkFormula = __bind(this.checkFormula, this);
      this.closeHelp = __bind(this.closeHelp, this);
      this.openHelp = __bind(this.openHelp, this);
      this.clear = __bind(this.clear, this);
      this.reset = __bind(this.reset, this);
      this.alias = ko.observable('');
      this.formula = ko.observable('');
      this.errorMessage = ko.observable('');
      this.colNames = [];
      this.typeEnv = null;
    }

    AutocompleteView.prototype.reset = function(tableView) {
      var colTypes, metric, n, _i, _len, _ref;
      this.tableView = tableView;
      this.colNames = [];
      colTypes = {};
      _ref = this.tableView.metrics();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        metric = _ref[_i];
        n = polyjs.parser.escape(metric.name);
        this.colNames.push(n);
        colTypes[metric.name] = {
          type: metric.type
        };
      }
      this.typeEnv = polyjs.debug.parser.createColTypeEnv(colTypes);
      return this.clear();
    };

    AutocompleteView.prototype.clear = function() {
      this.alias('');
      this.formula('');
      if (this.formulaDom) {
        this.formulaDom.val('');
      }
      return this.errorMessage('');
    };

    AutocompleteView.prototype.openHelp = function() {
      return Events.ui.dialog.show.trigger({
        template: 'tmpl-formula-docs',
        type: 'formula-docs',
        view: this
      });
    };

    AutocompleteView.prototype.closeHelp = function() {
      return Events.ui.dialog.hide.trigger();
    };

    AutocompleteView.prototype.checkFormula = function(value) {
      var error;
      try {
        getType(value);
        return this.errorMessage("");
      } catch (_error) {
        error = _error;
        return this.errorMessage(error.message);
      }
    };

    AutocompleteView.prototype.addItem = function() {
      var e, f, name, type;
      this.errorMessage('');
      name = this.alias();
      f = this.formula();
      if (name === '') {
        this.errorMessage('You need a name for the new column!');
        return;
      }
      if (_.contains(this.tableView.metricNames(), name)) {
        this.errorMessage("The column " + name + " already exists in this table!");
        return;
      }
      try {
        type = getType(f, this.typeEnv);
      } catch (_error) {
        e = _error;
        this.errorMessage("Error in your formula: " + e.message);
        return;
      }
      if (type === 'stat') {
        this.errorMessage("Your formula cannot contain aggregate statistics!");
        return;
      }
      Events.data.column["new"].triggerElem(this.tableView, {
        name: this.alias(),
        formula: normalize(f),
        type: type
      });
      Events.data.column.add.trigger();
      return this.clear();
    };

    AutocompleteView.prototype.init = function(dom) {
      var self,
        _this = this;
      self = this;
      this.formulaDom = $('.formula-input', dom);
      return this.formulaDom.autocomplete({
        focus: (function() {
          return false;
        }),
        source: function(request, response) {
          var filtered, range, selectionEnd, selectionStart, tail, _ref;
          _ref = _this.formulaDom[0], selectionStart = _ref.selectionStart, selectionEnd = _ref.selectionEnd;
          range = extractLast(request.term, selectionStart, selectionEnd);
          if (!range) {
            return response([]);
          } else {
            tail = request.term.substring(range[0], range[1]);
            filtered = $.ui.autocomplete.filter(self.colNames, tail);
            return response(filtered);
          }
        },
        select: function(event, ui) {
          var cursorLocation;
          cursorLocation = autocompleteSelect.call(this, event, ui);
          self.formula(this.value);
          this.selectionStart = cursorLocation;
          this.selectionEnd = cursorLocation;
          return false;
        }
      });
    };

    return AutocompleteView;

  })();

  module.exports = DataTableView;

}).call(this);
}, "poly/main/data/metric/attached": function(exports, require, module) {(function() {
  var AttachedMetricView, CONST, DropdownMetricView, Events, TOAST,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  CONST = require('poly/main/const');

  TOAST = require('poly/main/error/toast');

  DropdownMetricView = require('poly/main/data/metric/dropdown');

  Events = require('poly/main/events');

  /*
  # A note on metric names:
  #
  # titleName   : what to refer to the metric on the actual chart
  # name        : original name or alias associated with the col (no bin/stats)
  # visibleName : the name to display on metric (has bin/stat info)
  # formula     : what name/formula to send to polyjs (no bin/stats)
  # fullFormula*: name/formula to send to polyjs (has bin/stats info)
  #    * currently only in generateSpec() function
  */


  AttachedMetricView = (function(_super) {
    __extends(AttachedMetricView, _super);

    function AttachedMetricView(columnInfo, label, updateFn, options, attachedMetrics, defaults) {
      var m, _i, _len, _ref, _ref1, _ref2, _ref3, _ref4,
        _this = this;
      this.options = options;
      if (defaults == null) {
        defaults = {};
      }
      this.discard = __bind(this.discard, this);
      this.generateSpec = __bind(this.generateSpec, this);
      this.fullFormula = __bind(this.fullFormula, this);
      this.toggleAsc = __bind(this.toggleAsc, this);
      this.initDateSlider = __bind(this.initDateSlider, this);
      this.initNumSlider = __bind(this.initNumSlider, this);
      this.initSlider = __bind(this.initSlider, this);
      this._statName = __bind(this._statName, this);
      this.fullMeta = __bind(this.fullMeta, this);
      AttachedMetricView.__super__.constructor.call(this, columnInfo, label, 'tmpl-metric-option', this);
      if (this.removeText == null) {
        this.removeText = "Remove \"" + this.name + "\" from " + this.label;
      }
      this.titleName = this.name;
      this.type = this.columnInfo.meta.type;
      if (!this.type) {
        TOAST.raise("Metadata does not contain type for metric " + this.name);
      }
      this.sortMetricList = ko.computed(function() {
        var keys, m, _i, _len, _ref;
        keys = ["None"];
        _ref = attachedMetrics();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          m = _ref[_i];
          if (m !== _this) {
            if (m.fullName != null) {
              keys.push(m);
            }
          }
        }
        return _.uniq(keys);
      });
      this.sortMetricOptionText = function(m) {
        if (m === "None") {
          return "None";
        } else {
          return m.fullName();
        }
      };
      this.sortMetric = ko.observable("None");
      if (defaults.sort != null) {
        _ref = attachedMetrics();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          m = _ref[_i];
          if (m !== this && (m.fullName != null) && (defaults.sortName != null) && (m.fullName() === defaults.sortName)) {
            this.sortMetric(m);
            break;
          }
        }
      }
      this.asc = ko.observable((_ref1 = defaults.asc) != null ? _ref1 : 'asc');
      this.statsList = ko.computed(function() {
        return _this.options().stat[_this.type];
      });
      this.statsDefault = ko.computed(function() {
        if (_this.name !== 'count(*)') {
          return _this.options().defaultStat[_this.type];
        } else {
          return 'None';
        }
      });
      this.stats = ko.observable((_ref2 = defaults.stats) != null ? _ref2 : this.statsDefault());
      this.binwidth = ko.observable((_ref3 = defaults.bin) != null ? _ref3 : this.name === 'count(*)' ? null : this.type === 'num' ? (_ref4 = defaults.bin) != null ? _ref4 : 1 : this.type === 'date' ? this.columnInfo.meta.timerange != null ? this.columnInfo.meta.timerange : 'day' : null);
      this.binoptional = ko.computed(function() {
        return !_this.options().bin;
      });
      this.binned = ko.observable(defaults.bin || this.options().bin);
      this.binned.subscribe(updateFn);
      this.binoptional.subscribe(function(val) {
        var _ref5;
        if (!val) {
          _this.binned(true);
          if (!(_this.binwidth() != null)) {
            if (_this.type === 'num') {
              return (_ref5 = defaults.bin) != null ? _ref5 : 1;
            } else if (_this.type === 'date') {
              if (_this.columnInfo.meta.timerange != null) {
                return _this.columnInfo.meta.timerange;
              } else {
                return 'month';
              }
            }
          }
        }
      });
      this.visibleName = ko.computed(function() {
        return _this._statName(_this.name);
      });
      this.fullName = ko.computed(function() {
        if (_this.name === 'count(*)') {
          return _this.name;
        } else {
          return _this._statName("" + _this.tableName + "." + _this.name);
        }
      });
      this.binwidth.subscribe(updateFn);
      this.stats.subscribe(updateFn);
      this.sortMetric.subscribe(updateFn);
      this.asc.subscribe(updateFn);
      this.statsList.subscribe(function(newAcceptableVals) {
        var _ref5;
        if (!(_ref5 = _this.stats(), __indexOf.call(newAcceptableVals, _ref5) >= 0)) {
          return _this.stats(_this.statsDefault());
        }
      });
      this.sortMetricList.subscribe(function(newValues) {
        var _ref5;
        if (!(_ref5 = _this.sortMetric(), __indexOf.call(newValues, _ref5) >= 0)) {
          return _this.sortMetric(newValues[0]);
        }
      });
    }

    AttachedMetricView.prototype.fullMeta = function() {
      var moreMeta;
      moreMeta = {};
      if (this.binned() && this.binwidth()) {
        moreMeta.bw = this.binwidth();
      }
      if (this.type === 'date') {
        moreMeta.format = 'unix';
      }
      return _.extend(this.columnInfo.meta, moreMeta);
    };

    AttachedMetricView.prototype._statName = function(name) {
      if (this.stats() !== 'None') {
        return "" + CONST.stats.nameToStat[this.stats()] + "(" + name + ")";
      } else if (this.binned() && this.binwidth()) {
        if (this.type === 'num') {
          return "bin(" + name + "," + (this.binwidth()) + ")";
        } else {
          return "bin(" + name + ",\"" + (this.binwidth()) + "\")";
        }
      } else {
        return name;
      }
    };

    AttachedMetricView.prototype.initSlider = function(dom) {
      if (!_.isFunction(this.sliderVal)) {
        this.sliderVal = ko.observable(this.binwidth ? 'binwidth' : 'default');
      }
      if (this.type === 'num') {
        this.initNumSlider(dom);
      }
      if (this.type === 'date') {
        return this.initDateSlider(dom);
      }
    };

    AttachedMetricView.prototype.initNumSlider = function(dom) {
      var slider,
        _this = this;
      if (this.sliderVal() === 'default') {
        this.sliderVal(0);
      } else {
        this.sliderVal(Math.log(this.binwidth()) / Math.LN10);
      }
      slider = $('.selector', dom);
      return slider.slider({
        max: 5,
        min: -3,
        step: 1,
        value: this.sliderVal(),
        slide: function(evt, ui) {
          _this.sliderVal(ui.value);
          return _this.binwidth(Math.pow(10, _this.sliderVal()));
        }
      });
    };

    AttachedMetricView.prototype.initDateSlider = function(dom) {
      var TIMERANGE, slider,
        _this = this;
      TIMERANGE = ['second', 'minute', 'hour', 'day', 'week', 'month', 'twomonth', 'quarter', 'sixmonth', 'year', 'twoyear', 'fiveyear', 'decade'];
      if (/ga-(?:dimension|metric)-.*/.exec(this.tableName) != null) {
        TIMERANGE = TIMERANGE.slice(3);
      }
      if (this.sliderVal() === 'default') {
        this.sliderVal(4);
      } else {
        this.sliderVal(TIMERANGE.indexOf(this.binwidth()));
      }
      slider = $('.selector', dom);
      return slider.slider({
        max: TIMERANGE.length - 1,
        min: 0,
        step: 1,
        value: this.sliderVal(),
        slide: function(evt, ui) {
          _this.sliderVal(ui.value);
          return _this.binwidth(TIMERANGE[_this.sliderVal()]);
        }
      });
    };

    AttachedMetricView.prototype.toggleAsc = function() {
      if (this.asc() === 'asc') {
        return this.asc('dsc');
      } else {
        return this.asc('asc');
      }
    };

    AttachedMetricView.prototype.fullFormula = function(tableMetaData, unbracket) {
      var f;
      if (unbracket == null) {
        unbracket = false;
      }
      f = this._statName(this.columnInfo.getFormula(tableMetaData, false));
      if (unbracket) {
        return polyjs.parser.unbracket(f);
      } else {
        return f;
      }
    };

    AttachedMetricView.prototype.generateSpec = function(tableMetaData) {
      var spec;
      spec = {
        "var": this.fullFormula(tableMetaData, false),
        name: this.name,
        tableName: this.tableName,
        bin: this.binwidth(),
        stats: this.stats()
      };
      if (this.sortMetric() !== 'None' && this.sortMetric()) {
        spec.sort = this.sortMetric().fullFormula(tableMetaData, false);
        spec.sortName = this.sortMetric().fullName();
        spec.asc = this.asc() === 'asc';
      }
      return spec;
    };

    AttachedMetricView.prototype.discard = function() {
      this.close();
      return Events.ui.metric.remove.triggerElem(this, {
        elem: this
      });
    };

    return AttachedMetricView;

  })(DropdownMetricView);

  module.exports = AttachedMetricView;

}).call(this);
}, "poly/main/data/metric/base": function(exports, require, module) {(function() {
  var MetricView,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  MetricView = (function() {
    function MetricView(columnInfo) {
      var _ref;
      this.columnInfo = columnInfo;
      this.fullFormula = __bind(this.fullFormula, this);
      _ref = this.columnInfo, this.name = _ref.name, this.tableName = _ref.tableName, this.gaType = _ref.gaType;
      this.type = this.columnInfo.meta.type;
      this.gaType = this.columnInfo.gaType;
      this.originalFormula = this.columnInfo.formula;
      this.formula = this.originalFormula != null ? this.originalFormula : this.name === 'count(*)' ? this.name : "[" + this.tableName + "." + this.name + "]";
      this.extraCSS = this.columnInfo.formula ? 'derived-var' : this.gaType;
    }

    MetricView.prototype.fullFormula = function(tableMetaData, unbracket) {
      if (unbracket == null) {
        unbracket = false;
      }
      return this.columnInfo.getFormula(tableMetaData, unbracket);
    };

    MetricView.prototype.fullMeta = function() {
      return this.columnInfo.meta;
    };

    return MetricView;

  })();

  module.exports = MetricView;

}).call(this);
}, "poly/main/data/metric/dropdown": function(exports, require, module) {(function() {
  var CONST, DropdownMetricView, Events, MetricView,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Events = require('poly/main/events');

  MetricView = require('poly/main/data/metric/base');

  CONST = require('poly/main/const');

  DropdownMetricView = (function(_super) {
    __extends(DropdownMetricView, _super);

    function DropdownMetricView(columnInfo, label, dropdownTemplate, dropdownData, dropdownAfterRender) {
      this.label = label;
      this.dropdownTemplate = dropdownTemplate;
      this.dropdownData = dropdownData;
      this.dropdownAfterRender = dropdownAfterRender;
      this.attachDropdown = __bind(this.attachDropdown, this);
      this.close = __bind(this.close, this);
      this.setInactive = __bind(this.setInactive, this);
      this._toggleDropdown = __bind(this._toggleDropdown, this);
      this.toggleDropdown = _.throttle(this._toggleDropdown);
      this.dropdownShowing = false;
      DropdownMetricView.__super__.constructor.call(this, columnInfo);
    }

    DropdownMetricView.prototype._toggleDropdown = function() {
      if (this.name !== 'count(*)') {
        if (this.dropdownShowing) {
          return Events.ui.dropdown.hide.trigger();
        } else {
          return Events.ui.dropdown.show.trigger({
            templateName: this.dropdownTemplate,
            data: this.dropdownData,
            targetDom: this.dom,
            onRemove: this.setInactive,
            afterRender: this.dropdownAfterRender,
            info: {
              name: this.label,
              value: this.name
            }
          });
        }
      }
    };

    DropdownMetricView.prototype.setInactive = function() {
      this.dropdownShowing = false;
      if (this.dom) {
        this.dom.removeClass('dropdown-active');
        return this.dom.draggable('enable');
      }
    };

    DropdownMetricView.prototype.close = function() {
      return Events.ui.dropdown.hide.trigger();
    };

    DropdownMetricView.prototype.attachDropdown = function(dom) {
      var _this = this;
      this.dom = $(dom);
      Events.ui.dropdown.shown.onElem(this.dom, function() {
        _this.dropdownShowing = true;
        _this.dom.addClass('dropdown-active');
        return _this.dom.draggable('disable');
      });
      return Events.ui.dropdown.hidden.onElem(this.dom, this.setInactive);
    };

    return DropdownMetricView;

  })(MetricView);

  module.exports = DropdownMetricView;

}).call(this);
}, "poly/main/data/metric/facet": function(exports, require, module) {(function() {
  var AttachedMetricView, CONST, Events, FacetMetricView,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  AttachedMetricView = require('poly/main/data/metric/attached');

  Events = require('poly/main/events');

  CONST = require('poly/main/const');

  FacetMetricView = (function(_super) {
    __extends(FacetMetricView, _super);

    function FacetMetricView(columnInfo) {
      var attachedMetrics, options, updateFn,
        _this = this;
      updateFn = function() {
        return Events.ui.chart.render.trigger();
      };
      options = function() {
        return CONST.facets;
      };
      attachedMetrics = function() {
        return [];
      };
      this.removeText = "Remove \"" + columnInfo.name + "\" from facet";
      FacetMetricView.__super__.constructor.call(this, columnInfo, this.aes, updateFn, options, attachedMetrics);
    }

    return FacetMetricView;

  })(AttachedMetricView);

  module.exports = FacetMetricView;

}).call(this);
}, "poly/main/data/metric/layer": function(exports, require, module) {(function() {
  var AttachedMetricView, CONST, Events, LayerMetricView,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  AttachedMetricView = require('poly/main/data/metric/attached');

  Events = require('poly/main/events');

  CONST = require('poly/main/const');

  LayerMetricView = (function(_super) {
    __extends(LayerMetricView, _super);

    function LayerMetricView(columnInfo, options, layer, aesName, defaults) {
      var attachedMetrics, updateFn,
        _this = this;
      this.options = options;
      this.layer = layer;
      this.aesName = aesName;
      updateFn = function() {
        return Events.ui.chart.render.trigger();
      };
      attachedMetrics = this.layer.attachedMetrics;
      LayerMetricView.__super__.constructor.call(this, columnInfo, this.aesName, updateFn, this.options, attachedMetrics, defaults);
    }

    return LayerMetricView;

  })(AttachedMetricView);

  module.exports = LayerMetricView;

}).call(this);
}, "poly/main/data/metric/quickadd": function(exports, require, module) {(function() {
  var AttachedMetricView, QuickAddMetricView,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  AttachedMetricView = require('poly/main/data/metric/attached');

  QuickAddMetricView = (function(_super) {
    __extends(QuickAddMetricView, _super);

    function QuickAddMetricView(columnInfo, options, aes) {
      var attachedMetrics, updateFn;
      this.options = options;
      this.aes = aes;
      updateFn = function() {};
      attachedMetrics = function() {
        return [];
      };
      this.removeText = "Remove \"" + columnInfo.name + "\" from " + this.aes;
      QuickAddMetricView.__super__.constructor.call(this, columnInfo, this.aes, updateFn, this.options, attachedMetrics);
    }

    return QuickAddMetricView;

  })(AttachedMetricView);

  module.exports = QuickAddMetricView;

}).call(this);
}, "poly/main/data/metric/quickaddtable": function(exports, require, module) {(function() {
  var AttachedMetricView, QuickAddTableMetricView,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  AttachedMetricView = require('poly/main/data/metric/attached');

  QuickAddTableMetricView = (function(_super) {
    __extends(QuickAddTableMetricView, _super);

    function QuickAddTableMetricView(columnInfo, options, aes, attachedMetrics) {
      var updateFn;
      this.options = options;
      this.aes = aes;
      updateFn = function() {};
      this.removeText = "Remove \"" + columnInfo.name + "\" from " + this.aes;
      QuickAddTableMetricView.__super__.constructor.call(this, columnInfo, this.aes, updateFn, this.options, attachedMetrics);
    }

    return QuickAddTableMetricView;

  })(AttachedMetricView);

  module.exports = QuickAddTableMetricView;

}).call(this);
}, "poly/main/data/tableView": function(exports, require, module) {(function() {
  var ColumnInfo, DND, Events, MetricView, TOAST, TableMetricListView,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  DND = require('poly/main/dnd');

  TOAST = require('poly/main/error/toast');

  Events = require('poly/main/events');

  MetricView = require('poly/main/data/metric/base');

  ColumnInfo = require('poly/main/data/columnInfo');

  TableMetricListView = (function() {
    function TableMetricListView(dataTable, parent) {
      var meta, metrics, name, params,
        _this = this;
      this.parent = parent;
      this.openDataTableViewer = __bind(this.openDataTableViewer, this);
      this.getColumnInfo = __bind(this.getColumnInfo, this);
      this.select = __bind(this.select, this);
      this._recalculateMaxHeight = __bind(this._recalculateMaxHeight, this);
      this.serialize = __bind(this.serialize, this);
      this.deleteDerivedMetric = __bind(this.deleteDerivedMetric, this);
      this.newDerivedMetric = __bind(this.newDerivedMetric, this);
      this.name = dataTable.name, meta = dataTable.meta, this.jsdata = dataTable.jsdata;
      this.columnInfo = {};
      for (name in meta) {
        params = meta[name];
        this.columnInfo[name] = new ColumnInfo({
          name: name,
          tableName: this.name
        }, {
          meta: params
        });
      }
      metrics = (function() {
        var _results;
        _results = [];
        for (name in meta) {
          _results.push(new MetricView(this.columnInfo[name]));
        }
        return _results;
      }).call(this);
      metrics = _.sortBy(metrics, function(item) {
        name = item.name;
        if (item.gaType !== 'none') {
          if (item.gaType === 'ga-metric') {
            name = '001_' + name;
          } else {
            name = '002_' + name;
          }
        }
        return name;
      });
      this.metrics = ko.observableArray(metrics);
      this.derivedMetrics = ko.observableArray();
      Events.data.column["new"].onElem(this, this.newDerivedMetric);
      Events.data.column["delete"].onElem(this, this.deleteDerivedMetric);
      this.otherMetrics = ko.observableArray();
      if (_.isObject(meta) && _.every(_.values(meta), function(val) {
        return !('ga' in val);
      })) {
        this.columnInfo['count(*)'] = new ColumnInfo({
          name: 'count(*)',
          tableName: this.name
        }, {
          meta: {
            type: 'num'
          }
        });
        this.otherMetrics.push(new MetricView(this.columnInfo['count(*)']));
      }
      this.visibleMetrics = ko.computed(function() {
        return _.flatten([_this.metrics(), _this.derivedMetrics(), _this.otherMetrics()]);
      });
      this.visibleMetrics.subscribe(_.debounce(this._recalculateMaxHeight, 100, false));
      this.metricNames = ko.computed(function() {
        return _.pluck(_this.visibleMetrics(), 'name');
      });
      this.selected = ko.observable(false);
      this.maxHeight = ko.observable(0);
      this.renderHeight = ko.computed(function() {
        var h;
        h = _this.maxHeight();
        if (_this.selected()) {
          return h;
        } else {
          return 0;
        }
      });
    }

    TableMetricListView.prototype.newDerivedMetric = function(event, params) {
      var formula, m, name, type;
      name = params.name, formula = params.formula, type = params.type;
      if (_.contains(this.metricNames(), name)) {
        TOAST.raise("The column " + name + " already exists in this table!");
        return;
      }
      this.columnInfo[name] = new ColumnInfo({
        name: name,
        tableName: this.name
      }, {
        meta: {
          type: type
        },
        formula: formula
      });
      m = new MetricView(this.columnInfo[name]);
      this.derivedMetrics.push(m);
      if (event != null) {
        return Events.data.column.update.trigger();
      }
    };

    TableMetricListView.prototype.deleteDerivedMetric = function(event, params) {
      var metric;
      metric = params.metric;
      if (!(metric && _.contains(this.derivedMetrics(), metric))) {
        TOAST.raise("There are no such column to be deleted");
        return;
      }
      this.derivedMetrics.remove(metric);
      delete this.columnInfo[metric.name];
      if (event != null) {
        return Events.data.column.update.trigger();
      }
    };

    TableMetricListView.prototype.serialize = function() {
      var metric, _i, _len, _ref, _results;
      _ref = this.derivedMetrics();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        metric = _ref[_i];
        _results.push({
          tableName: metric.tableName,
          name: metric.name,
          formula: metric.columnInfo.formula,
          type: metric.columnInfo.meta.type
        });
      }
      return _results;
    };

    TableMetricListView.prototype.afterRender = function(domElement) {
      this.domElement = domElement;
      return this._recalculateMaxHeight();
    };

    TableMetricListView.prototype._recalculateMaxHeight = function() {
      var desiredHeight, domElementInView, metricsList;
      domElementInView = this.domElement;
      if ($(domElementInView).hasClass('table-metric-list')) {
        metricsList = $(domElementInView).find('.metrics');
      } else {
        metricsList = $(domElementInView).parents('.table-metric-list').find('.metrics');
      }
      desiredHeight = metricsList.children().height();
      return this.maxHeight(desiredHeight);
    };

    TableMetricListView.prototype.select = function(view, event) {
      Events.ui.table.open.trigger({
        info: {
          name: this.name
        }
      });
      this.parent.clearSelection();
      this.selected(true);
      return this._recalculateMaxHeight();
    };

    TableMetricListView.prototype.getColumnInfo = function(dsInfo) {
      var match, name, tableName, tableNameReg;
      tableName = dsInfo.tableName, name = dsInfo.name;
      if (this.columnInfo[name] != null) {
        return this.columnInfo[name];
      }
      tableNameReg = new RegExp("" + tableName + "\\.(.*)");
      match = tableNameReg.exec(name);
      if (match != null) {
        name = match[1];
      }
      if (this.columnInfo[name] != null) {
        return this.columnInfo[name];
      }
      TOAST.raise("Column " + name + " does not exist within table " + tableName);
    };

    TableMetricListView.prototype.initMetric = function(domElements, metric) {
      var metricNameDom;
      DND.makeDraggable(domElements, metric);
      if (metric.name.length > 15) {
        metricNameDom = $('.metric-name', domElements);
        return $(domElements).tooltip({
          position: {
            my: "right+10 center",
            at: "left center",
            using: function(position, feedback) {
              $(this).css(position);
              return $('<div>').addClass('tooltip-arrow-left').addClass(feedback.vertical).addClass(feedback.horizontal).appendTo(this);
            }
          },
          show: false,
          hide: false
        });
      }
    };

    TableMetricListView.prototype.openDataTableViewer = function() {
      return Events.nav.datatableviewer.open.trigger({
        table: this
      });
    };

    return TableMetricListView;

  })();

  module.exports = TableMetricListView;

}).call(this);
}, "poly/main/dnd": function(exports, require, module) {/*
Author : Jeeyoung Kim

Drag-and-drop related initialization code.

We're currently using JQuery UI's draggable. This is a wrapper around it, creating
our own set of events (defined under EVENTS object).
*/


(function() {
  var CONST, CONTAINER_EXPR, DRAGGABLE_EVENTS, EVENTS, Events, cloneDraggable, filterFunction, handleError, initDraggable, initDroppable, initDroppable_accept, initDroppable_out, initDroppable_over, makeDiscardEvent, makeDraggable, makeEnterEvent, makeRemoveEvent, _commonOptions,
    _this = this;

  CONST = require('poly/main/const');

  Events = require('poly/main/events');

  CONTAINER_EXPR = '.dnd-panel';

  EVENTS = {
    ITEM_ENTER: 'dnd-item-enter',
    ITEM_DISCARD: 'dnd-item-discard'
  };

  filterFunction = function(evt, ui) {
    var data, targ;
    targ = $(evt.target);
    data = targ.data('dnd-type');
    return function() {
      var df;
      return $(this).data('dnd-type') === data && (df = $(this).data('dnd-dropfilter'), df || (df = function() {
        return true;
      }), df(targ));
    };
  };

  makeEnterEvent = function(item, itemData) {
    return {
      dom: item,
      data: itemData,
      isDeleted: false,
      "delete": function() {
        return this.isDeleted = true;
      }
    };
  };

  makeRemoveEvent = function(item, itemData) {
    return {
      dom: item,
      data: itemData
    };
  };

  makeDiscardEvent = function(item, itemData) {
    return {
      dom: item,
      data: itemData,
      isDeleted: false,
      "delete": function() {
        return this.isDeleted = true;
      }
    };
  };

  handleError = function(error) {
    debugger;
    return console.error(error, error.stack);
  };

  DRAGGABLE_EVENTS = {
    /*
    Events used by initDraggable.
    Comment (Jeeyoung Kim)
    Unlike other places, this place need extensive try / catch statement.
    1. triggering various dnd events may cause exceptions in those event handlers.
    2. JQuery UI has silent catch-all statements that will prevent
    uncaught exception from propagating.
    Thus, uncaught exception in child event handler is forever lost.
    
    This logic does the following:
    1a. trigger ITEM_DISCARD if the item was thrown away from the panel.
    1b. trigger ITEM_ENTER if the item was moved to another panel.
    2.  trigger ITEM_REMOVE if the item was marked as deleted
        by the previous event handlers, by delete() method call.
    */

    dispatchDndEvents: function(evt, ui) {
      var deleteEvt, deleted, dropPermitted, enterEvt, error, item, itemData, newParent, oldParent, targetName;
      try {
        item = $(this);
        newParent = item.data('dnd-new-parent-dom');
        itemData = item.data('dnd-data');
        dropPermitted = item.data('dnd-drop-permitted');
        targetName = item.data('dnd-drop-target-name');
        oldParent = item.parent();
        deleted = false;
        if (newParent) {
          if (dropPermitted) {
            enterEvt = makeEnterEvent(item, itemData);
            try {
              newParent.trigger(EVENTS.ITEM_ENTER, enterEvt);
            } finally {
              deleted = enterEvt.isDeleted;
            }
          } else {
            Events.ui.dnd.reject.trigger({
              info: {
                target: targetName
              }
            });
          }
        } else {
          Events.ui.dnd.drop.trigger({
            info: {
              target: null
            }
          });
        }
      } catch (_error) {
        error = _error;
        handleError(error);
      } finally {
        try {
          if (deleted || !newParent) {
            deleteEvt = makeRemoveEvent(item, itemData);
            oldParent.trigger(EVENTS.ITEM_DISCARD, deleteEvt);
          }
        } catch (_error) {
          error = _error;
          handleError(error);
        } finally {
          item.data('dnd-new-parent-dom', null);
        }
      }
    },
    hlStart: function(evt, ui) {
      $(CONTAINER_EXPR).filter(filterFunction(evt)).addClass('highlight');
      return Events.ui.highlight.begin.trigger({
        selector: ".highlight:visible:not(.disabled)"
      });
    },
    hlStop: function(evt, ui) {
      $('.highlight').removeClass('highlight');
      $('.highlight-strong').removeClass('highlight-strong');
      return Events.ui.highlight.end.trigger();
    },
    increaseZIndex: function(evt, ui) {
      return $(this).addClass('item-selected');
    },
    resetZIndex: function(evt, ui) {
      return $(this).removeClass('item-selected');
    },
    hide: function(evt, ui) {
      return $(this).css('visibility', 'hidden');
    },
    show: function(evt, ui) {
      return $(this).css('visibility', '');
    }
  };

  _commonOptions = function($obj, options) {
    /*
    common options between initDraggable and initDroppable.
    */

    var datatype;
    datatype = options.datatype;
    if (datatype) {
      return $obj.data('dnd-type', datatype);
    }
  };

  initDraggable = function($obj, options) {
    /*
    Turn the given DOM into draggable.
    
    * $obj - jQuery wrapper around target draggable object
    * options - optional parameteres
    * optiony.datatype - sets dnd-type
    */

    options || (options = {});
    $obj.draggable({
      revert: true,
      revertDuration: 0,
      containment: 'document',
      appendTo: 'body',
      helper: 'clone',
      scroll: false
    });
    _commonOptions($obj, options);
    $obj.unbind('.dndDispatch');
    $obj.on('dragstart.dndDispatch', function() {
      return Events.ui.dnd.start.trigger({
        info: {
          name: options.name
        }
      });
    });
    $obj.on('dragstart.dndDispatch', DRAGGABLE_EVENTS.hlStart);
    $obj.on('dragstop.dndDispatch', DRAGGABLE_EVENTS.hlStop);
    $obj.on('dragstop.dndDispatch', DRAGGABLE_EVENTS.dispatchDndEvents);
    $obj.on('dragstart.dndDispatch', DRAGGABLE_EVENTS.increaseZIndex);
    $obj.on('dragstop.dndDispatch', DRAGGABLE_EVENTS.resetZIndex);
    $obj.on('dragstart.dndDispatch', DRAGGABLE_EVENTS.hide);
    return $obj.on('dragstop.dndDispatch', DRAGGABLE_EVENTS.show);
  };

  initDroppable_accept = function(dom) {
    return $(this).data('dnd-type') === dom.data('dnd-type');
  };

  initDroppable_over = function() {
    return $(this).addClass('highlight-strong');
  };

  initDroppable_out = function() {
    return $(this).removeClass('highlight-strong');
  };

  initDroppable = function($obj, options) {
    /*
    Turn the given DOM into droppable.
    
    * options - optional parameteres
    * options.datatype - sets dnd-type
    * options.paneltype - sets dnd-panel-type
    * options.itementer - drop event handler.
    * options.itemdiscard - drop event handler.
    * options.dropfilter - drop acceptance filter
    */

    var datatype, dropfilter, itemdiscard, itementer, name, paneltype;
    options || (options = {});
    _commonOptions($obj, options);
    datatype = options.datatype, paneltype = options.paneltype, itementer = options.itementer, itemdiscard = options.itemdiscard, dropfilter = options.dropfilter, name = options.name;
    dropfilter || (dropfilter = function() {
      return true;
    });
    $obj.data('dnd-dropfilter', dropfilter);
    $obj.droppable({
      accept: initDroppable_accept,
      over: initDroppable_over,
      out: initDroppable_out,
      drop: function(evt, ui) {
        var dom, item, newParent;
        item = $(ui.draggable);
        dom = $(this);
        newParent = item.data('dnd-new-parent-dom', dom);
        item.data('dnd-drop-permitted', dropfilter(item));
        if (name != null) {
          return item.data('dnd-drop-target-name', name);
        }
      }
    });
    $obj.addClass('dnd-panel');
    $obj.on(EVENTS.ITEM_ENTER, function() {
      return Events.ui.dnd.drop.trigger({
        info: {
          target: name
        }
      });
    });
    if (paneltype) {
      $obj.data('dnd-panel-type', paneltype);
    }
    if (itementer) {
      $obj.bind(EVENTS.ITEM_ENTER, itementer);
    }
    if (itemdiscard) {
      return $obj.bind(EVENTS.ITEM_DISCARD, itemdiscard);
    }
  };

  cloneDraggable = function($obj) {
    var cloned, key, _i, _len, _ref;
    cloned = $obj.clone();
    _ref = ['dnd-data', 'dnd-type'];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      key = _ref[_i];
      cloned.data(key, $obj.data(key));
    }
    return cloned;
  };

  makeDraggable = function(dom, metricItem) {
    var $dom;
    $dom = $(dom);
    $dom.data('dnd-data', metricItem.columnInfo);
    $dom.data('dndMetricObj', metricItem);
    return initDraggable($dom, {
      datatype: 'metric',
      name: metricItem.name
    });
  };

  module.exports = {
    CONTAINER_EXPR: CONTAINER_EXPR,
    EVENTS: EVENTS,
    cloneDraggable: cloneDraggable,
    initDraggable: initDraggable,
    initDroppable: initDroppable,
    makeDraggable: makeDraggable
  };

}).call(this);
}, "poly/main/error/toast": function(exports, require, module) {(function() {
  var raise;

  raise = function(text) {
    return $().toastmessage('showErrorToast', text);
  };

  module.exports = {
    raise: raise
  };

}).call(this);
}, "poly/main/events": function(exports, require, module) {(function() {
  var Events, EventsFactory, dbbEventTree, defaultPropHandler;

  EventsFactory = require('poly/common/events');

  dbbEventTree = {
    signup: {
      page: {
        view: {
          tracked: true,
          noninteraction: true
        }
      },
      form: {
        interact: {
          tracked: true
        },
        submit: {
          tracked: true
        },
        error: {
          tracked: true
        }
      },
      eula: {
        error: {
          tracked: true
        }
      }
    },
    ui: {
      dropdown: {
        show: {},
        shown: {},
        hide: {},
        hidden: {},
        choose: {},
        disable: {},
        enable: {}
      },
      numeral: {
        add: {},
        render: {},
        edit: {}
      },
      pivottable: {
        add: {},
        render: {},
        edit: {}
      },
      chart: {
        render: {},
        add: {},
        edit: {}
      },
      dashboarditem: {
        remove: {},
        select: {}
      },
      quickadd: {
        add: {},
        click: {},
        expand: {},
        collapse: {}
      },
      layer: {
        remove: {}
      },
      metric: {
        add: {},
        remove: {}
      },
      filter: {
        remove: {}
      },
      highlight: {
        begin: {},
        end: {},
        click: {}
      },
      backtodbb: {
        click: {}
      },
      title: {
        add: {}
      },
      dnd: {
        start: {},
        drop: {},
        reject: {},
        selectdroppable: {},
        selectdraggable: {}
      },
      table: {
        focus: {},
        open: {}
      },
      nux: {
        skip: {
          tracked: true
        },
        firstdb: {
          tracked: true
        },
        datapanel: {
          tracked: true
        },
        datatable: {
          tracked: true
        },
        chartspanel: {
          tracked: true
        },
        workspace: {
          tracked: true
        },
        layerspanel: {
          tracked: true
        },
        layerspanel2: {
          tracked: true
        },
        layerspanel3: {
          tracked: true
        },
        tablepanel: {
          tracked: true
        },
        workspace2: {
          tracked: true
        },
        tableedit: {
          tracked: true
        },
        tableedit2: {
          tracked: true
        },
        workspace3: {
          tracked: true
        },
        datapanel2: {
          tracked: true
        },
        datanewcol: {
          tracked: true
        },
        workspace4: {
          tracked: true
        },
        numeral: {
          tracked: true
        },
        done: {
          tracked: true
        }
      },
      ga: {
        notify: {
          tracked: false
        },
        done: {
          tracked: false
        }
      },
      datasource: {
        remove: {
          tracked: true
        }
      },
      dialog: {
        show: {},
        hide: {}
      }
    },
    nav: {
      home: {
        open: {
          tracked: true
        }
      },
      chartbuilder: {
        open: {
          tracked: true
        }
      },
      numeralbuilder: {
        open: {
          tracked: true
        }
      },
      tablebuilder: {
        open: {
          tracked: true
        }
      },
      datatableviewer: {
        open: {
          tracked: true
        },
        close: {
          tracked: true
        }
      },
      dashbuilder: {
        open: {
          tracked: true
        }
      },
      dashviewer: {
        open: {
          tracked: true
        }
      },
      sharepanel: {
        open: {
          tracked: true
        },
        close: {
          tracked: true
        }
      },
      dscreate: {
        nextstep: {},
        start: {
          tracked: true
        },
        connscript: {
          tracked: true
        },
        dbtype: {
          tracked: ['details']
        },
        conntype: {
          tracked: ['details']
        },
        ssh: {
          tracked: true
        },
        socket: {
          tracked: true
        },
        direct: {
          tracked: true
        },
        dbacc: {
          tracked: true
        },
        csvchoose: {
          tracked: true
        },
        csvcancel: {
          tracked: true
        },
        csvfail: {
          tracked: ['details']
        },
        csvcomplete: {
          tracked: true
        },
        name: {
          tracked: true
        },
        oautherr: {
          tracked: ['details']
        },
        error: {
          tracked: ['details']
        },
        success: {
          tracked: true
        }
      }
    },
    model: {
      dashboarditem: {
        create: {},
        update: {},
        "delete": {}
      }
    },
    error: {
      polyjs: {
        data: {
          tracked: true
        }
      }
    },
    share: {
      email: {
        click: {
          tracked: true
        }
      },
      copyurl: {
        click: {
          tracked: true
        }
      },
      copyimage: {
        click: {
          tracked: true
        }
      }
    },
    "export": {
      pdf: {
        click: {
          tracked: true
        }
      },
      png: {
        click: {
          tracked: true
        }
      },
      svg: {
        click: {
          tracked: true
        }
      }
    },
    data: {
      column: {
        update: {},
        "delete": {},
        add: {},
        "new": {}
      }
    }
  };

  defaultPropHandler = function(name, defaults) {
    var tracked, _listener;
    if (name === 'tracked' && (defaults != null)) {
      tracked = tracked;
      if (!_.isArray(tracked)) {
        tracked = [];
      }
      _listener = function(evt, info) {
        var key, result, target, _i, _len, _ref;
        if (!_.isObject(info) && (info != null)) {
          info = {
            info: "" + info
          };
        }
        target = _.extend({}, tracked, info);
        result = {};
        _ref = _.union(['server', 'cid'], tracked);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          key = _ref[_i];
          result[key] = target[key];
        }
        return EventsFactory._track("dbb_" + name, result);
      };
      return this._defaultListeners[name] = _.throttle(_listener, 10, true);
    }
  };

  Events = EventsFactory.getTree(dbbEventTree, defaultPropHandler);

  Events.registerDefaultListeners = EventsFactory._registerDefaultListeners;

  module.exports = Events;

}).call(this);
}, "poly/main/header": function(exports, require, module) {/*
# Register events and functions for buttons in the header. Along with that, set
# up some global event triggers such as tutorial buttons, showing the share
# panel and back buttons.
*/


(function() {
  var CONST, Events, HeaderView,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Events = require('poly/main/events');

  CONST = require('poly/main/const');

  HeaderView = (function() {
    function HeaderView(isDemo) {
      var items, _i, _j, _len, _len1, _ref, _ref1,
        _this = this;
      this.isDemo = isDemo;
      this.toggleSharePanel = __bind(this.toggleSharePanel, this);
      this.backToHome = __bind(this.backToHome, this);
      this.sharePanelVisible = false;
      this.dashboardControlsVisible = ko.observable(true);
      _ref = ['numeral', 'pivottable', 'chart'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        items = _ref[_i];
        Events.ui[items].edit.on(function() {
          if (_this.sharePanelVisible) {
            return _this.toggleSharePanel();
          }
        });
      }
      _ref1 = ['chartbuilder', 'numeralbuilder', 'tablebuilder'];
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        items = _ref1[_j];
        Events.nav[items].open.on(function() {
          if (_this.sharePanelVisible) {
            return _this.toggleSharePanel();
          }
        });
      }
      Events.ui.backtodbb.click.on(function(event, params) {
        return Events.nav.dashbuilder.open.trigger(params);
      });
      if (!isDemo) {
        Events.nav.chartbuilder.open.on(function() {
          return _this.dashboardControlsVisible(false);
        });
        Events.nav.dashbuilder.open.on(function() {
          return _this.dashboardControlsVisible(true);
        });
      }
    }

    HeaderView.prototype.backToHome = function(event) {
      Events.nav.home.open.trigger();
      return false;
    };

    HeaderView.prototype.toggleSharePanel = function(self, e) {
      this.sharePanelVisible = !this.sharePanelVisible;
      if (this.sharePanelVisible) {
        Events.nav.sharepanel.open.trigger();
        $("#export-btn").addClass('active');
      } else {
        Events.nav.sharepanel.close.trigger();
        $("#export-btn").removeClass('active');
      }
    };

    return HeaderView;

  })();

  module.exports = HeaderView;

}).call(this);
}, "poly/main/init": function(exports, require, module) {(function() {
  require('poly/main/templates');

  require('poly/main/bindings').init();

}).call(this);
}, "poly/main/main/builder": function(exports, require, module) {(function() {
  var AbstractBuilderEntryPoint, DataView, Events, HeaderView, OverlayView, ShareView,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Events = require('poly/main/events');

  DataView = require('poly/main/data/dataView');

  HeaderView = require('poly/main/header');

  OverlayView = require('poly/main/overlay');

  ShareView = require('poly/main/share');

  AbstractBuilderEntryPoint = (function() {
    function AbstractBuilderEntryPoint(params) {
      var _ref;
      this.params = params;
      this.initialize = __bind(this.initialize, this);
      Events.registerDefaultListeners();
      this.dom = params.dom, this.dataCollection = params.dataCollection, this.exportingEnabled = params.exportingEnabled;
      if (this.dataCollection) {
        if (!_.isArray(this.dataCollection)) {
          this.dataCollection = [this.dataCollection];
        }
        this.dataSource = poly.data(this.dataCollection[0]);
        this.dataView = new DataView(this.dataSource);
        this.overlayView = new OverlayView();
      } else {
        throw new Error('No data collection provided!');
      }
      this.hasHeader = (_ref = params.header) != null ? _ref : false;
      this.headerView = new HeaderView(params.isDemo);
      this.shareView = new ShareView();
      if (params.width === 'fill') {
        $(this.dom).width('100%');
      }
      if (_.isNumber(params.width)) {
        $(this.dom).width(params.width);
      }
      if (params.height === 'fill') {
        $(this.dom).height('100%');
      }
      if (_.isNumber(params.height)) {
        $(this.dom).height(params.height);
      }
      if (params.width === 'fill' && params.height === 'fill') {
        $(this.dom).addClass('fill');
      }
    }

    AbstractBuilderEntryPoint.prototype.initialize = function() {
      return this.dataView.initialize();
    };

    return AbstractBuilderEntryPoint;

  })();

  module.exports = AbstractBuilderEntryPoint;

}).call(this);
}, "poly/main/main/chartbuilder": function(exports, require, module) {(function() {
  var AbstractBuilderEntryPoint, ChartMainView, ChartbuilderView, DataTableView, Events,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  AbstractBuilderEntryPoint = require('poly/main/main/builder');

  ChartbuilderView = require('poly/main/chart/chartbuilder');

  DataTableView = require('poly/main/data/datatableView');

  Events = require('poly/main/events');

  ChartMainView = (function(_super) {
    __extends(ChartMainView, _super);

    function ChartMainView(params) {
      var tableMetaData,
        _this = this;
      this.params = params;
      this.serialize = __bind(this.serialize, this);
      this.closeDataviewer = __bind(this.closeDataviewer, this);
      this.loadDataviewer = __bind(this.loadDataviewer, this);
      this.initialize = __bind(this.initialize, this);
      this.params.header = false;
      ChartMainView.__super__.constructor.call(this, this.params);
      tableMetaData = this.dataView.getTableMetaData();
      this.chartbuilderView = new ChartbuilderView(tableMetaData);
      this.chartbuilderVisible = ko.observable(true);
      this.chartbuilderView.backButtonVisible(false);
      this.dataTableView = new DataTableView(tableMetaData);
      this.dataTableViewVisible = ko.observable(false);
      Events.nav.datatableviewer.open.on(function(event, params) {
        return _this.loadDataviewer(params);
      });
      Events.nav.datatableviewer.close.on(function(event, params) {
        return _this.closeDataviewer(params);
      });
      this.initialize();
    }

    ChartMainView.prototype.initialize = function() {
      var initial, initialCols, _ref, _ref1,
        _this = this;
      initial = (_ref = this.params.initial) != null ? _ref : {};
      initialCols = (_ref1 = initial.newcols) != null ? _ref1 : [];
      return this.dataView.initialize(initialCols, function() {
        return _this.chartbuilderView.reset({
          spec: initial
        });
      });
    };

    ChartMainView.prototype.loadDataviewer = function(params) {
      if (params == null) {
        params = {};
      }
      if (!this.dataTableViewVisible()) {
        params.previous = 'chart';
        this.chartbuilderVisible(false);
      }
      this.dataTableViewVisible(true);
      return this.dataTableView.reset(params);
    };

    ChartMainView.prototype.closeDataviewer = function(params) {
      this.dataTableViewVisible(false);
      return this.chartbuilderVisible(true);
    };

    ChartMainView.prototype.serialize = function() {
      return this.chartbuilderView.serialize();
    };

    return ChartMainView;

  })(AbstractBuilderEntryPoint);

  module.exports = ChartMainView;

}).call(this);
}, "poly/main/main/chartviewer": function(exports, require, module) {(function() {
  var AbstractViewerEntryPoint, ChartViewerMainView,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  AbstractViewerEntryPoint = require('poly/main/main/viewer');

  ChartViewerMainView = (function(_super) {
    __extends(ChartViewerMainView, _super);

    function ChartViewerMainView(params) {
      var _ref;
      this.params = params;
      this.init = __bind(this.init, this);
      ChartViewerMainView.__super__.constructor.call(this, this.params);
      this.spec = (_ref = params.initial) != null ? _ref : {};
      this.tableMetaData = this.dataView.getTableMetaData();
    }

    ChartViewerMainView.prototype.init = function(dom) {
      var initialCols, _ref,
        _this = this;
      initialCols = (_ref = this.spec.newcols) != null ? _ref : [];
      return this.dataView.initialize(initialCols, function() {
        var layer, m, tableName, _base, _base1, _i, _len, _ref1;
        if (_this.spec.layer) {
          _this.spec.layers = [_this.spec.layer];
          delete _this.spec.layer;
        }
        _ref1 = _this.spec.layers;
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          layer = _ref1[_i];
          if (!layer.data) {
            tableName = layer.tableName;
            if ((tableName == null) && layer.meta && (m = _.toArray(layer.meta)[0])) {
              tableName = m.tableName;
            }
            layer.data = _this.tableMetaData.polyJsObjectFor({
              tableName: tableName
            });
          }
        }
        if ((_base = _this.spec).width == null) {
          _base.width = _this.params.width;
        }
        if ((_base1 = _this.spec).height == null) {
          _base1.height = _this.params.height;
        }
        _this.spec.dom = dom[0];
        return polyjs.chart(_this.spec);
      });
    };

    return ChartViewerMainView;

  })(AbstractViewerEntryPoint);

  module.exports = ChartViewerMainView;

}).call(this);
}, "poly/main/main/dashbuilder": function(exports, require, module) {(function() {
  var AbstractBuilderEntryPoint, CONST, ChartbuilderView, DashMainView, DashboardView, DataTableView, Events, NumeralbuilderView, NuxView, RemoteDataSource, TOAST, TUTORIAL, TablebuilderView, serverApi,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  AbstractBuilderEntryPoint = require('poly/main/main/builder');

  ChartbuilderView = require('poly/main/chart/chartbuilder');

  DashboardView = require('poly/main/dash/dashboard');

  DataTableView = require('poly/main/data/datatableView');

  Events = require('poly/main/events');

  NumeralbuilderView = require('poly/main/numeral/numeralbuilder');

  TablebuilderView = require('poly/main/table/tablebuilder');

  RemoteDataSource = require('poly/main/data/dataSource').RemoteDataSource;

  CONST = require('poly/main/const');

  TOAST = require('poly/main/error/toast');

  TUTORIAL = require('poly/main/main/tutorial');

  NuxView = require('poly/nux');

  serverApi = require('poly/common/serverApi');

  DashMainView = (function(_super) {
    __extends(DashMainView, _super);

    function DashMainView(params) {
      var saveWorthyEvents, swe, tableMetaData, _base, _i, _len, _ref,
        _this = this;
      this.params = params;
      this.serialize = __bind(this.serialize, this);
      this.closeDataviewer = __bind(this.closeDataviewer, this);
      this.loadDataviewer = __bind(this.loadDataviewer, this);
      this.closeNumeralbuilder = __bind(this.closeNumeralbuilder, this);
      this.loadNumeralbuilder = __bind(this.loadNumeralbuilder, this);
      this.closeTablebuilder = __bind(this.closeTablebuilder, this);
      this.loadTablebuilder = __bind(this.loadTablebuilder, this);
      this.closeChartbuilder = __bind(this.closeChartbuilder, this);
      this.loadChartbuilder = __bind(this.loadChartbuilder, this);
      this.closeBuilder = __bind(this.closeBuilder, this);
      this._save = __bind(this._save, this);
      this.initialize = __bind(this.initialize, this);
      if ((_base = this.params).header == null) {
        _base.header = true;
      }
      _ref = this.params, this.isDemo = _ref.isDemo, this.local = _ref.local, this.customSaving = _ref.customSaving, this.dataCollection = _ref.dataCollection;
      if (this.local == null) {
        this.local = false;
      }
      DashMainView.__super__.constructor.call(this, this.params);
      this.name = ko.observable(this.params.name);
      this.name.subscribe(function(val) {
        return _.debounce(_this._save, 300);
      });
      this.dashKey = this.params.key;
      tableMetaData = this.dataView.getTableMetaData();
      this.dashViewHref = "/dashboard/" + this.dashKey + "/view";
      this.dashboardView = new DashboardView(this.name, tableMetaData);
      this.dashVisible = ko.observable(true);
      this.chartbuilderView = new ChartbuilderView(tableMetaData);
      this.chartbuilderVisible = ko.observable(false);
      this.numeralbuilderView = new NumeralbuilderView(tableMetaData);
      this.numeralbuilderVisible = ko.observable(false);
      this.tablebuilderView = new TablebuilderView(tableMetaData);
      this.tablebuilderVisible = ko.observable(false);
      this.dataTableView = new DataTableView(tableMetaData);
      this.dataTableViewVisible = ko.observable(false);
      Events.ui.ga.notify.on(function(event, params) {
        var gaNuxSteps;
        if (_.size(_this.params.initial) > 0) {
          return;
        }
        gaNuxSteps = [
          {
            cover: 'HEADER, .content-panel',
            template: 'tmpl-nux-ga',
            buttonText: 'I understand',
            onFinish: function() {
              return Events.ui.ga.done.trigger();
            },
            ref: '.content-panel',
            top: 20,
            left: 25,
            arrowDir: 'left'
          }
        ];
        return _this.nuxView(new NuxView({
          steps: gaNuxSteps,
          onSkip: function() {
            return Events.ui.nux.skip.trigger();
          }
        }));
      });
      Events.nav.chartbuilder.open.on(function(event, params) {
        return _this.loadChartbuilder(params);
      });
      Events.nav.numeralbuilder.open.on(function(event, params) {
        return _this.loadNumeralbuilder(params);
      });
      Events.nav.tablebuilder.open.on(function(event, params) {
        return _this.loadTablebuilder(params);
      });
      Events.nav.datatableviewer.open.on(function(event, params) {
        return _this.loadDataviewer(params);
      });
      Events.nav.datatableviewer.close.on(function(event, params) {
        return _this.closeDataviewer(params);
      });
      Events.nav.dashbuilder.open.on(this.closeBuilder);
      Events.nav.home.open.on(function() {
        return _this._save(function(err, result) {
          if (!err) {
            return window.location.href = '/home';
          }
        });
      });
      Events.nav.dashviewer.open.on(function(event, params) {
        return window.location = "/dashboard/" + (encodeURIComponent(_this.dashKey)) + "/view";
      });
      saveWorthyEvents = [Events.model.dashboarditem.create, Events.model.dashboarditem.update, Events.model.dashboarditem["delete"], Events.data.column.update];
      for (_i = 0, _len = saveWorthyEvents.length; _i < _len; _i++) {
        swe = saveWorthyEvents[_i];
        swe.on(function() {
          return _this._save();
        });
      }
      this.initialize();
    }

    DashMainView.prototype.initialize = function() {
      var initial, initialCols, initialItems, _ref, _ref1, _ref2,
        _this = this;
      initial = (_ref = this.params.initial) != null ? _ref : [];
      if (_.isArray(this.params.initial)) {
        initialItems = this.params.initial;
        initialCols = [];
      } else if (_.isObject(this.params.initial)) {
        initialItems = (_ref1 = this.params.initial.items) != null ? _ref1 : [];
        initialCols = (_ref2 = this.params.initial.newcols) != null ? _ref2 : [];
      }
      this.dataView.initialize(initialCols, function() {
        return _this.dashboardView.initialize(initialItems);
      });
      if (this.params.showTutorial) {
        return this.nuxView = ko.observable(new NuxView({
          steps: TUTORIAL(this.local),
          onSkip: function() {
            Events.ui.nux.skip.trigger();
            if (!_this.local) {
              return serverApi.sendPost('/tutorial/mark-complete', {
                type: 'nux'
              }, function(err) {
                if (err) {
                  return console.error(err);
                }
              });
            }
          }
        }));
      } else {
        return this.nuxView = ko.observable(null);
      }
    };

    DashMainView.prototype._save = function(callback) {
      var dataSourceKey, serialized, tableNames;
      if (this.isDemo || (this.local && !this.customSaving)) {
        if (callback) {
          callback();
        }
        return;
      }
      serialized = {
        name: this.name(),
        spec: this.serialize(),
        dataCollection: (function() {
          var _i, _len, _ref, _ref1, _results;
          _ref = this.dataCollection;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            _ref1 = _ref[_i], dataSourceKey = _ref1.dataSourceKey, tableNames = _ref1.tableNames;
            _results.push({
              dataSourceKey: dataSourceKey,
              tableNames: tableNames
            });
          }
          return _results;
        }).call(this)
      };
      if (this.customSaving) {
        this.customSaving(serialized);
        if (callback) {
          callback();
        }
        return;
      }
      return serverApi.sendPost("/dashboard/" + (encodeURIComponent(this.dashKey)) + "/update", serialized, function(err, res) {
        if (err) {
          TOAST.raise('Error while saving dashboard');
        }
        if (callback) {
          return callback(err, res);
        }
      });
    };

    DashMainView.prototype.closeBuilder = function(event, params) {
      if (params.from === 'chart') {
        return this.closeChartbuilder();
      } else if (params.from === 'numeral') {
        return this.closeNumeralbuilder();
      } else {
        return this.closeTablebuilder();
      }
    };

    DashMainView.prototype.loadChartbuilder = function(params) {
      this.chartbuilderView.reset(params);
      this.chartbuilderVisible(true);
      return this.dashVisible(false);
    };

    DashMainView.prototype.closeChartbuilder = function() {
      var chartView, spec;
      spec = this.chartbuilderView.spec;
      if (spec && spec.layers && spec.layers.length > 0) {
        chartView = this.chartbuilderView.params.chartView;
        if (chartView != null) {
          chartView.setSpec(spec);
        } else {
          Events.ui.chart.add.trigger({
            spec: spec
          });
        }
      }
      this.chartbuilderVisible(false);
      return this.dashVisible(true);
    };

    DashMainView.prototype.loadTablebuilder = function(params) {
      this.tablebuilderView.reset(params);
      this.tablebuilderVisible(true);
      return this.dashVisible(false);
    };

    DashMainView.prototype.closeTablebuilder = function() {
      var params, spec, tableView, _ref, _ref1, _ref2;
      spec = this.tablebuilderView.spec;
      tableView = this.tablebuilderView.params.tableView;
      if (spec && (_.size((_ref = spec.values) != null ? _ref : []) + _.size((_ref1 = spec.rows) != null ? _ref1 : []) + _.size((_ref2 = spec.columns) != null ? _ref2 : [])) > 0) {
        if (tableView != null) {
          tableView.setSpec(spec);
        } else {
          params = {
            spec: spec
          };
          Events.ui.pivottable.add.trigger(params);
        }
      }
      this.tablebuilderVisible(false);
      return this.dashVisible(true);
    };

    DashMainView.prototype.loadNumeralbuilder = function(params) {
      this.numeralbuilderView.reset(params);
      this.numeralbuilderVisible(true);
      return this.dashVisible(false);
    };

    DashMainView.prototype.closeNumeralbuilder = function() {
      var numeralView, spec;
      spec = this.numeralbuilderView.spec;
      numeralView = this.numeralbuilderView.params.numeralView;
      if (numeralView != null) {
        numeralView.setSpec(spec);
      } else {
        Events.ui.numeral.add.trigger({
          spec: spec
        });
      }
      this.numeralbuilderVisible(false);
      return this.dashVisible(true);
    };

    DashMainView.prototype.loadDataviewer = function(params) {
      if (params == null) {
        params = {};
      }
      if (!this.dataTableViewVisible()) {
        params.previous = this.dashVisible() ? (this.dashVisible(false), 'dash') : this.numeralbuilderVisible() ? (this.numeralbuilderVisible(false), 'numeral') : this.chartbuilderVisible() ? (this.chartbuilderVisible(false), 'chart') : this.tablebuilderVisible() ? (this.tablebuilderVisible(false), 'table') : void 0;
      }
      this.dataTableViewVisible(true);
      return this.dataTableView.reset(params);
    };

    DashMainView.prototype.closeDataviewer = function(params) {
      this.dataTableViewVisible(false);
      switch (params.previous) {
        case 'dash':
          return this.dashVisible(true);
        case 'numeral':
          return this.numeralbuilderVisible(true);
        case 'table':
          return this.tablebuilderVisible(true);
        case 'chart':
          return this.chartbuilderVisible(true);
      }
    };

    DashMainView.prototype.serialize = function() {
      return {
        items: this.dashboardView.serialize(),
        newcols: this.dataView.serialize()
      };
    };

    return DashMainView;

  })(AbstractBuilderEntryPoint);

  module.exports = DashMainView;

}).call(this);
}, "poly/main/main/dashviewer": function(exports, require, module) {(function() {
  var AbstractViewerEntryPoint, DashViewerMainView, WorkspaceView,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  AbstractViewerEntryPoint = require('poly/main/main/viewer');

  WorkspaceView = require('poly/main/dash/workspace');

  DashViewerMainView = (function(_super) {
    __extends(DashViewerMainView, _super);

    function DashViewerMainView(params) {
      var tableMetaData;
      this.params = params;
      DashViewerMainView.__super__.constructor.call(this, this.params);
      tableMetaData = this.dataView.getTableMetaData();
      this.workspaceView = new WorkspaceView(this.params.name, tableMetaData, true);
      this.initialize();
    }

    DashViewerMainView.prototype.initialize = function() {
      var initial, initialCols, initialItems, _ref, _ref1, _ref2,
        _this = this;
      initial = (_ref = this.params.initial) != null ? _ref : [];
      if (_.isArray(this.params.initial)) {
        initialItems = this.params.initial;
        initialCols = [];
      } else if (_.isObject(this.params.initial)) {
        initialItems = (_ref1 = this.params.initial.items) != null ? _ref1 : [];
        initialCols = (_ref2 = this.params.initial.newcols) != null ? _ref2 : [];
      }
      return this.dataView.initialize(initialCols, function() {
        return _this.workspaceView.initialize(initialItems);
      });
    };

    return DashViewerMainView;

  })(AbstractViewerEntryPoint);

  module.exports = DashViewerMainView;

}).call(this);
}, "poly/main/main/tutorial": function(exports, require, module) {(function() {
  var Events, serverApi, tutorial;

  Events = require('poly/main/events');

  serverApi = require('poly/common/serverApi');

  tutorial = function(local) {
    var _this = this;
    return [
      {
        cover: '.container',
        title: 'Your First Dashboard',
        msgs: 'Welcome to the tutorial. We\'ll show you how to use the dashboard builder by\
working with two data sets: "User Data", and "Sales".',
        buttonText: 'Continue',
        onFinish: function() {
          return Events.ui.nux.firstdb.trigger();
        },
        skippable: true,
        ref: '.workspace-area',
        top: 20,
        left: 15
      }, {
        cover: 'HEADER, .content-panel',
        template: 'tmpl-nux-data-panel',
        title: 'The Data Panel',
        msgs: 'Here is where the data sets are displayed. The green buttons represent the columns in the data set.',
        instructions: [
          {
            text: 'Click the "View/Edit" button beside our first data set, "User Data"',
            event: Events.nav.datatableviewer.open
          }
        ],
        onFinish: function() {
          return Events.ui.nux.datapanel.trigger();
        },
        ref: '.content-panel',
        top: 20,
        left: 15,
        arrowDir: 'left'
      }, {
        cover: 'HEADER, .data-panel, .menu-panel',
        title: 'Data Table',
        msgs: 'We can see that this data set has 4 columns, including "signup_date", "gender", and "time_on_site", which we will work with.',
        instructions: [
          {
            text: 'After getting a sense of the data, click "Go Back" above',
            event: Events.nav.datatableviewer.close
          }
        ],
        onFinish: function() {
          return Events.ui.nux.datatable.trigger();
        },
        ref: '.data-panel',
        top: 20,
        left: 100,
        arrowDir: 'right'
      }, {
        cover: 'HEADER, .workspace-area',
        title: 'First Chart',
        msgs: 'Let\'s create our first chart! A bar chart of user signups per day should do!',
        instructions: [
          {
            text: 'Click the "Bar Chart" button',
            event: Events.ui.quickadd.expand
          }, {
            text: 'Drag "signup_date" to "X Axis"',
            event: Events.ui.metric.add
          }, {
            text: 'Drag "count(*)" to "Y Axis"',
            event: Events.ui.chart.add
          }
        ],
        onFinish: function() {
          return Events.ui.nux.chartspanel.trigger();
        },
        ref: '.workspace-area',
        top: 110,
        left: 15,
        arrowDir: 'left'
      }, {
        cover: 'HEADER, .data-panel, .menu-panel',
        title: 'Edit Chart',
        msgs: 'This chart shows the number of new users per day. You can edit it further in the chart builder screen.',
        instructions: [
          {
            text: 'Move your mouse over the chart and click "Edit Chart"',
            event: Events.nav.chartbuilder.open
          }
        ],
        onFinish: function() {
          return Events.ui.nux.workspace.trigger();
        },
        ref: '.data-panel',
        top: 70,
        left: 25,
        arrowDir: 'right'
      }, {
        cover: 'HEADER, .chart-container',
        title: 'Chart Builder',
        msgs: 'On the left here we see additional options for customizing your chart. For example, we can map other columns to, say, the colour of our bars.',
        instructions: [
          {
            text: 'Drag "gender" to "Color" to colour the bars based on gender.',
            event: Events.ui.chart.render
          }
        ],
        onFinish: function() {
          return Events.ui.nux.layerspanel.trigger();
        },
        ref: '.chart-container',
        top: 190,
        left: 15,
        arrowDir: 'left'
      }, {
        cover: 'HEADER, .chart-container',
        title: 'Chart Builder',
        msgs: 'Great! Now, notice how each bar covers a single day worth of data. We can change that.',
        instructions: [
          {
            text: 'Click "bin(signup_date, day)" on the "X Axis".',
            event: Events.ui.dropdown.show
          }, {
            text: 'Slide "Bin Size" to "week", then click anywhere outside the dropdown.',
            event: Events.ui.dropdown.hide
          }
        ],
        onFinish: function() {
          return Events.ui.nux.layerspanel2.trigger();
        },
        ref: '.chart-container',
        top: 100,
        left: 15,
        arrowDir: 'left'
      }, {
        cover: 'HEADER, .data-panel, .menu-panel',
        title: 'Going Back',
        msgs: 'Let us give the chart a title then add it to the dashboard.',
        instructions: [
          {
            text: 'Click the chart title and type in a new one, say "New Users Weekly".',
            event: Events.ui.title.add
          }, {
            text: 'Click "Return to Dashboard"',
            event: Events.nav.dashbuilder.open
          }
        ],
        onFinish: function() {
          return Events.ui.nux.layerspanel3.trigger();
        },
        ref: '.data-panel',
        top: 20,
        left: 100,
        arrowDir: 'right'
      }, {
        cover: 'HEADER, .workspace-area, .workspace-title',
        title: 'Making Tables',
        msgs: 'We can also create a table using the same data.',
        instructions: [
          {
            text: 'Click the "Make Table" button',
            event: Events.ui.quickadd.expand
          }, {
            text: 'Drag "signup_date" to "Columns"',
            event: Events.ui.metric.add
          }, {
            text: 'Drag "count(*)" to "Columns"',
            event: Events.ui.metric.add
          }, {
            text: 'Click "Draw Table"',
            event: Events.ui.pivottable.add
          }
        ],
        onFinish: function() {
          return Events.ui.nux.tablepanel.trigger();
        },
        ref: '.workspace-area',
        top: 230,
        left: 15,
        arrowDir: 'leftlower'
      }, {
        cover: 'HEADER, .data-panel, .menu-panel',
        title: 'Moving and Resizing',
        msgs: 'Great! This pivot table may be overlapping your chart, so let\'s drag it into a new position. Also, let\'s resize the pivot table by dragging the right bottom corner.',
        buttonText: 'Continue',
        onFinish: function() {
          return Events.ui.nux.workspace3.trigger();
        },
        ref: '.data-panel',
        top: 70,
        left: 25,
        arrowDir: 'right'
      }, {
        cover: 'HEADER, .data-panel, .menu-panel',
        title: 'Edit Table',
        msgs: 'The table we created is actually a pivot table with many more features. Let\'s explore some pivot table options.',
        instructions: [
          {
            text: 'Move your mouse over the chart and click "Edit Table"',
            event: Events.nav.tablebuilder.open
          }
        ],
        onFinish: function() {
          return Events.ui.nux.workspace2.trigger();
        },
        ref: '.data-panel',
        top: 70,
        left: 25,
        arrowDir: 'right'
      }, {
        cover: 'HEADER, .chart-container',
        title: 'Table Builder',
        msgs: 'You can define additional columns or rows on the left, just like any other pivot table tool.',
        instructions: [
          {
            text: 'Drag "gender" to "Columns"',
            event: Events.ui.metric.add
          }
        ],
        onFinish: function() {
          return Events.ui.nux.tableedit.trigger();
        },
        ref: '.chart-container',
        top: 50,
        left: 15,
        arrowDir: 'left'
      }, {
        cover: 'HEADER, .data-panel, .menu-panel',
        title: 'Going Back',
        msgs: 'Now we see separate data for each gender.',
        instructions: [
          {
            text: 'Click "Return to Dashboard" when you are ready.',
            event: Events.nav.dashbuilder.open
          }
        ],
        onFinish: function() {
          return Events.ui.nux.tableedit2.trigger();
        },
        ref: '.data-panel',
        top: 20,
        left: 100,
        arrowDir: 'right'
      }, {
        cover: 'HEADER, .content-panel',
        template: 'tmpl-nux-data-panel',
        title: 'Deriving Columns',
        msgs: 'You can also create new columns to visualize. Let\'s use another data set to illustrate this.',
        instructions: [
          {
            text: 'Click on our second data set, "Sales Data"',
            event: Events.ui.table.open
          }, {
            text: 'Click the "View/Edit" button beside our second data set, "Sales Data"',
            event: Events.nav.datatableviewer.open
          }
        ],
        onFinish: function() {
          return Events.ui.nux.datapanel2.trigger();
        },
        ref: '.content-panel',
        top: 130,
        left: 15,
        arrowDir: 'leftlower'
      }, {
        cover: 'HEADER, .chart-container',
        title: 'Deriving New Variables',
        msgs: 'We will now derive a new column called "profit" which is the difference of the columns "income" and "expense".',
        instructions: [
          {
            text: 'Type enter "profit" as the new column name, and "[income]-[expense]" as the formula, then click "Add Column"',
            event: Events.data.column.add
          }
        ],
        onFinish: function() {
          return Events.ui.nux.datanewcol.trigger();
        },
        ref: '.chart-container',
        top: 70,
        left: 15,
        arrowDir: 'left'
      }, {
        cover: 'HEADER, .data-panel, .menu-panel',
        title: 'Going Back',
        msgs: 'The new column should appear in the table. Let\'s go back and use it in a visualization!',
        instructions: [
          {
            text: 'Click "Go Back"',
            event: Events.nav.datatableviewer.close
          }
        ],
        onFinish: function() {
          return Events.ui.nux.workspace4.trigger();
        },
        ref: '.data-panel',
        top: 20,
        left: 100,
        arrowDir: 'right'
      }, {
        cover: 'HEADER, .workspace-area, .workspace-title',
        title: 'Making Numerals',
        msgs: 'Let\'s visualize the total sum of all profit as a single number.',
        instructions: [
          {
            text: 'Click the "Make Number" button',
            event: Events.ui.quickadd.expand
          }, {
            text: 'Drag "profit" to "Value"',
            event: Events.ui.numeral.add
          }
        ],
        onFinish: function() {
          return Events.ui.nux.numeral.trigger();
        },
        ref: '.workspace-area',
        top: 190,
        left: 15,
        arrowDir: 'leftlower'
      }, {
        cover: '.data-panel, .menu-panel',
        title: 'Nicely Done!',
        msgs: ['You\'ve successfully created a chart, pivot table, and numeral. You have completed the tutorial.', 'It\'s time to return to your data set by clicking "Home" above or by using your browser\'s back button.'],
        buttonText: 'Finish',
        onFinish: function() {
          Events.ui.nux.done.trigger();
          if (!local) {
            return serverApi.sendPost('/tutorial/mark-complete', {
              type: 'nux'
            }, function(err) {
              if (err) {
                return console.error(err);
              }
            });
          }
        },
        event: Events.nav.dashbuilder.open,
        ref: '.data-panel',
        top: 20,
        left: 25
      }
    ];
  };

  module.exports = tutorial;

}).call(this);
}, "poly/main/main/viewer": function(exports, require, module) {(function() {
  var AbstractViewerEntryPoint, DataView, Events,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  DataView = require('poly/main/data/dataView');

  Events = require('poly/main/events');

  AbstractViewerEntryPoint = (function() {
    function AbstractViewerEntryPoint(params) {
      this.params = params;
      this.initialize = __bind(this.initialize, this);
      Events.registerDefaultListeners();
      this.dom = params.dom, this.dataCollection = params.dataCollection;
      if (this.dataCollection) {
        if (!_.isArray(this.dataCollection)) {
          this.dataCollection = [this.dataCollection];
        }
        this.dataSource = poly.data(this.dataCollection[0]);
      } else {
        throw new Error('No data collection provided!');
      }
      this.dataView = new DataView(this.dataSource);
    }

    AbstractViewerEntryPoint.prototype.initialize = function() {
      return this.dataView.initialize();
    };

    return AbstractViewerEntryPoint;

  })();

  module.exports = AbstractViewerEntryPoint;

}).call(this);
}, "poly/main/numeral/numeralbuilder": function(exports, require, module) {/*
# Construciton of the Numeral Builder.
*/


(function() {
  var Aesthetic, Animation, Builder, CONST, Events, FiltersView, JoinsView, NumeralBuilderView, Parser, TOAST,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Aesthetic = require('poly/main/chart/aes/base');

  Animation = require('poly/main/anim');

  Builder = require('poly/main/builder');

  Events = require('poly/main/events');

  FiltersView = require('poly/main/chart/filters');

  JoinsView = require('poly/main/chart/joins').JoinsView;

  Parser = require('poly/main/parser');

  CONST = require('poly/main/const');

  TOAST = require('poly/main/error/toast');

  NumeralBuilderView = (function(_super) {
    __extends(NumeralBuilderView, _super);

    NumeralBuilderView.prototype.item = 'numeral';

    function NumeralBuilderView(tableMetaData) {
      var _this = this;
      this.tableMetaData = tableMetaData;
      this._addListeners = __bind(this._addListeners, this);
      this._render = __bind(this._render, this);
      this.checkRemoveMetric = __bind(this.checkRemoveMetric, this);
      this.checkNewMetric = __bind(this.checkNewMetric, this);
      this.attachedMetrics = __bind(this.attachedMetrics, this);
      this.layerRestrictions = __bind(this.layerRestrictions, this);
      NumeralBuilderView.__super__.constructor.call(this, this.tableMetaData);
      this.value = new Aesthetic('value', (function() {
        return "Value";
      }), this);
      this.title = ko.observable("Untitled Numeral");
      this.title.subscribe(function() {
        return Events.ui.chart.render.trigger();
      });
      this.filtersView = new FiltersView(this.tableMetaData, this);
      this.joinsView = new JoinsView(this.tableMetaData, {}, this);
    }

    NumeralBuilderView.prototype.layerRestrictions = function() {
      return CONST.numeral;
    };

    NumeralBuilderView.prototype.attachedMetrics = function() {
      var f;
      return _.union(_.compact([this.value.metric()]), (function() {
        var _i, _len, _ref, _results;
        _ref = this.filtersView.filters();
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          f = _ref[_i];
          _results.push(f.metric());
        }
        return _results;
      }).call(this));
    };

    NumeralBuilderView.prototype.checkNewMetric = function(event, item, callback) {
      return this.joinsView.checkAddJoins(event, item, callback);
    };

    NumeralBuilderView.prototype.checkRemoveMetric = function(event, item) {
      return this.joinsView.checkRemoveJoins();
    };

    NumeralBuilderView.prototype.reset = function(params) {
      var filter, _ref, _ref1, _ref2;
      this.params = params != null ? params : {};
      this.spec = (_ref = this.params.spec) != null ? _ref : {};
      if (this.spec.value) {
        this.value.init(this.spec.value, this.spec.tableName);
      }
      this.title(this.spec.title);
      filter = (_ref1 = this.spec.filter) != null ? _ref1 : {};
      this.filtersView.reset(filter, this.spec.meta);
      return this.joinsView.reset(((_ref2 = this.spec.additionalInfo) != null ? _ref2.joins : void 0));
    };

    NumeralBuilderView.prototype._render = function(event, params) {
      var $dom, c, error, filterSpec, h, meta, name, spec, valueMetric, valueSpec, w, _ref;
      if ((this.value == null) || (!this.value.metric())) {
        return;
      }
      $dom = $(this.dom);
      w = $dom.parent().width();
      h = $dom.parent().height();
      $dom.empty();
      valueMetric = this.value.metric();
      if ((valueMetric.gaType != null) && ((_ref = valueMetric.gaType) !== 'none' && _ref !== 'ga-metric')) {
        TOAST.raise("Unable to create a Numeral without a number! Use a metric (orange) item!");
      }
      valueSpec = this.value.generateSpec(this.tableMetaData);
      meta = {};
      meta[valueMetric.fullFormula(this.tableMetaData, true)] = _.extend(valueMetric.fullMeta(), {
        dsKey: this.tableMetaData.dsKey
      });
      meta = _.extend(meta, this.filtersView.generateMeta());
      filterSpec = this.filtersView.generateSpec();
      this.spec = {
        filter: filterSpec,
        value: valueSpec,
        meta: meta,
        tableName: valueMetric.tableName,
        data: this.tableMetaData.polyJsObjectFor({
          tableName: valueMetric.tableName
        }),
        dom: this.dom,
        width: w,
        height: h,
        title: this.title(),
        additionalInfo: {
          joins: this.joinsView.generateSpec()
        }
      };
      spec = $.extend(true, {}, this.spec);
      if (spec.title == null) {
        name = Parser.getName(spec.value);
        spec.title = "" + name;
        if (!_.isEmpty(filterSpec)) {
          spec.title += " - filtered";
        }
      }
      if (this.loadingAnim) {
        this.loadingAnim.remove();
      }
      this.loadingAnim = new Animation('loading', $dom.parent());
      try {
        c = polyjs.numeral(spec, this.loaded);
        return this._addTitleGlow(c);
      } catch (_error) {
        error = _error;
        return TOAST.raise(error.message);
      }
    };

    NumeralBuilderView.prototype._addListeners = function(dom) {
      var _this = this;
      return this._addEventListener('title-click', function(e) {
        if (e.detail.type === 'guide-title') {
          return _this._editTitle(e, _this.title, false);
        }
      });
    };

    return NumeralBuilderView;

  })(Builder);

  module.exports = NumeralBuilderView;

}).call(this);
}, "poly/main/overlay": function(exports, require, module) {/*
# Define an overlay layer, on which Dropdowns and Dialog boxes may be constructed.
*/


(function() {
  var CONST, Events, OverlayView,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Events = require('poly/main/events');

  CONST = require('poly/main/const');

  OverlayView = (function() {
    function OverlayView() {
      this.hideDialog = __bind(this.hideDialog, this);
      this.showDialog = __bind(this.showDialog, this);
      this.endHighlight = __bind(this.endHighlight, this);
      this.beginHighlight = __bind(this.beginHighlight, this);
      this.handleDocumentClick = __bind(this.handleDocumentClick, this);
      this.layoutDropdown = __bind(this.layoutDropdown, this);
      this.handleDropdownHide = __bind(this.handleDropdownHide, this);
      this.handleDropdownShow = __bind(this.handleDropdownShow, this);
      this.enableDropdown = __bind(this.enableDropdown, this);
      this.disableDropdown = __bind(this.disableDropdown, this);
      this.shadeVisible = ko.observable(false);
      this.dropdown = ko.observable(null);
      this.dropdownEnabled = true;
      Events.ui.dropdown.disable.on(this.disableDropdown);
      Events.ui.dropdown.enable.on(this.enableDropdown);
      Events.ui.dropdown.show.on(this.handleDropdownShow);
      Events.ui.dropdown.hide.on(this.handleDropdownHide);
      Events.ui.highlight.begin.on(this.beginHighlight);
      Events.ui.highlight.end.on(this.endHighlight);
      this.dialog = ko.observable(null);
      Events.ui.dialog.show.on(this.showDialog);
      Events.ui.dialog.hide.on(this.hideDialog);
    }

    OverlayView.prototype.disableDropdown = function() {
      this.dropdownEnabled = false;
      return this.handleDropdownHide();
    };

    OverlayView.prototype.enableDropdown = function() {
      return this.dropdownEnabled = true;
    };

    OverlayView.prototype.handleDropdownShow = function(event, options) {
      this.handleDropdownHide();
      if (!this.dropdownEnabled) {
        return;
      }
      this.dropdown(options);
      $("BODY").addClass("scrolling-disabled");
      $(document).on("click", this.handleDocumentClick);
      if ((options != null ? options.targetDom : void 0) != null) {
        return Events.ui.dropdown.shown.triggerElem(options.targetDom);
      }
    };

    OverlayView.prototype.handleDropdownHide = function(e) {
      var _ref;
      $(document).off("click", this.handleDocumentClick);
      $("BODY").removeClass("scrolling-disabled");
      if (((_ref = this.dropdown()) != null ? _ref.targetDom : void 0) != null) {
        Events.ui.dropdown.hidden.triggerElem(this.dropdown().targetDom);
        if (!e) {
          Events.ui.dropdown.hide.trigger();
        }
      }
      return this.dropdown(null);
    };

    OverlayView.prototype.layoutDropdown = function(dropdownDom, dropdown) {
      var $parent;
      this.dropdownDom = dropdownDom;
      $parent = $(this.dropdownDom).parents("#dropdown-container");
      $(this.dropdownDom).css({
        top: dropdown.targetDom.offset().top - $parent.offset().top + 40,
        left: dropdown.targetDom.offset().left - $parent.offset().left
      });
      $(".cover-top", this.dropdownDom).css({
        width: dropdown.targetDom.outerWidth() - 2
      });
      if (dropdown.afterRender) {
        return dropdown.afterRender();
      }
    };

    OverlayView.prototype.handleDocumentClick = function(event) {
      var found;
      if (this.dropdown() === null) {
        return;
      }
      if (this.dropdown().targetDom.get(0) === event.target || this.dropdown().targetDom.has(event.target).length > 0) {
        return true;
      }
      found = false;
      if (this.dropdownDom === event.target || $(this.dropdownDom).has(event.target).length > 0) {
        found = true;
      }
      if (!found) {
        return this.handleDropdownHide();
      }
    };

    OverlayView.prototype.beginHighlight = function(event, options) {
      var _this = this;
      this.shadeVisible(true);
      $("#shadeOverlay").click(function(event) {
        if (!event.isDefaultPrevented()) {
          Events.ui.highlight.click.trigger();
        }
        return _this.endHighlight();
      });
      if (!(options && options.selector)) {
        return;
      }
      return _.each($(options.selector), function(dom) {
        var $dom, $parent, clone;
        $dom = $(dom);
        $parent = $(dom).parents(".polychart-ui");
        clone = $dom.clone();
        clone.css({
          position: "absolute",
          left: $dom.offset().left - $parent.offset().left,
          top: $dom.offset().top - $parent.offset().top,
          width: $dom.width(),
          height: $dom.height()
        });
        $("#shadeOverlay").append(clone);
        return (_.isFunction(options.click)) && clone.click(function(event) {
          options.click(event, $dom);
          return event.preventDefault();
        });
      });
    };

    OverlayView.prototype.endHighlight = function() {
      this.shadeVisible(false);
      $("#shadeOverlay").html("");
      return $('.highlight').removeClass('highlight');
    };

    OverlayView.prototype.showDialog = function(event, options) {
      var _ref;
      if (options == null) {
        options = {};
      }
      if (!((options.template != null) && (options.view != null))) {
        return;
      }
      this.shadeVisible((_ref = options.shadeVisible) != null ? _ref : true);
      return this.dialog(options);
    };

    OverlayView.prototype.hideDialog = function() {
      this.dialog(null);
      return this.shadeVisible(false);
    };

    return OverlayView;

  })();

  module.exports = OverlayView;

}).call(this);
}, "poly/main/parser": function(exports, require, module) {/*
# Module containing utilities to extract information from Polychart2.js names
#
# NOTE: Most of these are included for backwards compatibility
#       The information here should be encoded in the builder specs
*/


(function() {
  var Parser,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Parser = (function() {
    function Parser() {
      this.getTableName = __bind(this.getTableName, this);
    }

    Parser.prototype.getName = function(spec) {
      var fullName, match, tableNameReg;
      if (spec.name != null) {
        return spec.name;
      }
      if (spec["var"] === 'count(1)') {
        return 'count(*)';
      }
      match = /(^count\(\*\)$)|^bin\((.*),.*\)|^(?:count|mean|unique|sum)\((.*)\)$/.exec(spec["var"]);
      fullName = match != null ? _.compact(match)[1] : spec["var"];
      tableNameReg = new RegExp("(.*?)\\.(.*)");
      match = tableNameReg.exec(fullName);
      if (match != null) {
        return match[2];
      } else {
        return fullName;
      }
    };

    Parser.prototype.getTableName = function(name) {
      var match, tableNameReg;
      if (!_.isString(name)) {
        name = this.getName(name);
      }
      tableNameReg = new RegExp("(.*?)\\.(.*)");
      match = tableNameReg.exec(name);
      if (match != null) {
        return match[1];
      } else {
        return null;
      }
    };

    Parser.prototype.getBinwidth = function(spec) {
      var match;
      if (spec.bin != null) {
        return spec.bin;
      }
      match = /(?:bin\()[^,]*,(\w*)\)/.exec(spec["var"]);
      if (match != null) {
        return match[1];
      } else {
        return null;
      }
    };

    Parser.prototype.getStats = function(spec) {
      var match, name;
      if (spec.stat != null) {
        return spec.stat;
      }
      name = spec["var"];
      if (name === 'count(1)') {
        return null;
      }
      match = /^count\(\*\)|$|(bin|count|mean|unique|sum)(?:\(.*\)$)/.exec(name);
      if (match != null) {
        return match[1];
      } else {
        return null;
      }
    };

    return Parser;

  })();

  module.exports = new Parser();

}).call(this);
}, "poly/main/share": function(exports, require, module) {/*
# Hook up events for the share panel.
*/


(function() {
  var CONST, Events, ShareView, serverApi,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  CONST = require('poly/main/const');

  Events = require('poly/main/events');

  serverApi = require('poly/common/serverApi');

  ShareView = (function() {
    function ShareView() {
      this.close = __bind(this.close, this);
      this.open = __bind(this.open, this);
      this.defaultPanelRight = -250;
      this.panelRight = ko.observable(this.defaultPanelRight);
      Events.nav.sharepanel.open.on(this.open);
      Events.nav.sharepanel.close.on(this.close);
    }

    ShareView.prototype.open = function() {
      return this.panelRight(0);
    };

    ShareView.prototype.close = function() {
      return this.panelRight(this.defaultPanelRight);
    };

    ShareView.prototype.exportPDF = function() {
      return Events["export"].pdf.click.trigger({
        callback: this._export('pdf')
      });
    };

    ShareView.prototype.exportPNG = function() {
      return Events["export"].png.click.trigger({
        callback: this._export('png')
      });
    };

    ShareView.prototype.exportSVG = function() {
      return Events["export"].svg.click.trigger({
        callback: this._export('svg')
      });
    };

    ShareView.prototype._export = function(type) {
      return function(serial) {
        return serverApi.sendPost("/dashboard/export/code", {
          serial: serial,
          exportType: type
        }, function(err, result) {
          if (err) {
            console.error(err);
            TOAST.raise('Error exporting dashboard.');
            return;
          }
          return window.location = "/api/dashboard/export/" + encodeURIComponent(result.code);
        });
      };
    };

    return ShareView;

  })();

  module.exports = ShareView;

}).call(this);
}, "poly/main/table/aesGroup": function(exports, require, module) {(function() {
  var AesGroupView, AttachedMetricView, CONST, DND, Events, Parser, TOAST,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  AttachedMetricView = require('poly/main/data/metric/attached');

  Events = require('poly/main/events');

  Parser = require('poly/main/parser');

  CONST = require('poly/main/const');

  DND = require('poly/main/dnd');

  TOAST = require('poly/main/error/toast');

  AesGroupView = (function() {
    function AesGroupView(aesName, tableMetaData, optionsValue, parent) {
      this.aesName = aesName;
      this.tableMetaData = tableMetaData;
      this.optionsValue = optionsValue;
      this.parent = parent;
      this.initMetricItem = __bind(this.initMetricItem, this);
      this.enable = __bind(this.enable, this);
      this.disable = __bind(this.disable, this);
      this._actualMetricEnter = __bind(this._actualMetricEnter, this);
      this.onMetricEnter = __bind(this.onMetricEnter, this);
      this.generateSpec = __bind(this.generateSpec, this);
      this.options = __bind(this.options, this);
      this.enabled = ko.observable(true);
      this.metrics = ko.observableArray();
      this.metrics.subscribe(function() {
        return Events.ui.chart.render.trigger();
      });
    }

    AesGroupView.prototype.options = function() {
      return this.optionsValue;
    };

    AesGroupView.prototype.reset = function(specList, tableMeta) {
      var _this = this;
      this.metrics.removeAll();
      return _.each(specList, function(spec) {
        var defaults, name, params, tableName, _ref;
        if (spec["var"]) {
          name = Parser.getName(spec);
          tableName = (_ref = spec.tableName) != null ? _ref : tableMeta[polyjs.parser.unbracket(spec["var"])].tableName;
          params = {
            data: {
              name: name,
              tableName: tableName
            }
          };
          defaults = {
            sort: spec.sort,
            asc: spec.asc,
            bin: Parser.getBinwidth(spec),
            stats: CONST.stats.statToName[Parser.getStats(spec)]
          };
          return _this._actualMetricEnter(null, params, defaults);
        }
      });
    };

    AesGroupView.prototype.generateSpec = function() {
      var m, _i, _len, _ref, _results;
      _ref = this.metrics();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        m = _ref[_i];
        _results.push(m.generateSpec(this.tableMetaData));
      }
      return _results;
    };

    AesGroupView.prototype.onMetricEnter = function(event, item, defaults) {
      var _this = this;
      if (defaults == null) {
        defaults = {};
      }
      return this.parent.checkNewMetric(event, item, function() {
        return _this._actualMetricEnter(event, item, defaults);
      });
    };

    AesGroupView.prototype._actualMetricEnter = function(event, item, defaults) {
      var columnInfo, m,
        _this = this;
      if (defaults == null) {
        defaults = {};
      }
      columnInfo = this.tableMetaData.getColumnInfo(item.data);
      m = new AttachedMetricView(columnInfo, 'Table', Events.ui.chart.render.trigger, this.options, this.parent.attachedMetrics, defaults);
      this.metrics.push(m);
      Events.ui.metric.add.trigger();
      return Events.ui.metric.remove.onElem(m, function() {
        _this.metrics.remove(m);
        return _this.parent.checkRemoveMetric();
      });
    };

    AesGroupView.prototype.disable = function() {
      return this.enabled(false);
    };

    AesGroupView.prototype.enable = function() {
      return this.enabled(true);
    };

    AesGroupView.prototype.initMetricItem = function(dom, view) {
      DND.makeDraggable(dom, view);
      return view.attachDropdown(dom);
    };

    return AesGroupView;

  })();

  module.exports = AesGroupView;

}).call(this);
}, "poly/main/table/tablebuilder": function(exports, require, module) {/*
# Construciton of the Table Builder.
*/


(function() {
  var AesGroup, Aesthetic, Animation, Builder, CONST, Events, FiltersView, JoinsView, PADDING, TOAST, TableBuilderView,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  AesGroup = require('poly/main/table/aesGroup');

  Aesthetic = require('poly/main/chart/aes/base');

  Animation = require('poly/main/anim');

  Builder = require('poly/main/builder');

  Events = require('poly/main/events');

  FiltersView = require('poly/main/chart/filters');

  JoinsView = require('poly/main/chart/joins').JoinsView;

  CONST = require('poly/main/const');

  TOAST = require('poly/main/error/toast');

  PADDING = 10;

  TableBuilderView = (function(_super) {
    __extends(TableBuilderView, _super);

    TableBuilderView.prototype.item = 'table';

    function TableBuilderView(tableMetaData) {
      this.tableMetaData = tableMetaData;
      this._render = __bind(this._render, this);
      this.checkRemoveMetric = __bind(this.checkRemoveMetric, this);
      this.checkNewMetric = __bind(this.checkNewMetric, this);
      this.attachedMetrics = __bind(this.attachedMetrics, this);
      TableBuilderView.__super__.constructor.call(this, this.tableMetaData);
      this.valuesView = new AesGroup('Values', this.tableMetaData, CONST.table.value, this);
      this.columnsView = new AesGroup('Columns', this.tableMetaData, CONST.table.column, this);
      this.rowsView = new AesGroup('Rows', this.tableMetaData, CONST.table.row, this);
      this.filtersView = new FiltersView(this.tableMetaData, this);
      this.joinsView = new JoinsView(this.tableMetaData, {}, this);
    }

    TableBuilderView.prototype.attachedMetrics = function() {
      var f;
      return _.union(this.valuesView.metrics(), this.columnsView.metrics(), this.rowsView.metrics(), (function() {
        var _i, _len, _ref, _results;
        _ref = this.filtersView.filters();
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          f = _ref[_i];
          _results.push(f.metric());
        }
        return _results;
      }).call(this));
    };

    TableBuilderView.prototype.checkNewMetric = function(event, item, callback) {
      return this.joinsView.checkAddJoins(event, item, callback);
    };

    TableBuilderView.prototype.checkRemoveMetric = function(event, item) {
      return this.joinsView.checkRemoveJoins();
    };

    TableBuilderView.prototype.reset = function(params) {
      var filter, meta, tableName, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;
      this.params = params != null ? params : {};
      this.spec = (_ref = this.params.spec) != null ? _ref : {};
      _ref1 = this.spec, tableName = _ref1.tableName, meta = _ref1.meta;
      this.valuesView.reset((_ref2 = this.spec.values) != null ? _ref2 : [], meta);
      this.columnsView.reset((_ref3 = this.spec.columns) != null ? _ref3 : [], meta);
      this.rowsView.reset((_ref4 = this.spec.rows) != null ? _ref4 : [], meta);
      this.joinsView.reset(((_ref5 = this.spec.additionalInfo) != null ? _ref5.joins : void 0));
      filter = (_ref6 = this.spec.filter) != null ? _ref6 : {};
      this.filtersView.reset(filter, this.spec.meta);
      return Events.ui.table.focus.trigger({
        name: tableName
      });
    };

    TableBuilderView.prototype._render = function(event, params) {
      var $dom, error, filterSpec, h, meta, metric, metrics, spec, w, _i, _len;
      $dom = $(this.dom);
      w = $dom.parent().width() - PADDING * 2;
      h = $dom.parent().height() - PADDING * 2;
      $dom.empty();
      meta = {};
      metrics = _.union(this.valuesView.metrics(), this.columnsView.metrics(), this.rowsView.metrics());
      for (_i = 0, _len = metrics.length; _i < _len; _i++) {
        metric = metrics[_i];
        meta[metric.fullFormula(this.tableMetaData, true)] = _.extend(metric.fullMeta(), {
          dsKey: this.tableMetaData.dsKey
        });
      }
      if (!metric) {
        return;
      }
      meta = _.extend(meta, this.filtersView.generateMeta());
      filterSpec = this.filtersView.generateSpec();
      this.spec = {
        meta: meta,
        tableName: metric.tableName,
        data: this.tableMetaData.polyJsObjectFor({
          tableName: metric.tableName
        }),
        filter: filterSpec,
        values: this.valuesView.generateSpec(),
        columns: this.columnsView.generateSpec(),
        rows: this.rowsView.generateSpec(),
        dom: this.dom,
        width: w,
        height: h,
        additionalInfo: {
          joins: this.joinsView.generateSpec()
        }
      };
      spec = $.extend(true, {}, this.spec);
      if (this.loadingAnim) {
        this.loadingAnim.remove();
      }
      this.loadingAnim = new Animation('loading', $dom.parent());
      try {
        return polyjs.pivot(spec, this.loaded);
      } catch (_error) {
        error = _error;
        return TOAST.raise(error.message);
      }
    };

    return TableBuilderView;

  })(Builder);

  module.exports = TableBuilderView;

}).call(this);
}, "poly/main/template": function(exports, require, module) {/*
Author : Jeeyoung Kim

Custom templating engine for knockout.

It uses the same templating syntax, except the templates can be provided
as a JSON string, instead of referring to the actual DOM elements.
*/


(function() {
  var ObjectTemplateSource, StringTemplateEngine, loadTemplateEngine;

  StringTemplateEngine = function(templates) {
    this.templates = templates;
    /*
    constructor for the String template engine.
    
    Notice that this class is not defined via coffeescript's "class" keyword,
    but the prototype is configured via ko.utils.extend...,
    this is because `StringTemplateEngine` primarily interacts with knockout code,
    which uses ko.utils.extend() internally.
    
    * templates - {String:String}
    */

    this.allowTemplateRewriting = false;
    this.templateCache = {};
  };

  StringTemplateEngine.prototype = ko.utils.extend(new ko.nativeTemplateEngine(), {
    makeTemplateSource: function(template) {
      var value;
      if (typeof template === 'string') {
        if (this.templates[template]) {
          if (this.templateCache[template]) {
            return this.templateCache[template];
          }
          return (this.templateCache[template] = new ObjectTemplateSource(this.templates[template]));
        } else {
          throw new Error("Unknown template type: " + template);
        }
      }
      value = ko.nativeTemplateEngine.prototype.makeTemplateSource.apply(this, arguments);
      return value;
    }
  });

  ObjectTemplateSource = (function() {
    /*
    Implements the template source API that's defined internally inside Knockout.js
    */

    function ObjectTemplateSource(template) {
      this.template = template;
      this.data = {};
    }

    ObjectTemplateSource.prototype.text = function() {
      /*
      Getter / setter for text.
      */

      if (arguments.length === 0) {
        return this.template;
      }
      return this.template = arguments[0];
    };

    ObjectTemplateSource.prototype.data = function(key) {
      /*
      Getter / setter for data
      */

      var value;
      if (arguments.length === 1) {
        return this.data[key];
      }
      value = arguments[1];
      return this.data[key] = value;
    };

    return ObjectTemplateSource;

  })();

  loadTemplateEngine = function(templateDefinitions) {
    /*
    Function to initialize knockout templates from strings.
    */

    var engine;
    engine = new StringTemplateEngine(templateDefinitions);
    return ko.setTemplateEngine(engine);
  };

  module.exports = {
    loadTemplateEngine: loadTemplateEngine
  };

}).call(this);
}, "poly/main/templates": function(exports, require, module) {require('poly/main/template').loadTemplateEngine({"tmpl-dropdown": "<div>\n<div class=\"select-icon\"></div>\n<div class=\"name\">\n</div>\n<div class=\"metric-option-arrow\">\n</div>\n</div>", "tmpl-filter-nonull": "<input class=\"metric-option-item-checkbox\" type=\"checkbox\" data-bind=\"checked:notNull\">\n</input>Not Null", "tmpl-overlay-container": "<div id='dialog-container' data-bind=\"visible: dialog\">\n<!-- ko if: dialog() -->\n<div data-bind=\"template: {\nname: dialog().template,\ndata: dialog().view,\n}\"></div>\n<!-- /ko -->\n</div>\n<div id='dropdown-container'>\n<!-- ko if: dropdown() -->\n<div data-bind=\"template: {\nname: 'tmpl-overlay-dropdown-dialog',\ndata: dropdown,\nafterRender: layoutDropdown\n}\"></div>\n<!-- /ko -->\n</div>\n<div id=\"shadeOverlay\" data-bind=\"css: {active: shadeVisible}\">\n</div>", "tmpl-header": "<header>\n<img class=\"logo\" src=\"/static/main/images/logo.svg\" data-bind=\"click: backToHome\"/>\n<div id=\"db-controls\">\n<!-- ko if: dashboardControlsVisible() -->\n<div class=\"btn-header\">\n<a href=\"/demo?showTutorial=yes\" target=\"_blank\">\n<div class=\"content\">Tutorial</div>\n</a>\n</div>\n<!-- ko ifnot: isDemo -->\n<div class=\"btn-header\">\n<a id=\"view-btn\"\ntarget=\"_blank\"\ndata-bind=\"{attr: {href: $parent.dashViewHref}}\">\n<div class=\"content\">Viewer</div>\n</a>\n</div>\n<!-- /ko -->\n<!-- ko if: $parent.exportingEnabled -->\n<div class=\"btn-header\" data-bind=\"click: toggleSharePanel\">\n<a id=\"export-btn\">\n<div class=\"content\">Export</div>\n</a>\n</div>\n<!-- /ko -->\n<!-- /ko -->\n<a data-bind=\"click: backToHome\" id=\"backToHome\" class=\"btn-header\">\n<div class=\"content\">Home</div>\n</a>\n</div>\n</header>", "tmpl-nds-form-source-type": "<div>\n<!-- ko foreach: typeButtons -->\n<div data-bind=\"click: $parent.typeButtonClicked,\nattr: {'class': 'btn-large btn-img img-' + $data.name},\ncss: {\nselected: $parent.type() == $data.name,\nright: $index() % 2 == 1,\nwide: $data.wide,\n}\">\n<div class=\"content\"></div>\n</div>\n<!-- /ko -->\n</div>", "tmpl-metric-droppable": "<div class=\"droppable\" data-bind=\"css: {disabled: !enabled}\">\n<div class=\"inner cf\">\n<img class=\"droppable-img\" src=\"/static/main/images/drag.png\"></img>\n<div class=\"droppable-text\"><span class='bolded'>SELECT</span> Metric</div>\n</div>\n</div>", "tmpl-filter-cat": "<div class=\"menu-item-container\">\n<div class=\"menu-item-name\">\n</div>\n<div class=\"menu-item\">\n<div class=\"dropdown btn-large\"\ndata-bind=\"DropdownMulti: {\noptions: filterCatOptions,\noptionsText: filterCatOptionsText,\nselected: filterCatValue,\nname: 'catChoices'\n}\"></div>\n<div class=\"null-filter-big\" data-bind=\"template: 'tmpl-filter-nonull', visible: showNotNull && !filterCatValue().length\"></div>\n</div>\n</div>", "tmpl-facet": "<div class=\"cf advanced-panel-content\" data-dnd-type=\"metric\" data-bind=\"pui_dndContainer: {itementer:onMetricEnter,itemdiscard:onMetricDiscard,datatype:'metric',name:'splitby',rerender:metric}\">\n<div class=\"advanced-panel-name\">Split By</div>\n<div class=\"advanced-panel-metric\">\n<!-- ko if: metric -->\n<div class=\"dropped-metric\" data-bind=\"template: {\ndata: metric,\nname: metricTemplate,\nafterRender: initMetricItem,\n}\">\n</div>\n<!-- /ko -->\n<!-- ko ifnot: metric -->\n<!-- ko template: {name: 'tmpl-metric-droppable', data: {enabled: true}} --><!-- /ko -->\n<!-- /ko -->\n</div>\n</div>", "tmpl-table-metric-list": "<div class=\"table-metric-list\" data-bind=\"css: {selected: selected}\">\n<div class=\"details\">\n<a class=\"btn-large\" data-bind=\"click: openDataTableViewer\">View/Edit</a>\n</div>\n<div class=\"table-title\" data-bind=\"click: select\">\n<div class=\"title-text\" data-bind=\"text: name\"></div>\n<div class=\"arrow\"></div>\n</div>\n<div class=\"metrics\" data-bind=\"style: {maxHeight: renderHeight() + 'px'}\">\n<!-- Extra div to help with animation -->\n<div data-bind=\"template: {\nforeach: visibleMetrics,\nname: 'tmpl-metric-item',\nafterRender: initMetric,\n}\">\n</div>\n</div>\n</div>", "tmpl-overlay-dropdown-dialog": "<div class=\"dropdown-dialog\">\n<div class=\"cover-top\"></div>\n<div data-bind=\"template: {\nname: templateName,\ndata: data,\n}\"></div>\n</div>", "tmpl-chart-viewer": "<div class=\"chart-inner\">\n</div>", "tmpl-aesthetic-size": "<div class=\"menu-item-container\" data-dnd-type=\"metric\" data-bind=\"pui_dndContainer: {itementer:onMetricEnter,itemdiscard:onMetricDiscard,datatype:'metric',name:name,rerender:metric}, css: {disabled: !enabled()}\">\n<div class=\"menu-item-name\">\n<div class=\"content\" data-bind=\"text: name\"></div>\n</div>\n<div class=\"menu-item\">\n<!-- ko if: metric -->\n<div class=\"dropped-metric\" data-bind=\"template: {\ndata: metric,\nname: metricTemplate,\nafterRender: initMetricItem,\n}\">\n</div>\n<!-- /ko -->\n<!-- ko ifnot: metric -->\n<div class=\"droppable\">\n<div class=\"slider-container\">\n<div class=\"slider selector\"></div>\n</div>\n</div>\n<!-- /ko -->\n</div>\n</div>", "tmpl-metric-option": "<div class=\"metric-option\">\n<div class=\"metric-option-item\" data-bind=\"template: {name: 'tmpl-metric-tableName'}\">\n</div>\n<!-- ko if: ((type == 'num' || type == 'date') && stats() == 'None') -->\n<div class=\"metric-option-item\" data-bind=\"template: {name: 'tmpl-metric-option-bin', afterRender: initSlider}\">\n</div>\n<!-- /ko -->\n<div class=\"metric-option-item\" data-bind=\"template: {name: 'tmpl-metric-option-stats'}\"></div>\n<!-- ko if: type == 'cat' -->\n<div class=\"metric-option-item\" data-bind=\"template: {name: 'tmpl-metric-option-sort'}\"></div>\n<!-- /ko -->\n<div class=\"btn-large\" data-bind=\"click: discard\">\n<img src=\"/static/main/images/icon_close.png\" />\n<div class=\"content\" data-bind=\"text: removeText\">\n</div>\n</div>\n</div>", "tmpl-filter": "<div class=\"menu-item-container\"\ndata-dnd-type=\"metric\"\ndata-bind=\"pui_dndContainer: {\nitementer:onMetricEnter,\nitemdiscard:onMetricDiscard,\ndropfilter:dropFilter,\ndatatype:'metric',\nname:label},\ncss: {disabled: !$parent.enabled()}\">\n<div class=\"menu-item-name\">\n<div class=\"content\" data-bind=\"text: label\"></div>\n</div>\n<div class=\"menu-item\">\n<div class=\"dropped-metric\" data-bind=\"template: {\ndata: metric,\nname: 'tmpl-metric-dropdown',\nafterRender: initMetricItem\n}\">\n</div>\n</div>\n</div>\n<!-- ko template: {\nname: 'tmpl-filter-slider',\nif: metric().type == 'date' || metric().type == 'num',\nafterRender: initSliderFilter\n}--><!-- /ko -->\n<!-- ko template: {\nname: 'tmpl-filter-cat',\nif: metric().type == 'cat',\nafterRender: initCatFilter\n}--><!-- /ko -->", "tmpl-main": "<div class=\"container\" data-bind='css: { hasheader: hasHeader }'>\n<!-- ko if: nuxView -->\n<!-- ko template: {name: 'tmpl-nux', data: nuxView} --><!-- /ko -->\n<!-- /ko -->\n<!-- ko if: hasHeader -->\n<!-- ko template: {name: 'tmpl-header', data: headerView } --><!-- /ko -->\n<!-- /ko -->\n<!-- ko template: {name: 'tmpl-overlay-container', data: overlayView } --><!-- /ko -->\n<div class='graphbuilder-main'>\n<!-- ko template: {name: 'tmpl-data-panel', data:dataView} --><!-- /ko -->\n<div class=\"dashboard-container\" data-bind=\"css: {visible: dashVisible}\">\n<!-- ko if: dashVisible -->\n<!-- ko template: {name: 'tmpl-dash', data: dashboardView} --><!-- /ko -->\n<!-- /ko -->\n</div>\n<div class=\"chartbuilder-container\" data-bind=\"css: {visible: chartbuilderVisible}\">\n<!-- ko if: chartbuilderVisible -->\n<!-- ko template: {name: 'tmpl-chartbuilder', data: chartbuilderView} --><!-- /ko -->\n<!-- /ko -->\n</div>\n<div class=\"chartbuilder-container\" data-bind=\"css: {visible: numeralbuilderVisible}\">\n<!-- ko if: numeralbuilderVisible -->\n<!-- ko template: {name: 'tmpl-numeralbuilder', data: numeralbuilderView} --><!-- /ko -->\n<!-- /ko -->\n</div>\n<div class=\"chartbuilder-container\" data-bind=\"css: {visible: tablebuilderVisible}\">\n<!-- ko if: tablebuilderVisible -->\n<!-- ko template: {name: 'tmpl-tablebuilder', data: tablebuilderView} --><!-- /ko -->\n<!-- /ko -->\n</div>\n<div class=\"chartbuilder-container\" data-bind=\"css: {visible: dataTableViewVisible }\">\n<!-- ko if: dataTableViewVisible -->\n<!-- ko template: {name: 'tmpl-datatableviewer', data: dataTableView } --><!-- /ko -->\n<!-- /ko -->\n</div>\n</div>\n<!-- ko template: {name: 'tmpl-sharepanel', data: shareView} --><!-- /ko -->\n</div>", "tmpl-chart-item": "<div class=\"chart item\"\ndata-bind=\"style: {zIndex: zIndex},\npui_jqDraggableResizeable: dragResizeParams,\ncss: {'drag-shadow': isDragging},\nevent: {mousedown: onSelect}\">\n<div class=\"chart-inner\">\n</div>\n<div class=\"chart-error\" data-bind=\"visible: error\">\n<span class=\"text\" data-bind=\"text: error\"></span>\n</div>\n<div class=\"details\" data-bind=\"visible: !isViewer()\">\n<div class=\"details-button editChartBtn\" data-bind=\"click: editChart\">\n<img src=\"/static/main/images/icon_edit.png\" />\n<span class=\"text\"><span class=\"keyword\">Edit</span> Chart</span>\n</div>\n<div class=\"details-button deleteChartBtn\" data-bind=\"click: deleteItem\">\n<img src=\"/static/main/images/icon_delete.svg\" />\n<span class=\"text\"><span class=\"keyword\">Delete</span> Chart</span>\n</div>\n</div>\n</div>", "tmpl-tablebuilder-inner": "<div class='tablebuilder-table'></div>", "tmpl-quickadd-table": "<div class='quickadd-container' data-bind=\"css: {expanded: expanded}\">\n<div class='quickadd-container-inner'>\n<div class='quickadd-item' data-bind=\"click:toggleExpand\">\n<div data-bind=\"attr: {class: imageClass} \"/>\n<div>\n<span class=\"bolded\">MAKE</span> <span data-bind=\"text:name\">\n</div>\n</div>\n<div class=\"expansion\" data-bind=\"style: {maxHeight: renderHeight() + 'px'}\">\n<div class=\"expansion-container\">\n<div class=\"aes full-width\" data-dnd-type=\"metric\" data-bind=\"pui_dndContainer: {itementer:addMetric,itemdiscard:discardMetric,dropfilter:dropFilter,datatype:'metric',name:'addfilter'}, css: {disabled: !enabled()}\">\n<div class=\"title\">Columns</div>\n<!-- ko template: {name: 'tmpl-metric-droppable', data: {enabled: enabled()}} --><!-- /ko -->\n</div>\n<div class=\"aes dropped-metric\" data-bind=\"visible:rows().length\">\n<div class=\"title\">Categories</div>\n<!-- ko foreach: rows -->\n<div data-dnd-type=\"metric\" data-bind=\"pui_dndContainer: {itemdiscard:$parent.discardMetric,datatype:'metric',name:name}, css: {disabled: !$parent.enabled()}\">\n<div class=\"menu-item dropped-metric\" data-bind=\"template: {\ndata: $data,\nname: 'tmpl-metric-attached',\nafterRender: $parent.initMetricItem,\n}\">\n</div>\n</div>\n<!-- /ko -->\n</div>\n<div class=\"aes dropped-metric\" data-bind=\"visible:values().length\">\n<div class=\"title\">Values</div>\n<!-- ko foreach: values -->\n<div data-dnd-type=\"metric\" data-bind=\"pui_dndContainer: {itemdiscard:$parent.discardMetric,datatype:'metric',name:name}, css: {disabled: !$parent.enabled()}\">\n<div class=\"menu-item dropped-metric\" data-bind=\"template: {\ndata: $data,\nname: 'tmpl-metric-attached',\nafterRender: $parent.initMetricItem,\n}\">\n</div>\n</div>\n<!-- /ko -->\n</div>\n<div data-bind=\"visible: !canAdd() && !successIndicatorVisible()\">\n<span class=\"info-text\">\nAdd least one numeric and one non-numeric column.\n</span>\n</div>\n<div class=\"btn-large\" data-bind=\"visible: canAdd, click: addItem\">\nDraw Table\n</div>\n<div class=\"success-indicator\" data-bind=\"css: {visible: successIndicatorVisible}\">\nTable created successfully!\n</div>\n</div>\n</div>\n</div>\n</div>", "tmpl-advanced-panel": "<div id=\"advanced-panel\">\n<h1 class=\"underlined\">Chart Options</h1>\n<div class=\"advanced-panel-single\" data-bind=\"template: {name: 'tmpl-facet', data: facetView }\"></div>\n<div class=\"advanced-panel-single\" data-bind=\"template: {name: 'tmpl-coord', data: coordView }\"></div>\n</div>", "tmpl-nds-form-socket-filename": "<p>\nUnfortunately, we couldn't automatically determine the location of your database's\nUnix socket file.\n</p>\n<p>\nDon't worry!\nYou can usually find this by searching your database configuration file\nby searching for \"socket\", or running the command <code>netstat -ln | grep mysql</code>.\nFeel free to contact us if you're having trouble.\n</p>\n<div>\n<label>Socket File Path</label>\n<input type=\"text\" maxlength=\"255\" name=\"dbUnixSocket\" data-bind=\"value: dbUnixSocket\" />\n</div>", "tmpl-data-panel": "<div class=\"data-panel\">\n<h1>Data</h1>\n<div class=\"scroll\" data-bind=\"template: {\nforeach: tableViews,\nname: 'tmpl-table-metric-list',\nafterRender: initTable,\n}\"></div>\n</div>", "tmpl-csv-clean-header": "<div data-bind=\"attr: {'class': 'column-type ' + dataType()},\nclick: changeDataType\"></div>\n<span class=\"column-name\" data-bind=\"pui_contentEditable: name\" contenteditable></span>", "tmpl-joins-editor-basic": "<div>\n<div class=\"joins-close\" data-bind=\"click: cancelJoin\"></div>\n<h1>New Table Join Required</h1>\n<div class=\"underlined\">\nYou just added a column from a new table, and must join the table\nwith an existing table to continue.\n</div>\n<div class=\"joins-headers\">\n<span class=\"left bolded\">Tables</span>\n<span class=\"mid bolded\">Join</span>\n<span class=\"right bolded\">New Table</span>\n</div>\n<!-- ko template: { name: 'tmpl-joins-box'} --><!-- /ko -->\n<div class=\"joins-buttons\">\n<div class=\"btn-flat\" data-bind=\"click: cancelJoin\">\n<span class=\"bolded\">Cancel</span> Join\n</div>\n<div class=\"btn-large\" data-bind=\"click: confirmJoin\">\n<span class=\"bolded\">Confirm</span> Join\n</div>\n</div>\n</div>", "tmpl-quickadd-aes": "<div class=\"aes full-width\" data-dnd-type=\"metric\" data-bind=\"pui_dndContainer: {itementer:onMetricEnter,itemdiscard:onMetricDiscard,dropfilter:dropFilter,datatype:'metric',name:aes,rerender:metric}, css: {disabled: !enabled()}\">\n<div class=\"title\" data-bind=\"text: aes\"></div>\n<!-- ko if: metric -->\n<div class=\"dropped-metric\" data-bind=\"template: {\ndata: metric,\nname: 'tmpl-metric-attached',\nafterRender: initMetricItem,\n}\">\n</div>\n<!-- /ko -->\n<!-- ko ifnot: metric -->\n<!-- ko template: {name: 'tmpl-metric-droppable', data: {enabled: enabled()}} -->\n<!-- /ko -->\n<!-- /ko -->\n</div>", "tmpl-dashboard-viewer": "<div class=\"graphbuilder-main\">\n<div class=\"dashboard-container\" data-bind=\"css: {viewer: true}\">\n<!-- ko template: {name: 'tmpl-workspace', data:workspaceView, afterRender: workspaceView.init} --><!-- /ko -->\n</div>\n</div>", "tmpl-joins": "<!-- ko if: hasJoins -->\n<div class=\"menu-item-container\" data-bind=\"\">\n<div class=\"menu-item-name\"></div>\n<div class=\"btn-large edit-joins\"\ndata-bind=\"click: openViewer, css: { renderable: !renderable() }\">\n<div class=\"content\">\n<span class=\"bolded\">VIEW</span> Joins</div>\n</div>\n</div>\n<!-- /ko -->", "tmpl-quickadd-numeral": "<div class='quickadd-container' data-bind=\"css: {expanded: expanded}\">\n<div class='quickadd-container-inner'>\n<div class='quickadd-item' data-bind=\"click:toggleExpand\">\n<div data-bind=\"attr: {class: imageClass} \"/>\n<div>\n<span class=\"bolded\">MAKE</span> <span data-bind=\"text:name\">\n</div>\n</div>\n<div class=\"expansion\" data-bind=\"style: {maxHeight: renderHeight() + 'px'}\">\n<div class=\"expansion-container\">\n<!-- ko template: { name: 'tmpl-quickadd-aes', data: metricView } -->\n<!-- /ko -->\n<div class=\"success-indicator\" data-bind=\"css: {visible: successIndicatorVisible}\">\nValue created successfully!\n</div>\n</div>\n</div>\n</div>\n</div>", "tmpl-numeralbuilder-inner": "<div class='chartbuilder-chart'></div>", "tmpl-nds-form-csv-choose": "<p>\nPlease select one or more CSV files to upload.\n</p>\n<div>\n<input type=\"file\" name=\"csvFile\" data-bind=\"value: csvFile\" multiple />\n</div>", "tmpl-aesthetic-color": "<div class=\"menu-item-container\" data-dnd-type=\"metric\" data-bind=\"pui_dndContainer: {itementer:onMetricEnter,itemdiscard:onMetricDiscard,datatype:'metric',name:name,rerender:metric}, css: {disabled: !enabled()}\">\n<div class=\"menu-item-name\">\n<div class=\"content\" data-bind=\"text: name\"></div>\n</div>\n<div class=\"menu-item\">\n<!-- ko if: metric -->\n<div class=\"dropped-metric\" data-bind=\"template: {\ndata: metric,\nname: metricTemplate,\nafterRender: initMetricItem,\n}\">\n</div>\n<!-- /ko -->\n<!-- ko ifnot: metric -->\n<div class=\"droppable\">\n<input class='selector' value='#CC3333' type=\"text\" data-bind=\"afterRender: afterRender\" />\n</div>\n<!-- /ko -->\n</div>\n</div>", "tmpl-coord": "<div class=\"cf advanced-panel-content\">\n<a id=\"flip-btn\" class=\"btn-large\" data-bind=\"click: flipClick\">\n<div class=\"content\">\nFlip Axes\n</div>\n</a>\n</div>", "tmpl-datatableviewer": "<div class='menu-panel'>\n<div class=\"menu-container\">\n<!-- ko if: canAddVar -->\n<div class=\"menu-section\" data-bind=\"template:{ data: editView, name: 'tmpl-datatable-edit'}\"></div>\n<div class=\"menu-section\" data-bind=\"template: { data: autocompleteView, name: 'tmpl-datatable-newcol', afterRender: initAutocomplete }\"></div>\n<!-- /ko -->\n</div>\n</div>\n<div class='content-panel'>\n<div class=\"buttons cf\">\n<div data-bind=\"click: navigateBack\" class=\"btn-flat cf\">\n<img src=\"/static/main/images/icon_back_white.svg\" />\n<div class=\"content\">Go Back</div>\n</div>\n</div>\n<div class='chart-container'>\n<!-- ko if: errorMessage -->\n<div class=\"datatable-error\" data-bind=\"text:errorMessage\"></div>\n<!-- /ko -->\n<!-- ko ifnot: errorMessage -->\n<!-- ko template: { name: 'tmpl-datatable-slickgrid', afterRender: initSlickgridDom } --><!-- /ko -->\n<!-- /ko -->\n</div>\n</div>", "tmpl-tablebuilder": "<div class='menu-panel'>\n<div class=\"menu-container\">\n<!-- ko template: {name: 'tmpl-aesgroup', data: columnsView} --><!-- /ko -->\n<!-- ko template: {name: 'tmpl-aesgroup', data: rowsView} --><!-- /ko -->\n<!-- ko template: {name: 'tmpl-aesgroup', data: valuesView} --><!-- /ko -->\n<div style=\"height: 20px\"></div>\n<h1 class=\"underlined\">Filter</h1>\n<!-- ko template: {name: 'tmpl-filters', data: filtersView } --><!-- /ko -->\n<!-- ko if: joinsView.hasJoins -->\n<div style=\"height: 20px\"></div>\n<h1 class=\"underlined\">Joins</h1>\n<!-- ko template: {name: 'tmpl-joins', data: joinsView } --><!-- /ko -->\n<!-- /ko -->\n</div>\n</div>\n<div class='content-panel'>\n<div class=\"buttons cf\">\n<!-- ko if: backButtonVisible() -->\n<div data-bind=\"click: backToDashboard\" class=\"btn-flat cf\">\n<img src=\"/static/main/images/icon_back_white.svg\" />\n<div class=\"content\">Return to Dashboard</div>\n</div>\n<!-- /ko -->\n</div>\n<div class='chart-container'>\n<!-- ko template: {name: 'tmpl-tablebuilder-inner', afterRender: initDom } --><!-- /ko -->\n</div>\n</div>", "tmpl-nux-ga": "<h1>Google Analytics</h1>\n<p>\nLooks like you connected with a Google Analytics account! We have a quick\nnote for you to make your experience with Polychart in Google Analytics a bit\nmore comfortable.\n</p>\n<p>\nAs you might know, Google Analytics separates things into\n<span style='font-style: italic'>metrics</span> and <span style='font-style: italic;'>dimensions</span>. This is important\nsince Google Analytics requires at least one metric whenever you ask it for\ndata.\n</p>\n<p>\n<span style='font-style: italic;'>Consequently, any chart must have <span style='font-weight: bold;'>at least one metric item.</span></span>\n</p>\n<p>\nFor clarity, <span style='font-weight: bold;'>metrics</span> are <span style='font-weight: bold; color: #ff9900'>orange</span> whereas\n<span style='font-weight: bold;'>dimensions</span> are <span style='font-weight: bold; color: #84BCA5'>green</span>.\n</p>\n<p>\nWith that, happy charting!\n</p>", "tmpl-metric-item": "<div class=\"metric\" data-bind=\"css: extraCSS, attr: { title: name }\">\n<div class=\"metric-icon\" data-bind=\"css: type\"></div>\n<div class=\"metric-name\" data-bind=\"text: name\"></div>\n<div class=\"drag-hint\"></div>\n</div>", "tmpl-nds-form-name-ds": "<p>\nPlease choose a name for this data source.\n</p>\n<div>\n<input type=\"text\" maxlength=\"200\" placeholder=\"eg. Customer Database\" name=\"name\" data-bind=\"value: name\" />\n</div>", "tmpl-quickadd-comment": "<div class='quickadd-container'>\n<div class='quickadd-container-inner'>\n<div class='quickadd-item' data-bind=\"click:addItem\">\n<div data-bind=\"attr: {class: imageClass} \"/>\n<div>\n<span class=\"bolded\">MAKE</span> <span data-bind=\"text:name\">\n</div>\n</div>\n</div>\n</div>", "tmpl-nds-form-direct-connection": "<div>\n<label>Host</label>\n<input type=\"text\" maxlength=\"255\" placeholder=\"eg. db.example.com\" name=\"dbHost\" data-bind=\"value: dbHost\" />\n<label>Port</label>\n<input type=\"text\" maxlength=\"5\" name=\"dbPort\" pattern=\"{\\d}[1-5]\" data-bind=\"value: dbPort\" />\n</div>", "tmpl-layer": "<div class=\"single-layer\">\n<div class=\"menu-item-container\">\n<div class=\"menu-item-name\">\n<div class=\"content\">Type</div>\n</div>\n<div class=\"menu-item\">\n<div class='dropdown chart-dropdown btn-large'\ndata-bind=\"DropdownSingle: {\noptions: plotOptionsItem,\nselected: plotOptionSelected,\nhasIcons: true,\nname: 'type'\n}\"></div>\n</div>\n</div>\n<div data-bind=\"foreach: visibleAesthetics\" class=\"full-width cf\">\n<div data-bind= \"template: {name: template, afterRender: afterRender}\"></div>\n</div>\n<!-- ko template: {name: 'tmpl-joins', data: joinsView } --><!-- /ko -->\n<div id=\"filters\">\n<!-- ko template: {name: 'tmpl-filters', data: filtersView } --><!-- /ko -->\n</div>\n<div class=\"menu-item-container\">\n<div class=\"menu-item-name\"></div>\n<div class=\"btn-flat\" href=\"#\" data-bind=\"click: removeLayer\">\n<div class=\"content\">\n<img src=\"/static/main/images/icon_delete.svg\" />\n<span class=\"bolded\">Delete</span> Layer\n</div>\n</div>\n</div>\n</div>", "tmpl-nds-form-database-account": "<p>\nPlease create a database account for Polychart.\n</p>\n<p>\nWe recommend making this account read-only.\nIf you need help with this step, feel free to contact us.\n</p>\n<div>\n<label>Database Username</label>\n<input type=\"text\" maxlength=\"50\" value=\"polychart\" name=\"dbUsername\" data-bind=\"value: dbUsername\" />\n<label>Database Password</label>\n<input type=\"password\" maxlength=\"50\" name=\"dbPassword\" data-bind=\"value: dbPassword\" />\n<label>Database Name</label>\n<input type=\"text\" maxlength=\"60\" name=\"dbName\" data-bind=\"value: dbName\" />\n</div>", "tmpl-metric-option-bin": "<div class=\"metric-option-item-title\">\nBin Size:\n</div>\n<!-- ko if: binoptional -->\n<input class=\"metric-option-item-checkbox\" type=\"checkbox\" data-bind=\"checked:binned\">\n</input>\n<!-- /ko -->\n<div class=\"metric-option-item-container\">\n<div class=\"slider-container\">\n<div class=\"slider selector\"></div>\n<div class=\"slider-value\">\n<span data-bind=\"text: binwidth\"></span>\n</div>\n</div>\n</div>", "tmpl-chartbuilder-chart": "<div class='chartbuilder-chart'></div>", "tmpl-filter-slider": "<!-- ko if: metric().type == 'date' -->\n<div class=\"date-filter-dropdown menu-item-container\">\n<div class=\"menu-item-name\">\n</div>\n<div class=\"menu-item\">\n<div class='dropdown btn-large'\ndata-bind=\"DropdownSingle: {\noptions: dateOptions,\nselected: dateOptionSelected,\nhasIcons: false,\nname: 'dateRange'\n}\"></div>\n</div>\n</div>\n<!-- /ko -->\n<div class=\"menu-item-container\" data-bind=\"visible: sliderVisible\">\n<div class=\"menu-item-name\">\n</div>\n<div class=\"menu-item\">\n<div class=\"slider-container\">\n<div class=\"slider selector\"></div>\n<div class=\"slider-value\">\n<span data-bind=\"text: filterDisplay()\"></span>\n</div>\n</div>\n<div class=\"null-filter-big\" data-bind=\"template: 'tmpl-filter-nonull', visible: showNotNull\"></div>\n</div>\n</div>", "tmpl-formula-docs": "<div class=\"formula-close\" data-bind=\"click: closeHelp\"></div>\n<h1 class=\"underlined\">New Column Formula: Syntax and Functions</h1>\n<div class=\"formula-inner-scrollable\">\n<div class='formula-section'>General</div>\n<table>\n<tr>\n<td colspan=2>\nYou can use a formula to create new, derived columns based on\nexisting data columns. The formulas can use any of the below\nstructures and functions, and reference any existing columns.<br />\n<td>\n<tr>\n<td class=\"formula-function\">Referencing Columns</td>\n<td class=\"formula-explanation\">\nRefer to other columns by typing \"[\" and selecting the appropriate column that appears in the dropdown.<br/>\ne.g. [X], [y]\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">Calling Functions</td>\n<td class=\"formula-explanation\">\nCall functions using the function name, and brackets enclosing parameters. <br />\ne.g. log([x]), indexOf([x], \"a\")\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">Control Flow</td>\n<td class=\"formula-explanation\">\nTo evaluate one of two expressions based on a conditional, use the expression <b>if [cond] then [conseq] else [altern]</b>. Make sure that the [conseq] and [altern] are of the same type (both should be numbers, categories, or dates)<br />\ne.g. if indexOf([x], \"a\") == -1 then \"aNotInX\" else \"aInX\"\n</td>\n</tr>\n</table>\n<div class=\"formula-section-spacing\"></div>\n<div class='formula-section'>Numeric Functions</div>\n<table>\n<tr>\n<td class=\"formula-function\">+, -, *, /, %</td>\n<td class=\"formula-explanation\">\nadding, subtracting, multiplying, dividing, and taking modulos of two numbers\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">&lt;, &lt;=, &gt;, &gt;=, !=, ==</td>\n<td class=\"formula-explanation\">\nevaluations of equalities and inequalities\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">log</td>\n<td class=\"formula-explanation\">\ntakes the logarithm of a number\n</td>\n</tr>\n</table>\n<div class=\"formula-section-spacing\"></div>\n<div class='formula-section'>String Functions</div>\n<table>\n<tr>\n<td class=\"formula-function\">++</td>\n<td class=\"formula-explanation\">\nconcatenates two strings<br/>\ne.g. \"A\" ++ \"B\" = \"AB\"\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">substr</td>\n<td class=\"formula-explanation\">\ntake a substring of a string at the desired starting location and length<br/>\ne.g. substr(\"hello\", 1, 2) = \"el\"\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">length</td>\n<td class=\"formula-explanation\">\nfinds the length of a string<br/>\ne.g. length(\"hello\") = 5\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">upper</td>\n<td class=\"formula-explanation\">\nmake all letters in a string upper case<br/>\ne.g. upper(\"myString500\") = \"MYSTRING500\"\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">lower</td>\n<td class=\"formula-explanation\">\nmake all letters in a string lower case<br/>\ne.g. lower(\"myString500\") = \"mystring500\"\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">indexOf </td>\n<td class=\"formula-explanation\">\nreturn the first index at which a substring occurs in a string, or -1 if it does not exist<br/>\ne.g. indexOf(\"myString500\", \"String\") = 2<br/>\nindexOf(\"haystack\", \"needle\") = -1\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">parseNum </td>\n<td class=\"formula-explanation\">\nturn a string into a number<br/>\ne.g. parseNum(\"500\") = 500\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">parseDate</td>\n<td class=\"formula-explanation\">\nturn a string into a date; with an optionally specified format<br/>\ne.g. parseDate(\"2012-03-05\") = 2012-03-05<br/>\nparseDate(\"2012-03-05\", \"YYYY-MM-DD\") = 2012-03-05\n</td>\n</tr>\n</table>\n<div class=\"formula-section-spacing\"></div>\n<div class=\"formula-section\">Date Functions</div>\n<table>\n<tr>\n<td class=\"formula-function\">year</td>\n<td class=\"formula-explanation\">\nextracts the year from a date\n</td>\n</td>\n<tr>\n<td class=\"formula-function\">month</td>\n<td class=\"formula-explanation\">\nextracts the month from a date, in integers, where January is month 1\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">dayOfMonth</td>\n<td class=\"formula-explanation\">\nextracts the day of the month from a date\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">dayOfYear</td>\n<td class=\"formula-explanation\">\nextracts the day of the year from a date\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">dayOfWeek</td>\n<td class=\"formula-explanation\">\nextracts the day of the week from a date, where Sunday is 0, Saturday is 6\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">hour</td>\n<td class=\"formula-explanation\">\nextracts the hour from a date, from 0 to 23\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">minute</td>\n<td class=\"formula-explanation\">\nextracts the minute from a date\n</td>\n</tr>\n<tr>\n<td class=\"formula-function\">second </td>\n<td class=\"formula-explanation\">\nextracts the second from a date\n</td>\n</tr>\n</table>\n</div>", "tmpl-nds-form-csv-clean": "<p>\nPlease verify that your dataset appears as intended.\n</p>\n<div class=\"csv-clean-options\">\n<div class=\"cf csv-table-selector\">\n<div class=\"btn-large prev-table-btn\"\ndata-bind=\"class: {hidden: !isPrevTableEnabled()},\nclick: prevTable\">\n<div class=\"content\">\n<img src=\"static/main/images/icon_arrow_left.svg\" />\n</div>\n</div>\n<div class=\"btn-large next-table-btn\"\ndata-bind=\"class: {hidden: !isNextTableEnabled()},\nclick: nextTable\">\n<div class=\"content\">\n<img src=\"static/main/images/icon_arrow_right.svg\" />\n</div>\n</div>\n<div class=\"csv-table-name\" data-bind=\"pui_contentEditable: curTable().tableName\" contenteditable></div>\n</div>\n<div class=\"csv-table-options\">\n<label>Does the file have a header?</label>\n<div class=\"selector\" data-bind=\"template: {name: 'tmpl-selector', data: curTable().hasHeader}\">\n</div>\n<label>Delimiter</label>\n<div class=\"selector\" data-bind=\"template: {name: 'tmpl-selector', data: curTable().delimiter}\">\n</div>\n<label>Number of rows to process (optional)</label>\n<input type=\"text\" maxlength=\"5\" pattern=\"{\\d}[1-5]\" data-bind=\"value: curTable().rowsToKeep\" placeholder=\"(all)\" />\n</div>\n<div id=\"slickgrid-container\" data-bind=\"SlickgridData: slickRows, SlickgridColumns: slickColumns, SlickgridHeaderTmpl: 'tmpl-csv-clean-header'\">\n</div>\n</div>", "tmpl-dropdown-single-menu": "<div class=\"dropdown-single-menu\">\n<!-- ko foreach: options -->\n<div class=\"option\"\ndata-bind=\"\nclick: $data.handler,\nvisible: $data.selected()[1] != $data.value || $data.selected()[0] != $data.text\n\">\n<!-- ko if: $data.iconClass -->\n<div data-bind=\"attr: {class: $data.iconClass}\"></div>\n<!-- /ko -->\n<div class=\"name\" data-bind=\"html: $data.text\"></div>\n</div>\n<!-- /ko -->\n</div>", "tmpl-quickadd-item": "<div class='quickadd-container' data-bind=\"css: {expanded: expanded}\">\n<div class='quickadd-container-inner'>\n<div class='quickadd-item' data-bind=\"click:toggleExpand\">\n<div data-bind=\"attr: {class: imageClass} \"/>\n<div>\n<span class=\"bolded\">MAKE</span> <span data-bind=\"text:name\">\n</div>\n</div>\n<div class=\"expansion\" data-bind=\"style: {maxHeight: renderHeight() + 'px'}\">\n<div class=\"expansion-container\">\n<!-- ko template: { name: 'tmpl-quickadd-aes', data: metricView1 } -->\n<!-- /ko -->\n<!-- ko template: { name: 'tmpl-quickadd-aes', data: metricView2 } -->\n<!-- /ko -->\n<div class=\"success-indicator\" data-bind=\"css: {visible: successIndicatorVisible}\">\nChart created successfully!\n</div>\n</div>\n</div>\n</div>\n</div>", "tmpl-filter-dropdown": "<div class=\"dropdown-content metric-option\">\n<div class=\"metric-option-item\" data-bind=\"template: {name: 'tmpl-metric-tableName', data: metric}\">\n</div>\n<div class=\"btn-large\" data-bind=\"click: onMetricDiscard\">\n<img src=\"/static/main/images/icon_close.png\" />\n<div class=\"content\" data-bind=\"text: 'Remove this Filter'\">\n</div>\n</div>\n</div>", "tmpl-nds-form-csv-upload": "<p>\n<span data-bind=\"visible: !error()\">Uploading your CSV files...</span>\n<span class=\"progress-text\" data-bind=\"text: progressText()\"></span>\n</p>\n<div class=\"progress-bar\" data-bind=\"css: {error: error()}\">\n<div class=\"progress-complete\" data-bind=\"style: {width: progressWidth() + '%'}\">\n</div>\n</div>", "tmpl-sharepanel": "<div id=\"share\" data-bind=\"style: {right: panelRight() + 'px'}\">\n<h1 class=\"spc_lt\">Export</h1>\n<div data-bind=\"click: exportPDF\" class=\"btn-large\">\nExport to PDF\n</div>\n<div data-bind=\"click: exportPNG\" class=\"btn-large\">\nExport to PNG\n</div>\n<div data-bind=\"click: exportSVG\" class=\"btn-large\">\nExport to SVG\n</div>\n</div>", "tmpl-aesthetic": "<div class=\"menu-item-container\" data-dnd-type=\"metric\" data-bind=\"pui_dndContainer: {itementer:onMetricEnter,itemdiscard:onMetricDiscard,dropfilter:dropFilter,datatype:'metric',name:name,rerender:metric}, css: {disabled: !enabled()}\">\n<div class=\"menu-item-name\">\n<div class=\"content\" data-bind=\"text: name()\"></div>\n</div>\n<div class=\"menu-item\">\n<!-- ko if: metric -->\n<div class=\"dropped-metric\" data-bind=\"template: {\ndata: metric,\nname: metricTemplate,\nafterRender: initMetricItem,\n}\">\n</div>\n<!-- /ko -->\n<!-- ko ifnot: metric -->\n<!-- ko template: {name: 'tmpl-metric-droppable', data: {enabled: enabled()}} --><!-- /ko -->\n<!-- /ko -->\n</div>\n</div>", "tmpl-comment-item": "<div class=\"item comment\"\ndata-bind=\"style: {zIndex: shiftedZIndex},\npui_jqDraggableResizeable: dragResizeParams,\ncss: {'drag-shadow': isDragging},\nevent: {mousedown: onSelect}\">\n<div class=\"comment-bg\">\n<div class=\"author\" data-bind=\"text: author\">\n</div>\n<div class=\"container\">\n<div class=\"content\" contenteditable=\"true\"\ndata-bind=\"pui_contentEditable: textContent,\npui_placeholder: defaultText,\npui_placeholder_class: 'default',\npui_draggableSelector: '.item',\nattr: {contenteditable: !isViewer()},\nevent: {blur: onEditAreaBlur},\nenable: !isViewer(),\ncss: {enabled: !isViewer()}\">\n</div>\n</div>\n<div class=\"details\" data-bind=\"visible: !isViewer(), click: deleteItem\">\n<div class=\"deleteButton\"></div>\n</div>\n</div>\n</div>", "tmpl-text-item": "<div class=\"item text\"\ndata-bind=\"style: {zIndex: zIndex},\npui_jqDraggableResizeable: dragResizeParams,\ncss: {'drag-shadow': isDragging},\nevent: {mousedown: onSelect}\">\n<div class=\"content\" contenteditable=\"true\"\ndata-bind=\"pui_contentEditable: textContent,\npui_placeholder: defaultText,\npui_draggableSelector: '.item',\nattr: {contenteditable: !isViewer()},\nevent: {blur: onEditAreaBlur},\ncss: {enabled: !isViewer()}\">\n</div>\n</div>", "tmpl-nds-form-ssh": "<p>\nPlease create a new user account for Polychart on the server running your database.\nFeel free to contact us if you would like help restricting what access this account\nhas to your server.\n</p>\n<p>\nImportant: please ensure that you have the \"socat\" package installed on your server.\n</p>\n<div>\n<label>SSH Username</label>\n<input type=\"text\" maxlength=\"255\" value=\"polychart\" name=\"sshUsername\" data-bind=\"value: sshUsername\" />\n<label>SSH Host</label>\n<input type=\"text\" maxlength=\"255\" placeholder=\"eg. dbserver.example.com\" name=\"sshHost\" data-bind=\"value: sshHost\" />\n<label>SSH Port</label>\n<input type=\"text\" maxlength=\"5\" name=\"sshPort\" value=\"22\" pattern=\"{\\d}[1-5]\" data-bind=\"value: sshPort\" />\n<label>Place this public key into <strong>~/.ssh/authorized_keys</strong> of the user account home directory:</label>\n<textarea name=\"sshPublicKey\" data-bind=\"text: sshPublicKey\" readonly=\"true\"></textarea>\n</div>", "tmpl-datatable-slickgrid": "<div class='datatable-slickgrid'></div>", "tmpl-datatable-edit": "<!-- ko if: metricViews().length -->\n<h1>Edit Columns</h1>\n<!-- ko foreach: metricViews() -->\n<div class=\"menu-item-container\">\n<div class=\"edit-metric-content\">\n<div class=\"metric-name\" data-bind=\"text: metric.name\"></div>\n<a data-bind=\"click: deleteMetric\">delete</a>\n</div>\n</div>\n<!-- /ko -->\n</div>\n<!-- /ko -->", "tmpl-numeralbuilder": "<div class='menu-panel'>\n<div class=\"menu-container\">\n<h1>Value</h1>\n<!-- ko with: value -->\n<div data-bind= \"template: {name: template, afterRender: afterRender}\"></div>\n<!-- /ko -->\n<!-- ko template: {name: 'tmpl-filters', data: filtersView } --><!-- /ko -->\n</div>\n</div>\n<div class='content-panel'>\n<div class=\"buttons cf\">\n<!-- ko if: backButtonVisible() -->\n<div data-bind=\"click: backToDashboard\" class=\"btn-flat cf\">\n<img src=\"/static/main/images/icon_back_white.svg\" />\n<div class=\"content\">Return to Dashboard</div>\n</div>\n<!-- /ko -->\n</div>\n<div class='chart-container'>\n<!-- ko template: {name: 'tmpl-numeralbuilder-inner', afterRender: initDom } --><!-- /ko -->\n</div>\n</div>", "tmpl-filters": "<div class=\"filter-list\" data-bind=\"template: {\nforeach: filters,\nname: 'tmpl-filter'\n}\">\n</div>\n<div id=\"new-filter\" class=\"menu-item-container\"\ndata-dnd-type=\"metric\"\ndata-bind=\"pui_dndContainer: {\nitementer:onMetricEnter,\ndropfilter:dropFilter,\ndatatype:'metric',\nname:'addfilter'},\ncss: {disabled: !enabled()}\">\n<div class=\"menu-item-name\">\n<div class=\"content\">Add Filter</div>\n</div>\n<div class=\"menu-item\">\n<!-- ko template: {name: 'tmpl-metric-droppable', data: {enabled: enabled()}} --><!-- /ko -->\n</div>\n</div>", "tmpl-dropdown-multi-menu": "<div class=\"dropdown-multi-menu\">\n<!-- ko foreach: options -->\n<div class=\"option\"\ndata-bind=\"\nclick: $data.handler,\ncss: { checked: $data.selected }\n\">\n<div class=\"name\" data-bind=\"html: $data.text\"></div>\n</div>\n<!-- /ko -->\n</div>", "tmpl-nds-form-connection-type": "<p>\nPlease select how you would like Polychart to connect to your database.\n</p>\n<p>\n<strong>SSH</strong>: Polychart will use an encrypted SSH connection.\n</p>\n<p>\n<strong>Direct connection</strong>: Polychart will connect directly to your database.\nThis option may require that you open an additional port in your firewall.\n</p>\n<div>\n<select data-bind=\"options: options, optionsText: optionsText, value: type\"></select>\n</div>", "tmpl-pivottable-item": "<div class=\"pivot-table item\"\ndata-bind=\"style: {zIndex: zIndex},\npui_jqDraggableResizeable: dragResizeParams,\ncss: {'drag-shadow': isDragging},\nevent: {mousedown: onSelect}\">\n<div class=\"inner\"></div>\n<div class=\"details\" data-bind=\"visible: !isViewer()\">\n<div class=\"details-button editChartBtn\" data-bind=\"click: editPivot\">\n<img src=\"/static/main/images/icon_edit.png\" />\n<span class=\"text\"><span class=\"keyword\">Edit</span> Table</span>\n</div>\n<div class=\"details-button deleteChartBtn\" data-bind=\"click: deleteItem\">\n<img src=\"/static/main/images/icon_delete.svg\" />\n<span class=\"text\"><span class=\"keyword\">Delete</span> Table</span>\n</div>\n</div>\n</div>", "tmpl-main-chart": "<div class=\"container\" data-bind='css: { hasheader: hasHeader }'>\n<!-- ko if: hasHeader -->\n<!-- ko template: {name: 'tmpl-header', data: headerView } --><!-- /ko -->\n<!-- /ko -->\n<!-- ko template: {name: 'tmpl-overlay-container', data: overlayView } --><!-- /ko -->\n<div class='graphbuilder-main'>\n<!-- ko template: {name: 'tmpl-data-panel', data:dataView} --><!-- /ko -->\n<div class=\"chartbuilder-container\" data-bind=\"css: {visible: chartbuilderVisible}\">\n<!-- ko if: chartbuilderVisible -->\n<!-- ko template: {name: 'tmpl-chartbuilder', data: chartbuilderView} --><!-- /ko -->\n<!-- /ko -->\n</div>\n<div class=\"chartbuilder-container\" data-bind=\"css: {visible: dataTableViewVisible }\">\n<!-- ko if: dataTableViewVisible -->\n<!-- ko template: {name: 'tmpl-datatableviewer', data: dataTableView } --><!-- /ko -->\n<!-- /ko -->\n</div>\n</div>\n<!-- ko template: {name: 'tmpl-sharepanel', data: shareView} --><!-- /ko -->\n</div>", "tmpl-datatable-newcol": "<h1>New Column</h1>\n<div class=\"menu-item-container\">\n<div class=\"menu-item-name\">\n<div class=\"content\">Name</div>\n</div>\n<div class=\"menu-item\">\n<input type=\"text\" name=\"alias\" class=\"formula-alias\" data-bind=\"value: alias\"/>\n</div>\n</div>\n<div class=\"menu-item-container\">\n<div class=\"menu-item-name\">\n<div class=\"content formula\">Formula</div>\n</div>\n<div class=\"menu-item\">\n<input type=\"text\" name=\"formula\" class=\"formula-input\" data-bind=\"value: formula\"/>\n<a class='help-docs' data-bind=\"click: openHelp\">(open help docs)</a>\n</div>\n</div>\n<!-- ko if: errorMessage != '' -->\n<div class=\"menu-item-container\">\n<span data-bind=\"text: errorMessage\"></span>\n</div>\n<!-- /ko -->\n<div class=\"btn-large\" data-bind=\"click: addItem\">\nAdd Column\n</div>", "tmpl-joins-box": "<div class=\"join-box\">\n<div class=\"left\">\n<div class=\"dropdown-block\">\n<div class=\"dropdown\"\ndata-bind=\"DropdownSingle: {\noptions: existingTables,\nselected: existingTableSel,\nhasIcons: false,\nname: 'joinTableFirst'\n}\"></div>\n</div>\n<div class=\"dropdown-block\">\n<div class=\"dropdown\"\ndata-bind=\"DropdownSingle: {\noptions: existingVars,\nselected: existingVarSel,\nhasIcons: false,\nname: 'joinVarsFirst'\n}\"></div>\n</div>\n</div>\n<div class=\"mid\">\n<div class=\"dropdown-block\">\n<div class=\"dropdown\"\ndata-bind=\"DropdownSingle: {\noptions: joinTypes,\nselected: joinTypeSel,\nhasIcons: false,\nname: 'joinTypes'\n}\"></div>\n</div>\n</div>\n<div class=\"right\">\n<div class=\"dropdown-block\">\n<div class=\"dropdown\"\ndata-bind=\"DropdownSingle: {\noptions: newTableDummy,\nselected: newTableSelDummy,\nhasIcons: false,\nname: 'joinTableSecond'\n}\"></div>\n</div>\n<div class=\"dropdown-block\">\n<div class=\"dropdown\"\ndata-bind=\"DropdownSingle: {\noptions: newVars,\nselected: newVarSel,\nhasIcons: false,\nname: 'joinVarsSecond'\n}\"></div>\n</div>\n</div>\n</div>", "tmpl-quickadd": "<div class='menu-panel'>\n<h1>Charts</h1>\n<!-- ko template: {name: 'tmpl-quickadd-item', data: lineView} --><!-- /ko -->\n<!-- ko template: {name: 'tmpl-quickadd-item', data: barView} --><!-- /ko -->\n<!-- ko template: {name: 'tmpl-quickadd-item', data: pieView} --><!-- /ko -->\n<!-- ko template: {name: 'tmpl-quickadd-numeral', data: numeralView} --><!-- /ko -->\n<!-- ko template: {name: 'tmpl-quickadd-table', data: tableView} --><!-- /ko -->\n<!-- ko template: {name: 'tmpl-quickadd-comment', data: commentView} --><!-- /ko -->\n<!-- ko template: {name: 'tmpl-custom-item'} --><!-- /ko -->\n<!-- ko template: {name: 'tmpl-custom-table'} --><!-- /ko -->\n</div>", "tmpl-chartbuilder": "<div class='menu-panel'>\n<div class=\"menu-container\">\n<h1>Layers</h1>\n<div class=\"layer-list\" data-bind=\"template: {\nforeach: layers,\nname: 'tmpl-layer'\n}\">\n</div>\n<div id=\"new-layer\" class=\"btn-large\" data-bind=\"click:addLayer\">\n<div class=\"content\">\n<img src=\"/static/main/images/icon_plus.png\" /><span class=\"bolded\">Add</span> New Layer\n</div>\n</div>\n<!-- ko template: {name: 'tmpl-advanced-panel', data: advancedPanel } --><!-- /ko -->\n</div>\n</div>\n<div class='content-panel'>\n<div class=\"buttons cf\">\n<!-- ko if: backButtonVisible() -->\n<div data-bind=\"click: backToDashboard\" class=\"btn-flat cf\">\n<img src=\"/static/main/images/icon_back_white.svg\" />\n<div class=\"content\">Return to Dashboard</div>\n</div>\n<!-- /ko -->\n<!--\n<div id=\"export-btn\" class=\"btn-flat cf\">\n<img src=\"/static/main/images/icon_export_white.svg\" />\n<div class=\"content\">Export Chart</div>\n</div>\n-->\n&nbsp;\n</div>\n<div class='chart-container'>\n<!-- ko template: {name: 'tmpl-chartbuilder-chart', afterRender: initDom } --><!-- /ko -->\n</div>\n</div>", "tmpl-workspace": "<div class='content-panel' data-bind=\"css: {viewer: isViewer}\">\n<!-- ko if: isViewer -->\n<div class=\"workspace-title\" data-bind=\"text: title\"></div>\n<!-- /ko -->\n<!-- ko ifnot: isViewer -->\n<div class=\"workspace-title\"\ncontenteditable=\"true\"\ndata-bind=\"pui_contentEditable: title,\npui_placeholder: 'Untitled Dashboard'\"></div>\n<!-- /ko -->\n<div class='workspace-area'>\n<div class='workspace-panel' data-bind=\"css: {viewer: isViewer}\">\n<div class='workspace-items' data-bind=\"css: {viewer: isViewer}\">\n<!-- ko foreach: items -->\n<!-- ko template: { name: templateName, afterRender: init } --><!-- /ko -->\n<!-- /ko -->\n</div>\n</div>\n</div>\n</div>", "tmpl-numeral-item": "<div class=\"chart item\"\ndata-bind=\"style: {zIndex: zIndex},\npui_jqDraggableResizeable: dragResizeParams,\ncss: {'drag-shadow': isDragging},\nevent: {mousedown: onSelect}\">\n<div class=\"chart-inner\">\n</div>\n<div class=\"details\" data-bind=\"visible: !isViewer()\">\n<div class=\"details-button editChartBtn\" data-bind=\"click: editNumeral\">\n<img src=\"/static/main/images/icon_edit.png\" />\n<span class=\"text\"><span class=\"keyword\">Edit</span> Number</span>\n</div>\n<div class=\"details-button deleteChartBtn\" data-bind=\"click: deleteItem\">\n<img src=\"/static/main/images/icon_delete.svg\" />\n<span class=\"text\"><span class=\"keyword\">Delete</span> Number</span>\n</div>\n</div>\n</div>", "tmpl-metric-attached": "<div class=\"metric\" data-bind=\"click: toggleDropdown, css: extraCSS\">\n<div class=\"metric-icon\" data-bind=\"css: type\"></div>\n<div class=\"metric-name\" data-bind=\"text: visibleName\"></div>\n<!-- ko if: name != 'count(*)' -->\n<div class=\"metric-option-arrow\"></div>\n<!-- /ko -->\n</div>", "tmpl-selector": "<!-- ko foreach: options -->\n<div class=\"selectorOption\">\n<input class=\"radio\" type=\"radio\" data-bind=\"attr: {name: $parent.name, id: $parent.name + '-' + value, value: value}, checked: $parent._value\" />\n<label class=\"styledRadio\" data-bind=\"attr: {for: $parent.name + '-' + value}\"></label>\n<span class=\"radioLabel\" data-bind=\"text: label, attr: {for: $parent.name + '-' + value}\"></span>\n</div>\n<!-- /ko -->", "tmpl-new-data-source": "<div id=\"new-data-source-wrapper\">\n<div class=\"arrow\"></div>\n<div id=\"new-data-source-top\"></div>\n<div id=\"new-data-source\">\n<div id=\"new-data-source-content\">\n<h1>Add New Data Source</h1>\n<h2>Step <span data-bind=\"text: stepNum()+1\"></span>: <span data-bind=\"text: formStep().stepName\"></span></h2>\n<div class=\"progress-bar\">\n<div class=\"progress-complete\"\ndata-bind=\"style: {width: progPercWidth() + 'px'}\">\n</div>\n</div>\n<form data-bind=\"submit: formSubmit\">\n<div class=\"step cf\" data-bind=\"template:{\nname: formStep().templateName,\ndata: formStep(),\nafterRender: initFormStep\n}\">\n</div>\n</form>\n<div id=\"disable-actions\" data-bind=\"visible: actionsDisabled\"></div>\n<div class=\"btn-large action\" data-bind=\"click: prevStep, visible: backBtnVisible()\">\n<div class=\"content cf\">\n<img src=\"static/main/images/icon_arrow_left.svg\" />\n<div data-bind=\"text: formStep().backBtnText\"></div>\n</div>\n</div>\n<div class=\"btn-large action\" data-bind=\"click: nextStep, visible: nextBtnVisible()\">\n<div class=\"content cf\">\n<div data-bind=\"text: formStep().nextBtnText\"></div>\n<img src=\"static/main/images/icon_arrow_right.svg\" />\n</div>\n</div>\n</div>\n</div>\n<div id=\"new-data-source-bottom\"></div>\n<div id=\"close-nds\" data-bind=\"click: $parent.toggleDataSourceForm\"></div>\n</div>", "tmpl-metric-option-sort": "<div class=\"metric-option-item-title\">\nSort By:\n</div>\n<div class=\"metric-option-item-container\">\n<select data-bind=\"options: sortMetricList(), optionsText: sortMetricOptionText, value: sortMetric\"></select>\n<a data-bind=\"text: asc, click: toggleAsc\"></a>\n</div>", "tmpl-custom-table": "<div class='quickadd-container'>\n<div class='quickadd-container-inner'>\n<div class='quickadd-item' data-bind=\"click:newCustomTable\">\n<span class=\"bolded\">Custom</span> Table\n</div>\n</div>\n</div>", "tmpl-metric-option-stats": "<div class=\"metric-option-item-title\">\nStats:\n</div>\n<div class=\"metric-option-item-container\">\n<select data-bind=\"options: statsList(), value: stats\"></select>\n</div>", "tmpl-dash": "<!-- ko template: {name: 'tmpl-quickadd', data:quickaddView} --><!-- /ko -->\n<!-- ko template: {name: 'tmpl-workspace', data:workspaceView, afterRender: workspaceView.init} --><!-- /ko -->", "tmpl-metric-dropdown": "<div class=\"metric\" data-bind=\"click: toggleDropdown, css: extraCSS\">\n<div class=\"metric-icon\" data-bind=\"css: type\"></div>\n<div class=\"metric-name\" data-bind=\"text: name\"></div>\n<!-- ko if: name != 'count(*)' -->\n<div class=\"metric-option-arrow\"></div>\n<!-- /ko -->\n</div>", "tmpl-custom-item": "<div class='quickadd-container'>\n<div class='quickadd-container-inner'>\n<div class='quickadd-item' data-bind=\"click:newCustomChart\">\n<span class=\"bolded\">Custom</span> Chart\n</div>\n</div>\n</div>", "tmpl-nds-form-gaprof": "<p>\nPlease enter your Google Analytics View ID.\n</p>\n<p>\nYou can find your <span style=\"font-weight: bold\">View ID</span> by going to:<br /><br />\n<span style=\"font-weight: bold\">Admin</span> >>\nYour View(Profile) >>\n<span style=\"font-weight: bold\">View Settings</span>.<br /><br />\n</p>\n<div>\n<label>Google Analytics Profile ID</label>\n<input type=\"text\" maxLength=\"50\" name=\"gaId\" data-bind=\"value: gaId\" />\n</div>", "tmpl-nux": "<div id=\"nux\" style=\"display: none\">\n<div class=\"covers\">\n<!-- ko foreach: covers -->\n<div class=\"cover\"\ndata-bind=\"style: {\ntop: top,\nleft: left,\nwidth: width,\nheight: height\n}\">\n</div>\n<!-- /ko -->\n</div>\n<div class=\"instructions\" data-bind=\"\nstyle: {\ntop: instrPos().top,\nleft: instrPos().left\n},\ncss: {\narrowRight: arrowDir() == 'right',\narrowLeftLower: arrowDir() == 'leftlower',\narrowNone: arrowDir() == 'none'\n}\">\n<div class=\"content\">\n<!-- ko if: title()-->\n<h1 data-bind=\"text: title\"></h1>\n<!-- /ko -->\n<!-- ko foreach: msgs() -->\n<p data-bind=\"text: $data\"></p>\n<!-- /ko -->\n</div>\n<!-- ko if: instructions().length -->\n<div class=\"bolded\">Try it Now:</div>\n<!-- ko foreach: instructions -->\n<div class=\"instr\" data-bind=\"css: {strike: $data.strike()}\">\n<span class=\"number\" data-bind=\"text: $data.i\"></span>\n<span class=\"content\" data-bind=\"text: $data.text\"></span>\n</div>\n<!-- /ko -->\n<!-- /ko -->\n<!-- ko if: buttonText() -->\n<div class=\"btn-flat\" data-bind=\"click: nextStep, text: buttonText()\"></div>\n<!-- /ko -->\n<!-- ko if: skippable() -->\n<div class=\"skip\">\n<a href=\"#\" data-bind=\"click: skip\">Skip Tutorial</a>\n</div>\n<!-- /ko -->\n</div>\n</div>", "tmpl-metric-tableName": "<div class=\"metric-option-item-title\">\nTable:\n</div>\n<div class=\"metric-option-item-container\">\n<span data-bind=\"text:columnInfo.meta.tableName\" />\n</div>", "tmpl-nds-form-complete": "<p data-bind=\"visible: state() == 'connecting'\">\nConnecting...\n</p>\n<p data-bind=\"visible: state() == 'unknownError'\">\nAn error occurred.\n</p>\n<p data-bind=\"visible: state() == 'knownError'\">\nThe following error occurred:\n</p>\n<p data-bind=\"visible: state() == 'knownError'\">\n<code data-bind=\"text: errorMessage\"></code>\n</p>\n<p data-bind=\"visible: state() == 'knownError' || state() == 'unknownError'\">\nPlease check your information and try again.\nIf you're not sure how to resolve this issue,\nfeel free to contact us via the link in the bottom right corner.\n</p>", "tmpl-joins-viewer": "<div>\n<div class=\"joins-close\" data-bind=\"click: close\"></div>\n<h1 class=\"underlined\">Viewing Table Joins</h1>\n<div class=\"joins-headers\">\n<span class=\"left bolded\">Table</span>\n<span class=\"mid bolded\">Type</span>\n<span class=\"right bolded\">Table</span>\n</div>\n<div class=\"old-joins\"\ndata-bind=\"foreach: { data: joins, as: 'join' }\">\n<div class=\"joins-present\">\n<div class=\"left\">\n<div class=\"content\">\n<span class=\"bolded\" data-bind=\"text: join.table1.name\"></span> .\n<span data-bind=\"text: join.column1\"></span>\n</div>\n</div>\n<div class=\"mid\">\n<div class=\"bolded type\" data-bind=\"text: join.type\"></div>\n</div>\n<div class=\"right\">\n<div class=\"content\">\n<span class=\"bolded\" data-bind=\"text: join.table2.name\"></span> .\n<span data-bind=\"text: join.column2\"></span>\n</div>\n</div>\n</div>\n</div>\n<div class=\"joins-buttons\">\n<div class=\"btn-large\" data-bind=\"click: close\">\n<span class=\"bolded\">CLOSE</span>\n</div>\n</div>\n</div>", "tmpl-aesgroup": "<h1 class=\"underlined\" data-bind=\"text: aesName\"></h1>\n<div class=\"menu-item-container\"\ndata-dnd-type=\"metric\"\ndata-bind=\"pui_dndContainer: {\nitementer:onMetricEnter,\ndatatype:'metric',\nname:'addmetric'},\ncss: {disabled: !enabled()}\">\n<div class=\"menu-item-name\">\n<div class=\"content\">Add Metric</div>\n</div>\n<div class=\"menu-item\">\n<!-- ko template: {name: 'tmpl-metric-droppable', data: {enabled: enabled()}} --><!-- /ko -->\n</div>\n</div>\n<div>\n<!-- ko foreach: metrics -->\n<div class=\"menu-item-container\" data-dnd-type=\"metric\" data-bind=\"pui_dndContainer: {itemdiscard:discard,datatype:'metric',name:name}, css: {disabled: !$parent.enabled()}\">\n<div class=\"menu-item-name\">&nbsp;</div>\n<div class=\"menu-item dropped-metric\" data-bind=\"template: {\ndata: $data,\nname: 'tmpl-metric-attached',\nafterRender: $parent.initMetricItem,\n}\">\n</div>\n</div>\n<!-- /ko -->\n</div>", "tmpl-dropdown-no-icon": "<div>\n<div class=\"name\">\n</div>\n<div class=\"metric-option-arrow\">\n</div>\n</div>"})}, "poly/nux": function(exports, require, module) {(function() {
  var Events, NuxView,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Events = require('poly/main/events');

  NuxView = (function() {
    function NuxView(_arg) {
      this.steps = _arg.steps, this.onSkip = _arg.onSkip;
      this.skip = __bind(this.skip, this);
      this.clear = __bind(this.clear, this);
      this._nextStep = __bind(this._nextStep, this);
      this.nextStep = __bind(this.nextStep, this);
      this.curStep = 0;
      this.arrowDir = ko.observable('left');
      this.title = ko.observable();
      this.msgs = ko.observable();
      this.covers = ko.observableArray([]);
      this.instrPos = ko.observable({});
      this.instructions = ko.observableArray([]);
      this.buttonText = ko.observable();
      this.skippable = ko.observable(false);
      _.delay(this.nextStep, 100);
    }

    NuxView.prototype.nextStep = function() {
      var fader, _ref,
        _this = this;
      if ((_ref = this.steps[this.curStep]) != null ? _ref.onFinish : void 0) {
        this.steps[this.curStep].onFinish();
      }
      if (this.curStep === this.steps.length) {
        this.clear();
        return;
      }
      $('#nux-fade').remove();
      fader = $('#nux').clone();
      fader.attr('id', 'nux-fade');
      $('BODY').append(fader);
      fader.fadeOut();
      $('#nux').hide();
      return _.delay(function() {
        _this._nextStep();
        return $('#nux').fadeIn();
      }, 500);
    };

    NuxView.prototype._nextStep = function() {
      var $ref, coverables, fn, instr, step, _ref,
        _this = this;
      step = this.steps[this.curStep];
      this.curStep += 1;
      this.title(step.title);
      if (!_.isArray(step.msgs)) {
        step.msgs = [step.msgs];
      }
      this.msgs(step.msgs);
      $ref = $(step.ref);
      this.instrPos({
        top: ($ref.offset().top + step.top) + "px",
        left: ($ref.offset().left + step.left) + "px"
      });
      this.arrowDir((_ref = step.arrowDir) != null ? _ref : 'none');
      coverables = $(step.cover);
      this.covers.removeAll();
      _.each(coverables, function(ele) {
        var $ele, cover;
        $ele = $(ele);
        cover = {
          top: $ele.offset().top + "px",
          left: $ele.offset().left + "px",
          width: $ele.outerWidth() + "px",
          height: $ele.outerHeight() + "px"
        };
        return _this.covers.push(cover);
      });
      this.instrComplete = 0;
      this.instructions.removeAll();
      if (step.instructions == null) {
        step.instructions = [];
      }
      _.each(step.instructions, function(instr, idx) {
        var obj;
        obj = {
          i: idx + 1,
          strike: ko.observable(false)
        };
        $.extend(obj, instr);
        return _this.instructions.push(obj);
      });
      if (step.instructions.length > 0) {
        instr = this.instructions()[this.instrComplete];
        fn = function(event, params) {
          instr.strike(true);
          if (++_this.instrComplete === step.instructions.length) {
            return _.delay(_this.nextStep, 100);
          } else {
            instr = _this.instructions()[_this.instrComplete];
            return instr.event.one(fn);
          }
        };
        instr.event.one(fn);
      }
      this.buttonText(step.buttonText);
      this.skippable(step.skippable != null);
      if (step.event) {
        return step.event.one(function(event, params) {
          return _this.nextStep();
        });
      }
    };

    NuxView.prototype.clear = function() {
      return $('#nux').fadeOut();
    };

    NuxView.prototype.skip = function() {
      if (this.onSkip) {
        this.onSkip();
      }
      return this.clear();
    };

    return NuxView;

  })();

  module.exports = NuxView;

}).call(this);
}, "poly/signup": function(exports, require, module) {(function() {
  var Events, eulaClickTrap, init;

  Events = require('poly/main/events');

  init = function() {
    Events.signup.page.view.trigger();
    eulaClickTrap('#start', '#realsubmit', '#eula', Events.signup.eula.error);
    Events.signup.form.submit.trackForm($('#realsubmit'));
    return $('input').on('keypress keydown', _.once(function() {
      return Events.signup.form.interact.trigger();
    }));
  };

  eulaClickTrap = function(submitBtn, hiddenBtn, eula, errorEvt) {
    return $(submitBtn).on('click', function(e) {
      e.stopPropagation();
      if ($(eula).prop('checked')) {
        return $(hiddenBtn).click();
      } else {
        if (errorEvt) {
          errorEvt.trigger();
        }
        return alert('You must first read and accept the Terms and Conditions.');
      }
    });
  };

  module.exports = {
    init: init
  };

}).call(this);
}, "poly/verifyPendingDs": function(exports, require, module) {(function() {
  var load, serverApi;

  serverApi = require('poly/common/serverApi');

  load = function(dsParams) {
    return serverApi.sendPost('/data-source/create', dsParams, function(err, response) {
      if (err) {
        return console.error(err);
      } else {
        return window.location.href = '/home';
      }
    });
  };

  module.exports = {
    run: run
  };

}).call(this);
}});
