/*
 * Knockout Resource v0.4 2012-08-29 19:35:17 -0300
 * by Arthur Corenzan <arthur@corenzan.com>
 * licensed under http://creativecommons.org/licenses/by/3.0
 * more on http://github.com/haggen/ko.resource
 */
(function(ko, undefined) {
  var xhr, request;

  // AJAX requester
  xhr = function() {
    try {
      return new ActiveXObject('Msxml2.XMLHTTP');
    } catch(e) {
      try {
        return new ActiveXObject('Microsoft.XMLHTTP');
      } catch(e) {
        return new XMLHttpRequest();
      }
    }
  };

  request = function(method, url, params, callback) {
    var r = xhr();

    r.open(method, url, true);

    r.onreadystatechange = function() {
      if(r.readyState === 4) {
        callback(JSON.parse(r.responseText));
      }
    };

    r.setRequestHeader('Content-Type', 'application/javascript');

    r.send(params || null);
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
      var i, instance = this;

      // Data source, may be a JSON string os JS Object
      if(source === undefined) {
        source = {};
      }

      // Attach arbitrary attributes and methods
      for(i in arbitrary) {
        if(arbitrary.hasOwnProperty(i)) {
          if(arbitrary[i] instanceof Function) {
            instance[i] = function() {
              arbitrary[i].apply(instance, arguments);
            };
          } else {
            instance[i] = arbitrary[i];
          }
        }
      }

      // Recursively serialize your model, excluding attributes
      // beginning with double underscore or functions
      instance.serialize = function() {
        var i, j, data = ko.toJS(instance);

        for(i in data) {
          if(data.hasOwnProperty(i)) {
            if(i.indexOf('__') === 0 || data[i] instanceof Function) {
              delete data[i];
            } else if(data[i] instanceof Array) {
              for(j = 0; j < data[i].length; j++) {
                if('serialize' in data[i][j]) {
                  data[i][j] = data[i][j].serialize();
                }
              }
            }
          }
        }

        return data;
      };

      // Update observable values
      // Originally this method was called `set`, but it was too
      // common and could conflict with attribute names
      instance.update_attributes = function(attributes) {
        var i;

        for(i in attributes) {
          if(attributes.hasOwnProperty(i)) {
            if(instance[i] === undefined) {
              if(attributes[i] instanceof Function) {
                instance[i] = ko.computed(attributes[i], instance);
              } else if(attributes[i] instanceof Array) {
                instance[i] = ko.observableArray(attributes[i]);
              } else {
                instance[i] = ko.observable(attributes[i]);
              }
            } else {
              instance[i](attributes[i]);
            }
          }
        }
      };

      // Send model's data to the server, auto-switching between POST and PUT
      instance.save = function(callback) {
        if('_id' in instance) {
          request('put', path + '/' + instance._id(), instance.serialize(), function(response) {
            if(callback.call !== undefined) {
              callback.call(instance, response);
            }
          });
        } else {
          request('post', path, instance.serialize(), function(response) {
            // We assume your're using Mongo and that the response comes with an ID
            instance.update_attributes({ _id: response._id });

            if(callback.call !== undefined) {
              callback.call(instance, response);
            }
          });
        }
      };

      // Fetch data from the server
      instance.fetch = function(callback) {
        request('get', path + '/' + instance._id(), null, function(response) {
          instance.update_attributes(response);

          if(callback.call !== undefined) {
            callback.call(instance, response);
          }
        });
      };

      // Destroy object from the server but retains current data
      instance.destroy = function(callback) {
        request('delete', path + '/' + instance._id(), function(response) {
          if(callback.call !== undefined) {
            callback.call(instance, response);
          }
        });
      };

      // Request for custom actions
      instance.request = function(method, action, data, callback) {
        if(callback === undefined) {
          callback = data;
          data = {};
        }

        request(method, path + action, data, function(response) {
          callback.call(instance, response);
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
      if(query instanceof Function) {
        callback = query;
        query = {};
      }

      request('get', path, query, function(response) {
        var i, collection = [];

        for(i = 0; i < response.length; i++) {
          collection.push(new resource(response[i]));
        }

        return collection;
      });
    };

    return resource;
  }

  // Expose the plugin
  ko.resource = Resource;

})(window.ko);
