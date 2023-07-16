const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();

// middleware
app.use(cors());
app.use(express.json());

app.get('/' , (req,res) => {
    res.send("Sportify server is opened")
})


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

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // user info
    app.post('/users',async (req,res) => {
        const user = req.body;
        const query = {email : user.email}
        const found = await userCollection.findOne(query)
        if(found){
            return res.send("user already exist");
        }

        const result = await userCollection.insertOne(user);
        res.send(result);

    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port , ()=>{
    console.log(`${port} is set for sportify server`);
})