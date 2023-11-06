const express = require("express");
const cors = require("cors");
const app = express();

require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      //   "https://cars-doctor-c328b.web.app" ,
      //   "https://cars-doctor-c328b.firebaseapp.com"
    ],
    credentials: true,
  })
);
app.use(express.json());

console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sarjove.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

const foodCollection = client.db("foodFirstDB").collection("foodCollection");
const requestedFoodCollection = client.db("foodFirstDB").collection("requestedFoodCollection")
app.get("/api/v1/foods", async(req,res) => {
  let sortObj = {};
  const sortField = req.query.sortField;
  const sortOrder = req.query.sortOrder;

  //pagination
  const page = Number(req.query.page);
  const limit = Number(req.query.limit);
  // const skip = (page - 1)*limit

  let queryObj = {};
  const foodName = req.query.foodName;

  if (foodName) {
    queryObj.foodName = {
      $regex:foodName ,
      $options: "i", // for case-insensitive search
    };
  }

  if (sortField && sortOrder) {
    sortObj[sortField] = sortOrder;
  }
  
  const result = await foodCollection
    .find(queryObj)
    .sort(sortObj)
    .limit(limit)
    .toArray();
  const formattedResult = result.map((food) => ({
    ...food,
    expiredDate: new Date(food.expiredDate).toDateString(),
    // You can change the format as desired
  }));

  res.send(formattedResult);
});
//   res.send(result);
// });
app.get('/addedFood/:email', async(req,res) => {
  const cursor = foodCollection.find({donatorEmail:req.params.email});
  const foods = await cursor.toArray();
  console.log(foods);
  res.send(foods)
})

app.get("/api/v1/singleFood/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  
  const result = await foodCollection.findOne(query);
  res.send(result);
});

app.post('/request' , async(req,res) =>{
  const requestedFood =req.body
  const result = await requestedFoodCollection.insertOne(requestedFood)
  res.send(result) 
})

app.post('/addFood' ,async(req,res) => {
  const addedFood = req.body;
  console.log(addedFood);
  const result = await foodCollection.insertOne(addedFood)
  res.send(result)
})


app.get("/", (req, res) => {
  res.send("foodFirst server is running");
});

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
});
