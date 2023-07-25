const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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
    app.get('/class' , async(req,res)=>{
      const result = await classCollection.find().toArray();
      res.send(result);
    })
    
    app.get('/class/:email' , verifyJWT, async(req,res) => {
      const email = req.params.email;
      const query = {email : email};
      const result = await classCollection.find(query).toArray();
      res.send(result);

    })

    app.post('/class', verifyJWT, async (req, res) => {
      const data = req.body;
      const result = await classCollection.insertOne(data);
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
      const token = jwt.sign(user, process.env.JSON_SECRET_KEY, { expiresIn: '1h' })
      res.send({ token })

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