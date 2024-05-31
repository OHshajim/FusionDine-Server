const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require("cookie-parser")
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

// middleware 
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5172",
        "https://a11-b9.web.app",
        "https://a11-b9.firebaseapp.com",
    ], credentials: true,
}));
app.use(express.json())
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.q9eobgc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// custom middleware 
const verifyToken = (req, res, next) => {
    const token = req?.cookies.token;
    if (!token) {
        return res.status(401).send({ message: "Unauthorized access" })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized access" })
        }
        req.user = decoded
        next()
    })
}
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)

        const foodCollection = client.db('FusionDineDB').collection('foods');
        const purchaseFoodCollection = client.db('FusionDineDB').collection('purchaseFoods');
        const foodReviewsCollection = client.db('FusionDineDB').collection('reviews');
        const UsersCollection = client.db('FusionDineDB').collection('users');

        app.get('/allFoods', async (req, res) => {
            const result = await foodCollection.find().toArray()
            res.send(result)
        })
        app.get('/foods', async (req, res) => {
            const result = await foodCollection.find({}).sort({ purchase_number: -1 }).limit(6).toArray()
            res.send(result)
        })
        app.get('/food', async (req, res) => {
            const name = req.query;
            const query = { food_name: { $regex: name.search, $options:'i' } }
            const result = await foodCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/singleFood/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await foodCollection.findOne(query)
            res.send(result)
        })



        app.get('/foodReviews', async (req, res) => {
            const result = await foodReviewsCollection.find().toArray()
            res.send(result)
        })

        // update data 
        app.put('/updatedFood/:id', async (req, res) => {
            const id = req.params.id;
            const updatedFood = req.body;
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const foodUpdate = {
                $set: {
                    ...updatedFood
                }
            };
            const result = await foodCollection.updateOne(query, foodUpdate, options);
            res.send(result);
        })

        // Post data 
        app.post('/foodReviews', async (req, res) => {
            const review = req.body;
            const result = await foodReviewsCollection.insertOne(review)
            res.send(result)
        })

        app.post('/food', async (req, res) => {
            const food = req.body;
            const result = await foodCollection.insertOne(food)
            res.send(result)
        })

        // user data 
        app.patch('/users', async (req, res) => {
            const updatedUser = req.body;
            const query = { email: updatedUser.email }
            const updateDoc = {
                $set: {
                    name: updatedUser.name,
                    photo: updatedUser.photo
                }
            }
            const result = await UsersCollection.updateOne(query, updateDoc)
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const isExist = await UsersCollection.findOne(query);
            if (isExist) {
                return res.send({ message: 'user already exist', insertedId: null })
            }
            const result = await UsersCollection.insertOne(user);
            res.send(result)
        })

        // purchase and quantity
        app.post('/purchaseFood', async (req, res) => {
            const food = req.body;
            const result = await purchaseFoodCollection.insertOne(food)
            res.send(result)
        })
        app.put('/updateQuantity/:id', async (req, res) => {
            const food = req.body;
            const id = req.params.id
            const { availableQuantity, total } = food;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const update = {
                $set: { quantity: availableQuantity, purchase_number: total }
            }
            const result = await foodCollection.findOneAndUpdate(filter, update, options)
            res.send(result)
        })
        // Delete
        app.delete('/deleteOrder/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await purchaseFoodCollection.deleteOne(query)
            res.send(result)
        })
        app.delete('/deleteFood/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await foodCollection.deleteOne(query)
            res.send(result)
        })

        // set jwt 
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: "none"
            })
                .send({ success: true })
        })

        // jwt 
        app.get('/purchaseFoods/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            // console.log(req.user);
            if (req.user.email !== email) {
                return res.status(403).send({ message: "forbidden access" })
            }
            const query = { buyerEmail: email };

            const result = await purchaseFoodCollection.find(query).toArray()
            res.send(result)
        })


        app.get('/myFoods/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (req.user.email !== email) {
                return res.status(403).send({ message: "forbidden access" })
            }
            const query = { 'add_by.email': email };
            const result = await foodCollection.find(query).toArray()
            res.send(result)
        })


        //clearing Token
        app.post("/logout", async (req, res) => {
            const user = req.body;
            res.clearCookie("token", { maxAge: 0 })
                .send({ success: true });
        });

        // Send a ping to confirm a successful connection
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('FusionDine is running')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})