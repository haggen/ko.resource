/*
 * Knockout Resource v0.3 2012-08-16 13:31:13 -0300
 * by Arthur Corenzan <arthur@corenzan.com>
 * licensed under http://creativecommons.org/licenses/by/3.0
 * more on http://github.com/haggen/ko.resource
 */
(function($, ko, undefined) {
  var request;

  // RESTful request shortcut
  request = function(method, url, data, callback) {
    var settings = {
      url: url,
      data: data,
      type: method,
      success: callback
    };

    settings.complete = function() {
      console.log('Request:', settings, this);
    };

    $.ajax(settings);
  };

  // Resource constructor
  // path: string, path to the resource on your RESTful API
  // schema: optional hash, your model's obervable attributes (functions will be considered computed values)
  // arbitrary: optional hash, arbitrary properties and methods of your model (not observables)
  function Resource(path, schema, arbitrary) {
    var resource;

    if(schema === undefined) {
      schema = {};
    }

    if(arbitrary === undefined) {
      arbitrary = {};
    }

    resource = function(source) {
      var instance = this;

      // Data source, may be a JSON string os JS Object
      if(source === undefined) {
        source = {};
      }

      // Action hooks
      // TODO: replace with callbacks within every action
      instance.onSave = $.noop;
      instance.onFetch = $.noop;
      instance.onDestroy = $.noop;

      // Attach arbitrary properties and methods
      $.each(arbitrary, function(name, value) {
        if(value instanceof Function) {
          instance[name] = function() {
            value.apply(instance, arguments);
          };
        } else {
          instance[name] = value;
        }
      });

      // Recursively serialize your model, also excludes attributes started with double underscore
      instance.serialize = function() {
        var data = ko.toJS(instance);

        $.each(data, function(name, value) {
          if(name.indexOf('__') === 0 || value instanceof Function) {
            delete data[name];
          } else {
            if(value instanceof Array) {
              $.each(value, function(i, v) {
                if('serialize' in v) {
                  value[i] = v.serialize();
                }
              });
            }
          }
        });

        return data;
      };

      // Update your model's observable attributes
      // Originally this method was called `set` but it can conflict with attribute name
      instance.update_attributes = function(attributes) {
        $.each(attributes, function(attr, value) {
          if(instance[attr] === undefined) {
            if(value instanceof Function) {
              instance[attr] = ko.computed(value, instance);
            } else if(value instanceof Array) {
              instance[attr] = ko.observableArray(value);
            } else {
              instance[attr] = ko.observable(value);
            }
          } else {
            instance[attr](value);
          }
        });
      };

      // Send model's data to the server, auto-switching between POST and PUT
      instance.save = function() {
        if('_id' in instance) {
          request('put', path + '/' + instance._id(), instance.serialize(), instance.onSave);
        } else {
          request('post', path, instance.serialize(), function(response) {
            // We assume your're using Mongo and that the response comes with an ID
            instance.update_attributes({ _id: response._id });
            instance.onSave(response);
          });
        }
      };

      // Fetch model's data from the server
      // TODO: check for instance's _id
      instance.fetch = function() {
        request('get', path + '/' + instance._id(), null, function(response) {
          instance.update_attributes(response);
          instance.onFetch(response);
        });
      };

      // Destroy object from the server but retains current model data
      instance.destroy = function() {
        request('delete', path + '/' + instance._id(), instance.onDestroy);
      };

      // Request for custom actions
      instance.request = function(method, action, data, callback) {
        if(callback === undefined) {
          callback = data;
          data = {};
        }

        request(method, path + action, data, function(response) {
          callback.apply(instance, [response]);
        });
      };

      instance.update_attributes(schema);
      instance.update_attributes(source instanceof String ? JSON.parse(source) : source);

      if(instance.initialize !== undefined) {
        instance.initialize(source);
      }
    };

    // Fetch a collection of objects
    resource.fetch = function(query, callback) {
      if(typeof query === 'function') {
        callback = query;
        query = {};
      }

      request('get', path, query, function(response) {
        callback($.map(response, function(source) {
          return new resource(source);
        }));
      });
    };

    return resource;
  }

  // Expose the plugin
  ko.resource = Resource;

})(window.jQuery, window.ko);
