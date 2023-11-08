const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
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
app.use(cookieParser());
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

//middlewares
const logger = (req, res, next) => {
  console.log("log: info", req.method, req.url);
  next();
};

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log("token in the middleware", token);
  if (!token) {
    return res.status(401).send({ message:"unauthorized access here" });
  }
  jwt.verify(token , process.env.ACCESS_TOKEN_SECRET , (err , decoded) => {
    if(err){
      return res.status(401).send({message: 'unauthorized access'})
    }
    req.user = decoded;
    next()
  })

};

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
const requestedFoodCollection = client
  .db("foodFirstDB")
  .collection("requestedFoodCollection");

app.post("/jwt", logger, async (req, res) => {
  const user = req.body;
  console.log("user for token", user);
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });
  res
    .cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .send({ success: true });
});

app.post("/logout", async (req, res) => {
  const user = req.body;
  console.log("logging out", user);
  res.clearCookie("token", { maxAge: 0 }).send({ seccess: true });
});

app.get("/api/v1/foods", async (req, res) => {
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
      $regex: foodName,
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
app.get("/addedFood", logger, verifyToken, async (req, res) => {
  console.log('token owner info' , req.user);
  console.log(req.params.email);
if(req?.user?.email !== req?.query?.email){
  return res.status(403).send({message: 'forbidden access'})
}
  const cursor = foodCollection.find({ donatorEmail: req.params.email });
  const foods = await cursor.toArray();
  console.log(foods);
  res.send(foods);
});


app.delete('/deleteFood/:id',async(req,res) => {
  const id = req.params.id;
  console.log(id);
  const query = {_id: new ObjectId(id)}
  const result = await foodCollection.deleteOne(query)
  res.send(result)
})



// app.get("/api/v1/singleFood/:id", async (req, res) => {
//   const id = req.params.id;
//   const query = { _id: new ObjectId(id) };

//   const result = await foodCollection.findOne(query);
//   const formattedResult = result.map((food) => ({
//     ...food,
//     expiredDate: new Date(food.expiredDate).toDateString(),
//     // You can change the format as desired
//   }));
//   res.send(formattedResult);
// });

//////////////////////////
// app.get('/manage/:foodId', async(req,res) => {
//   const cursor = requestedFoodCollection.findOne({foodId:req.params.id});
//   const foods = await cursor
//   console.log(foods);
//   res.send(foods)
// })

/////////////////////////////////

app.get("/manage/:foodId", async (req, res) => {
  const requestedFoodId = req.params.foodId;  

  try {
    const cursor = requestedFoodCollection.findOne({ foodId: requestedFoodId });
    const food = await cursor;

    if (food) {
      console.log(food);
      res.send(food);
    } else {
      // Food item not found
      res.status(404).json({ error: "Food not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/requestedFood/:email", async (req, res) => {
  // if(req?.user?.email !== req?.query?.email){
  //   return res.status(403).send({message: 'forbidden access'})
  // }
  const cursor = requestedFoodCollection.find({
    requestedBy: req.params.email,
  });
  const requestedFood = await cursor.toArray();
  console.log(requestedFood);
  res.send(requestedFood);
});


app.patch("/manageStatus/:id", async (req, res) => {
  const id = req.params.id;
  console.log(id);
  //  const options = { upsert: true };
  const filter = { foodId: id };
  const updateDoc ={
    $set:{
      status:'Delivered'
    }
  }
 

  // const updateRequesterInfo = req.body;
  // const product = {
//     $set: {
//       requesterName: updateRequesterInfo.foodName,
//       foodQuantity: updateRequesterInfo.foodQuantity,
//       additionalNotes: updateRequesterInfo.additionalNotes,
//       pickupLocation: updateRequesterInfo.pickupLocation,
//       expiredDate: updateRequesterInfo.expiredDate,
//       foodImage: updateRequesterInfo.foodImage,
// requestDate:updateRequesterInfo.requestDate,

// requesterImg:updateRequesterInfo.
      
      
//       requestedBy,
//       status

//     },
  // };

  const result = await requestedFoodCollection.updateOne(filter, updateDoc);
  res.send(result);
});






app.delete("/requestedFoods/:id", async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const query = { _id: new ObjectId(id) };
  const result = await requestedFoodCollection.deleteOne(query);
  res.send(result);
});

app.put("/manage/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const options = { upsert: true };

  const updatedFood = req.body;
  const product = {
    $set: {
      foodName: updatedFood.foodName,
      foodQuantity: updatedFood.foodQuantity,
      additionalNotes: updatedFood.additionalNotes,
      pickupLocation: updatedFood.pickupLocation,
      expiredDate: updatedFood.expiredDate,
      foodImage: updatedFood.foodImage,
    },
  };

  const result = await foodCollection.updateOne(filter, product, options);
  res.send(result);
});

app.get("/api/v1/singleFood/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };

  const result = await foodCollection.findOne(query);

  // Check if the result exists
  if (result) {
    result.expiredDate = new Date(result.expiredDate).toDateString();
    res.send(result);
  } else {
    res.status(404).json({ message: "Food not found" });
  }
});

app.get("/updateFood/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await foodCollection.findOne(query);
  // Check if the result exists
  if (result) {
    result.expiredDate = new Date(result.expiredDate).toDateString();
    res.send(result);
  } else {
    res.status(404).json({ message: "Food not found" });
  }
});

app.put("/update/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const options = { upsert: true };

  const updatedFood = req.body;
  const product = {
    $set: {
      foodName: updatedFood.foodName,
      foodQuantity: updatedFood.foodQuantity,
      additionalNotes: updatedFood.additionalNotes,
      pickupLocation: updatedFood.pickupLocation,
      expiredDate: updatedFood.expiredDate,
      foodImage: updatedFood.foodImage,
    },
  };

  const result = await foodCollection.updateOne(filter, product, options);
  res.send(result);
});

app.delete("/deleteFood/:id", async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const query = { _id: new ObjectId(id) };
  const result = await foodCollection.deleteOne(query);
  res.send(result);
});

app.post("/request", async (req, res) => {
  const requestedFood = req.body;
  const result = await requestedFoodCollection.insertOne(requestedFood);
  res.send(result);
});

app.post("/addFood", async (req, res) => {
  const addedFood = req.body;
  console.log(addedFood);
  const result = await foodCollection.insertOne(addedFood);
  res.send(result);
});

app.get("/", (req, res) => {
  res.send("foodFirst server is running");
});

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
});
