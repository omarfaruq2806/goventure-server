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
    const sessionCollection = db.collection("session");
    const ticketCollection = db.collection("tickets");
    const bookingCollection = db.collection("bookings");
    const transectionCollection = db.collection("transections");

    // verify token
    const verifyToken = async (req, res, next) => {
      const authHeader = req.headers;
      console.log("authHeader", authHeader);
      if (!authHeader || !authHeader.authorization) {
        return res.status(401).send({ message: "Unauthorized" });
      }
      const token = authHeader.authorization.split(" ")[1];
      console.log(token, "from token server");
      req.token = token;

      const query = { token: token };
      const session = await sessionCollection.findOne(query);

      const userId = session?.userId;
      const userQuery = { _id: new ObjectId(userId) };
      const user = await userCollection.findOne(userQuery);
      req.user = user;

      next();
    };

    // verify role
    const verifyRole = (...roles) => {
      return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
          return res.status(403).send({
            message: "Forbidden",
          });
        }
        next();
      };
    };

    // verify Admin
    // const verifyAdmin = (req, res, next) => {
    //   const { role } = req.user;
    //   if (role !== "admin") {
    //     return res.status(403).send({ message: "Forbidden" });
    //   }
    //   next();
    // };

    // // verify Vendor
    // const verifyVendor = (req, res, next) => {
    //   const { role } = req.user;
    //   if (role !== "vendor") {
    //     return res.status(403).send({ message: "Forbidden" });
    //   }
    //   next();
    // };

    // for ticket adding
    app.post(
      "/api/tickets",
      verifyToken,
      verifyRole("vendor"),
      async (req, res) => {
        const ticket = req.body;
        const newTicket = { ...ticket, createdAt: new Date() };
        const result = await ticketCollection.insertOne(newTicket);
        res.send(result);
      },
    );

    // for ticket getting ( in private route)
    app.get(
      "/api/tickets",
      verifyToken,
      verifyRole("vendor", "admin"),
      async (req, res) => {
        const { vendorEmail, status, isAdvertised } = req.query;
        let query = {};
        if (vendorEmail) {
          query.vendorEmail = vendorEmail;
        }
        if (status) {
          query.status = status;
        }
        if (isAdvertised !== undefined && isAdvertised !== "") {
          query.isAdvertised = isAdvertised === "true";
        }
        const result = await ticketCollection.find(query).toArray();
        res.send(result);
      },
    );

    // for public route
    app.get("/api/tickets/public", async (req, res) => {
      const { status, isAdvertised, page = 1, limit = 6 } = req.query;
      const skip = Number(page - 1) * Number(limit);
      const query = {};
      if (status) {
        query.status = status;
      }
      if (isAdvertised !== undefined && isAdvertised !== "") {
        query.isAdvertised = isAdvertised === "true";
      }
      const totalCount = await ticketCollection.countDocuments(query);
      const totalPages = Math.ceil(totalCount / Number(limit));
      const result = await ticketCollection
        .find(query)
        .skip(skip)
        .limit(Number(limit))
        .toArray();
      res.send({
        page: Number(page),
        limit: Number(limit),
        totalPages: totalPages,
        data: result,
      });
    });

    // for newst
    app.get("/api/tickets/latest", async (req, res) => {
      const { status } = req.query;
      const query = {};
      if (status) {
        query.status = status;
      }
      const result = await ticketCollection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // for getting a single ticket
    app.get(
      "/api/tickets/:id",
      verifyToken,
      verifyRole("vendor", "admin", "user"),
      async (req, res) => {
        const { id } = req.params;
        const query = {
          _id: new ObjectId(id),
        };
        const result = await ticketCollection.findOne(query);
        res.send(result);
      },
    );

    // for  upadete ticket
    app.patch(
      "/api/tickets/:id",
      verifyToken,
      verifyRole("vendor", "admin"),
      async (req, res) => {
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
      },
    );

    // for ticket delete by vendor
    app.delete(
      "/api/tickets/:id",
      verifyToken,
      verifyRole("vendor", "admin"),
      async (req, res) => {
        const { id } = req.params;
        console.log(id);
        const query = {
          _id: new ObjectId(id),
        };
        const result = await ticketCollection.deleteOne(query);
        res.send(result);
      },
    );

    // for booking a ticket
    app.post(
      "/api/bookings",
      verifyToken,
      verifyRole("user"),
      async (req, res) => {
        const ticket = req.body;
        const result = await bookingCollection.insertOne(ticket);
        res.send(result);
      },
    );

    // for getting booking data
    app.get(
      "/api/bookings",
      verifyToken,
      verifyRole("vendor", "admin", "user"),
      async (req, res) => {
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
      },
    );

    // for updating booking data
    app.patch(
      "/api/bookings/:id",
      verifyToken,
      verifyRole("user", "vendor", "admin"),
      async (req, res) => {
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
      },
    );

    // for saving transaction
    app.post(
      "/api/transections",
      verifyToken,
      verifyRole("user"),
      async (req, res) => {
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
      },
    );

    // for getting transection data
    app.get(
      "/api/transections",
      verifyToken,
      verifyRole("vendor", "admin", "user"),
      async (req, res) => {
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
      },
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
