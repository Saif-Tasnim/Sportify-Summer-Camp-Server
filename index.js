const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { populate } = require('dotenv');
const stripe = require('stripe')(process.env.STRIPE_SK_TEST);

const app = express();

// middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send("Sportify server is opened")
})

// verify JWT
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }

  // it will carry bearer token thats why it has to split 
  const token = authorization.split(" ")[1]

  jwt.verify(token, process.env.JSON_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' });
    }

    req.decoded = decoded;
    next();
  })

}


const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster0.ectfhk2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("Sportify-Summer-Camp").collection("user");
    const classCollection = client.db("Sportify-Summer-Camp").collection("class");
    const selectedCollection = client.db("Sportify-Summer-Camp").collection('selected');
    const paymentCollection = client.db("Sportify-Summer-Camp").collection('payment');

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    //verify admin route
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);

      if (user?.role !== 'Admin') {
        return res.status(403).send('Forbidden Access');
      }

      next();
    }

    // user info
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const found = await userCollection.findOne(query)
      if (found) {
        return res.send("user already exist");
      }

      const result = await userCollection.insertOne(user);
      res.send(result);

    })

    app.patch('/users/admin/:id', verifyJWT, async (req, res) => {
      const id = req.params.id
      // console.log(id);
      const query = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          role: "Admin"
        }
      }

      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);

    })

    app.patch('/users/instructor/:id', verifyJWT, async (req, res) => {
      const id = req.params.id
      // console.log(id);
      const query = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          role: "Instructor"
        }
      }

      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);

    })

    // class collection
    app.get('/class', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })

    app.get('/class/filter', async (req, res) => {
      const query = { status: 'Accepted' }
      const result = await classCollection.find(query).toArray();
      res.send(result);
    })

    app.patch('/class/admin/manage/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          status: "Accepted"
        }
      }
      const result = await classCollection.updateOne(query, updateDoc);
      res.send(result);
    })

    app.put('/class/admin/deny/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      // console.log(data.feedback);
      const query = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: 'Denied',
          feedback: data.feedback
        }
      };

      const result = await classCollection.updateOne(query, updateDoc, options);
      res.send(result);
    })

    app.get('/class/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await classCollection.find(query).toArray();
      res.send(result);

    })

    app.post('/class', verifyJWT, async (req, res) => {
      const data = req.body;
      const result = await classCollection.insertOne(data);
      res.send(result);

    })

    // student class route
    app.get('/student/class/select/:email', verifyJWT, async (req, res) => {

      const email = req.params.email;
      const query = { studentEmail: email };
      const result = await selectedCollection.find(query).toArray();
      // console.log(result);
      res.send(result);
    })

    app.get('/student/class/select', async (req, res) => {

      const email = req.query.email;
      const id = req.query.id;

      const query = { studentEmail: email, _id: id };
      const result = await selectedCollection.findOne(query);
      // console.log(result);
      res.send(result);
    })

    app.post('/student/class/select', verifyJWT, async (req, res) => {
      const data = req.body;
      const id = data._id;
      // console.log(id);
      const email = data.studentEmail;
      const query = { _id: id, studentEmail: email };

      const find = await selectedCollection.findOne(query);
      // console.log(find);

      if (find) {
        return res.send({ error: true, message: "Already added" });
      }

      const result = await selectedCollection.insertOne(data);
      res.send(result);
    })

    app.delete('/student/class/select/:id', verifyJWT, async (req, res) => {

      const id = req.params.id;
      const query = { _id: id };
      const result = await selectedCollection.deleteOne(query);
      // console.log(result);
      res.send(result);
    })


    // get admin routes
    app.get('/user/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ admin: false })

      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === 'Admin' };
      res.send(result);
    })

    // get instructor routes
    app.get('/instructors', async (req, res) => {
      const query = { role: 'Instructor' };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ instructor: false })

      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role === 'Instructor' };
      res.send(result);
    })


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JSON_SECRET_KEY, { expiresIn: "1h" })
      res.send({ token })

    })

    // payment / enrolled course api
    app.get('/payment/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { studentEmail: email };
      const result = await paymentCollection.find(query).toArray();

      res.send(result);
    })

    // stripe payment intent create
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;

      if (amount < 0 || !Number.isFinite(amount)) {
        return res.send("Not a number");

      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // store payment table data
    app.post('/payment', verifyJWT, async (req, res) => {
      const data = req.body;
      const insertedRes = await paymentCollection.insertOne(data);

      // update classes documents
      const id = data._id;
      const query = { _id: new ObjectId(id) }

      const find = classCollection.findOne(query);
      const enrolled = await find.enrolled ? find.enrolled : 0;
      const updateValue = enrolled + 1;

      const options = { upsert: true };

      const updateDoc = {
        $set: {
          enrolled: updateValue
        }
      }
      const updateRes = await classCollection.updateOne(query, updateDoc, options);

      // delete query from selected class
      const deleteQuery = { _id: id }
      const deleteRes = await selectedCollection.deleteOne(deleteQuery);

      res.send({ insertedRes, updateRes, deleteRes })
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, () => {
  console.log(`${port} is set for sportify server`);
})