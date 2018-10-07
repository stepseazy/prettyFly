require('./config/config');

const _ = require('lodash');

const express = require('express');
const bodyParser = require('body-parser');

var {
  mongoose
} = require('./db/mongoose');
var {
  Todo
} = require('./models/todo');
var {
  User
} = require('./models/user');
var {
  authenticate
} = require('./middleware/authenticate');

const {
  ObjectID
} = require('mongodb');
var app = express();
const port = process.env.PORT;

app.use(bodyParser.json());

app.post(
  '/todos',
  authenticate,
  (req, res) => {
    var todo = new Todo({
      text: req.body.text,
      _creator: req.user._id
    });
    todo.save().then(
      (r) => {
        res.send(r);
      },
      (e) => {
        res.status(400).send(e);
      }
    );
  }
);

app.get('/todos', authenticate, (req, res) => {
  Todo.find({
    _creator: req.user._id
  }).then(
    (todos) => {
      res.send({
        todos
      });
    },
    (e) => {
      res.status(400).send(e);
    });
});
//GET /todos/123214

app.get('/todos/:id', authenticate, (req, res) => {
  var id = req.params.id;
  if (!ObjectID.isValid(id)) {
    return res.status(400).send();
  }
  Todo.findOne({
    _id:id,
    _creator:req.user._id
  }).then(
    (r) => {
      if (r) {
        return res.send({
          r
        })
      }
      res.status(404).send();
    },
    (e) => {
      res.status(400).send('error:', e)
    }
  );
});

app.delete('/todos/:id',authenticate, (req, res) => {
  //get id
  id = req.params.id;
  if (!ObjectID.isValid(id)) {
    return res.status(404).send('invalid id');
  }
  Todo.findOneAndRemove({
      _id: id,
      _creator:req.user._id
    })
    .then((r) => {
        if (!r) {
          return res.status(404).send('not found')
        }
        res.status(200).send({
          r
        });
      },
      (e) => {
        res.status(400).send({
          e
        });
      }
    );

});

app.patch('/todos/:id',authenticate, (req, res) => {
  var id = req.params.id;
  var body = _.pick(req.body, ['text'], ['completed']);

  if (!ObjectID.isValid(id)) {
    return res.status(404).send('invalid id');
  }

  if (_.isBoolean(body.completed) && body.completed) {
    body.completedAt = new Date().getTime();
  } else {
    body.completed = false;
    body.completedAt = null;
  }
  //TODO: findone and update
  Todo.findOneAndUpdate({
      _id: id,
      _creator:req.user._id
    }, {
      $set: body
    }, {
      new: true
    })
    .then((todo) => {
      if (!todo) {
        return res.status(404).send();
      }
      res.send({
        todo
      });
    }).catch((e) => {
      res.status(400).send();
    });
});
//TODO:POST /users
app.post('/users', (req, res) => {
  var body = _.pick(req.body, ['email', 'password']);
  var user = new User(body);
  user.save().then(
      () => {
        return user.generateAuthToken();
        // res.send(r);
      })
    .then((token) => {
      res.header('x-auth', token).send(user);
    })
    .catch((e) => {
      res.status(400).send(e);
    });
});
app.get('/users/me', authenticate, (req, res) => {
  res.send(req.user);
});

app.post('/users/login', (req, res) => {
  var body = _.pick(req.body, ['email', 'password']);

  User.findByCredentials(body.email, body.password).then(
    (user) => {
      return user.generateAuthToken().then((token) => {
        res.header('x-auth', token).send(user);
      });
    }).catch((e) => {
    res.status(400).send();
  });


})
app.delete('/users/me/token', authenticate, (req, res) => {
  req.user.removeToken(req.token).then(() => {
    res.status(200).send();
  }, () => {
    response.status(400).send();
  });

});



app.listen(port,
  () => {
    console.log(`started on port ${port}`);
  }
);

module.exports = {
  app
};
