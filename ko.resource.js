/*
 * Knockout Resource v0.2 2012-06-01 10:13:24 -0300
 * by Arthur Corenzan <arthur@corenzan.com>
 * licensed under http://creativecommons.org/licenses/by/3.0
 * more on http://haggen.github.com/ko.resource
 */
(function($, ko, undefined) {

    // Shortcut for restful JSON requests
    $.rest = function(method, url, data, callback) {
      var settings = {
        url: url,
        data: data,
        type: method,
        contentType: 'application/json',
        success: callback
      };

      // console.log('Restful:', settings);

      $.ajax(settings);
    };

  // Resource constructor
  // path: string, path prefix to where this resource can be found on your API
  // schema: hash, default values for observable attributes, functions will be set as computed values
  // arbitrary: hash, arbitrary properties and methods (not observables)
  function Resource(path, schema, arbitrary) {
    var resource;

    if(arbitrary === undefined) {
      arbitrary = schema;
      schema = {};
    }

    resource = function(source) {
      var instance = this;

      instance.onSave = $.noop;
      instance.onFetch = $.noop;
      instance.onDestroy = $.noop;

      // Attach arbitrary properties and methods
      $.each(arbitrary, function(name, value) {
        if(typeof value === 'function') {
          instance[name] = function() {
            value.apply(instance, arguments);
          };
        } else {
          instance[name] = value;
        }
      });

      // Make our own serializer so we can exclude attributes started with double underscore
      instance.serialize = function() {
        var data = ko.toJS(instance);

        $.each(data, function(name, value) {
          if(/^__/.exec(name) || typeof value === 'function') {
            delete data[name];
          }
        });

        return JSON.stringify(data);
      };

      // Attribute setter
      instance.set = function(attributes) {
        $.each(attributes, function(attr, value) {
          if(typeof instance[attr] === 'undefined') {
            if(typeof value === 'function') {
              instance[attr] = ko.computed(value, instance);
            } else if(typeof value === 'array') {
              instance[attr] = ko.observableArray(value);
            } else {
              instance[attr] = ko.observable(value);
            }
          } else {
            instance[attr](value);
          }
        });
      };

      // Save object's data, using PUT if it got an id, or POST otherwise
      instance.save = function() {
        if(instance._id) {
          $.rest('put', path + '/' + instance._id(), instance.serialize(), instance.onSave);
        } else {
          $.rest('post', path, instance.serialize(), function(response) {
            instance.set({ _id: response._id });
            instance.onSave(response);
          });
        }
      };

      // Fetch instance from server, but only works if it has an attribute _id
      // TODO: add some check for id existance
      instance.fetch = function() {
        $.rest('get', path + '/' + instance._id(), null, function(response) {
          instance.set(response);
          instance.onFetch(response);
        });
      };

      // Delete object from server
      instance.destroy = function() {
        $.rest('delete', path + '/' + instance._id(), instance.onDestroy);
      };

      instance.set(schema);
      instance.set(source);
    };

    // Fetch a collection of objects
    resource.fetch = function(query, callback) {
      if(typeof query === 'function') {
        callback = query;
        query = {};
      }

      $.rest('get', path, query, function(response) {
        callback($.map(response, function(source) {
          return new resource(source);
        }));
      });
    };

    return resource;
  }

  // Expose as ko plugin
  ko.resource = Resource;

})(window.jQuery, window.ko);