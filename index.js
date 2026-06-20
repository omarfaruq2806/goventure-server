const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
app.get("/", (req, res) => {
  res.send("Hello World!");
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!",
    // );
    const db = client.db("goventure");
    const userCollection = db.collection("user");
    const ticketCollection = db.collection("tickets");
    const bookingCollection = db.collection("bookings");

    // for ticket adding
    app.post("/api/tickets", async (req, res) => {
      const ticket = req.body;
      const result = await ticketCollection.insertOne(ticket);
      res.send(result);
    });

    // for ticket getting
    app.get("/api/tickets", async (req, res) => {
      const { vendorEmail, status } = req.query;
      let query = {};
      if (vendorEmail) {
        query.vendorEmail = vendorEmail;
      }
      if (status) {
        query.status = status;
      }
      const result = await ticketCollection.find(query).toArray();
      res.send(result);
    });

    // for upadet ticket
    app.patch("/api/tickets/:id", async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;
      console.log(updatedData, "from patch API");
      const query = {
        _id: new ObjectId(id),
      };
      const updateDoc = {
        $set: updatedData,
      };
      const result = await ticketCollection.updateOne(query, updateDoc);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
