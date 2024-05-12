const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.q9eobgc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        const foodCollection = client.db('FusionDineDB').collection('foods');
        const purchaseFoodCollection = client.db('FusionDineDB').collection('purchaseFoods');
        const foodReviewsCollection = client.db('FusionDineDB').collection('reviews');

        app.get('/allFoods', async (req, res) => {
            const result = await foodCollection.find().toArray()
            res.send(result)
        })
        app.get('/foods', async (req, res) => {
            const query = { 'add_by.name': 'Owner' };
            const result = await foodCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/food/:name', async (req, res) => {
            const name = req.params.name;
            const query = { food_name: name };
            const result = await foodCollection.findOne(query)
            res.send(result)
        })
        app.get('/myFoods/:email', async (req, res) => {
            const email = req.params.email;
            const query = { 'add_by.email': email };
            const result = await foodCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/purchaseFoods/:email', async (req, res) => {
            const email = req.params.email;
            console.log(email);
            const query = { buyerEmail: email };
            const result = await purchaseFoodCollection.find(query).toArray()
            console.log(result);
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
        app.put('/updatedFood/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
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
        app.post('/foodReviews', async (req, res) => {
            const review = req.body;
            const result = await foodReviewsCollection.insertOne(review)
            res.send(result)
        })

        app.post('/food', async (req, res) => {
            const food = req.body;
            console.log(food);
            const result = await foodCollection.insertOne(food)
            res.send(result)
        })

        app.post('/purchaseFood', async (req, res) => {
            const food = req.body;
            console.log(food);
            const result = await purchaseFoodCollection.insertOne(food)
            res.send(result)
        })
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
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})