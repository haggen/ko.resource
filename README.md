Knockout Resource Model
=======================

**Usage:**

    var User;

    User = ko.resource('/users', {
      name: '',
      age: 0,
      yearOfBirth: function() { // Will be made ko.computed
        return new Date().getFullYear() - this.age();
      }
    }, {
      sayHello: function() { // Arbitrary method
        alert(this.name() + ': Hello!');
      }
    });

    var bob = new User({
      _id: '1',
      name: 'Bob',
      age: 24
    });

    bob.name()         //-> Bob
    bob.age()          //-> 34
    bob.yearOfBirth()  //-> 1978
    bob.sayHello()     //-> alert('Bob: Hello!')

    User.fetch()       //-> HTTP GET /users

    bob.fetch()        //-> HTTP GET /users/1
    bob.save()         //-> HTTP PUT /users/1
    bob.delete()       //-> HTTP DELETE /users/1

The second argument (default values) may be omitted, but then it will be considered as the hash of arbitrary properties and methods.

Every rest method accepts a callback, to which will be given the request response.

If no attribute `_id` is set, `#save` uses `POST` and removes the id from the URL, also it assumes a `_id` coming in the response and already set this attribute to the object.