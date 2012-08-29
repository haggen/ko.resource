# Knockout Resource

Knockout Resource is an ORM for Knockout. It's designed to work with Mongo, but can interact with any RESTful API that talks JSON.

## Dependency:

- Knockout 2.1 - http://knockoutjs.com

## Guide:

    var User;

    User = ko.resource(

      // The first argument is the path to the resource
      // In this example, every action will be called with '/users' prefix, so
      // to fetch all your collection it will make a GET request to '/users'.
      '/users',

      // The second argument is the schema for observable attributes.
      // It's optional, but if you want to apply bindings to an empty model,
      // you must first set here the default values your're going to use,
      // otherwise you'll get undefined.
      {
        name: '',
        age: 0,

        // Functions here will result in ko.computed
        intro: function() {
          return 'Hi, my name is ' + this.name() + ' and I'm ' + this.age() + ' years old';
        }
      },

      // The third and last argument is a hash of arbitrary, non observable attributes and methods
      // of our model. It also accept a special method called 'initialize' that, if set, will
      // be called when constructing a new instance.
      {
        introduce: function() {
          alert(this.intro());
        },

        initialize: function() {
          this.introduce();
        }
      }
    });

Now, let's play with our new model.

    var bob = new User({
      name: 'Bob',
      age: 24
    }); //-> alert('Hi, my name is Bob and I'm 24 years old');

    bob.name(); //-> Bob
    bob.age();  //-> 24

    // The 'save' method will make a POST to '/users' with your model data
    // serialized as payload: { name: 'Bob', age: 24 }
    bob.save();

    // Plus, it will assume the server's response is carrying an '_id' and will
    // automagically update our model's attributes.
    bob._id();  //-> 1 or whatever your server's generate for ID

    // We can update our model and save it again to the database:
    // Calling save on our model already with '_id' will make a PUT request to '/users/1',
    // and as always, send our data as payload: { name: 'Bob', age: 25 }
    bob.age(25);
    bob.save();

We use `_id` because it's intended to work with Mongo and Mongo's API already respond with _id.

    // We may destroy our recent created object with this:
    bob.destroy(); //-> It retains the model's current data

If you would like to fetch all your users you can do this:

    User.fetch(function(users) {
      // 'users' here are already instantiated models for your convinience,
      // and since we told it to alert an introduction, it will do for every
      // user fetched from your database.
    });
