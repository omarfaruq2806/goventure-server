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
    const transectionCollection = db.collection("transections");

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

    // for getting a single ticket
    app.get("/api/tickets/:id", async (req, res) => {
      const { id } = req.params;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await ticketCollection.findOne(query);
      res.send(result);
    });

    // for  upadete ticket
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

    // for ticket delete by vendor 
    app.delete("/api/tickets/:id", async (req, res) => {
      const { id } = req.params;
      console.log(id);
      const query = {
        _id: new ObjectId(id),
      };
      const result = await ticketCollection.deleteOne(query);
      res.send(result);
    });

    // for booking a ticket
    app.post("/api/bookings", async (req, res) => {
      const ticket = req.body;
      const result = await bookingCollection.insertOne(ticket);
      res.send(result);
    });

    // for getting booking data
    app.get("/api/bookings", async (req, res) => {
      const { userEmail, vendorEmail, status } = req.query;
      let query = {};
      if (userEmail) {
        query.userEmail = userEmail;
      }
      if (vendorEmail) {
        query.vendorEmail = vendorEmail;
      }
      if (status) {
        query.status = status;
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // for updating booking data
    app.patch("/api/bookings/:id", async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;
      console.log(updatedData, "from patch API");
      const query = {
        _id: new ObjectId(id),
      };
      const updateDoc = {
        $set: updatedData,
      };
      const result = await bookingCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // for saving transaction
    app.post("/api/transections", async (req, res) => {
      const transection = req.body;
      const isExists = await transectionCollection.findOne({
        bookingId: transection.bookingId,
      });
      if (isExists) {
        return res.send({ message: "Transaction already exists" });
      }
      const transectionData = {
        ...transection,
        createdAt: new Date(),
      };
      const result = await transectionCollection.insertOne(transectionData);
      await bookingCollection.updateOne(
        { _id: new ObjectId(transection.bookingId) },
        {
          $set: {
            status: "paid",
            paidAt: new Date(),
          },
        },
      );
      const ticket = await ticketCollection.findOne({
        _id: new ObjectId(transection.ticketId),
      });
      await ticketCollection.updateOne(
        { _id: new ObjectId(transection.ticketId) },
        {
          $inc: { quantity: -transection.quantity },
        },
      );
      res.send(result);
    });

    // for getting transection data
    app.get("/api/transections", async (req, res) => {
      const { userEmail, vendorEmail, status } = req.query;
      let query = {};
      if (userEmail) {
        query.userEmail = userEmail;
      }
      if (vendorEmail) {
        query.vendorEmail = vendorEmail;
      }
      if (status) {
        query.status = status;
      }
      const result = await transectionCollection.find(query).toArray();
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
