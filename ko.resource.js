/*
 * Knockout Resource v0.4.2 2012-08-31 16:57:00 -0300
 * by Arthur Corenzan <arthur@corenzan.com>
 * licensed under http://creativecommons.org/licenses/by/3.0
 * more on http://github.com/haggen/ko.resource
 */
(function($, ko, undefined) {

  var request;

  // Make AJAX request
  request = function(verb, path, params, callback) {
    var options = {
      url: path,
      type: verb,
      data: params,
      success: callback
    };

    console.log('Request', options);

    $.ajax(options);
  };

  // Resource constructor
  // path: string, path to the resource on your RESTful API, e.g. '/users'
  // schema: optional hash, default observables (functions will be cast as computed)
  // arbitrary: optional hash, arbitrary attributes and methods (not observables)
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

      if(source === undefined) {
        source = {};
      }

      // Attach arbitrary attributes and methods
      $.each(arbitrary, function(name, value) {
        if(value instanceof Function) {
          instance[name] = function() {
            value.apply(instance, arguments);
          };
        } else {
          instance[name] = value;
        }
      });

      // Recursively serialize your model, removing attributes
      // starting with two underscores and functions
      instance.serialize = function() {
        var data = ko.toJS(instance);

        $.each(data, function(name, value) {
          if(name.indexOf('__') === 0 || typeof value === 'function') {
            delete data[name];
          } else if(value instanceof Array) {
            $.each(value, function(index, v) {
              if('serialize' in v) {
                value[index] = v.serialize();
              }
            });
          }
        });

        return data;
      };

      // Update observable values
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
      instance.save = function(callback) {
        if('_id' in instance) {
          request('put', path + '/' + instance._id(), instance.serialize(), function(response) {
            if(callback instanceof Function) {
              callback.call(instance, response);
            }
          });
        } else {
          request('post', path, instance.serialize(), function(response) {
            // We assume your're using Mongo and that the response comes with an ID
            instance.update_attributes({ _id: response._id });

            if(callback instanceof Function) {
              callback.call(instance, response);
            }
          });
        }
      };

      // Fetch data from the server
      instance.fetch = function(callback) {
        request('get', path + '/' + instance._id(), null, function(response) {
          instance.update_attributes(response);

          if(callback instanceof Function) {
            callback.call(instance, response);
          }
        });
      };

      // Destroy object from the server but retains current data
      instance.destroy = function(callback) {
        request('delete', path + '/' + instance._id(), function(response) {
          if(callback instanceof Function) {
            callback.call(instance, response);
          }
        });
      };

      // Request for custom actions
      instance.request = function(verb, action, params, callback) {
        if(callback === undefined) {
          callback = params;
          params = {};
        }

        request(verb, path + action, params, function(response) {
          callback.call(instance, response);
        });
      };

      instance.update_attributes(schema);
      instance.update_attributes(source instanceof String ? JSON.parse(source) : source);

      if('initialize' in instance) {
        instance.initialize(source);
      }
    };

    // Fetch a collection of objects
    resource.fetch = function(query, callback) {
      if(query instanceof Function) {
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
